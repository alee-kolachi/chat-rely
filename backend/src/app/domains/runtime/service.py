from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.core.settings import get_settings
from app.domains.conversations.schemas import ConversationMessageCreateRequest
from app.domains.conversations.service import append_message
from app.domains.knowledge.service import _embed_texts
from app.domains.runtime.prompts import build_grounded_user_prompt, build_system_prompt
from app.domains.runtime.schemas import RuntimeChatRequest, RuntimeChatResponse


async def _load_agent_runtime_config(db: AsyncSession, user_id: UUID, agent_id: UUID) -> dict[str, Any]:
    result = await db.execute(
        text(
            """
            select
              a.id, a.name, a.model, a.system_prompt, a.behavior_settings,
              rs.min_retrieval_similarity, rs.fallback_message
            from public.agents a
            left join public.agent_reliability_settings rs on rs.agent_id = a.id and rs.user_id = a.user_id
            where a.id = :agent_id and a.user_id = :user_id
            """
        ),
        {"agent_id": str(agent_id), "user_id": str(user_id)},
    )
    row = result.mappings().first()
    if row is None:
        raise AppError(code="agent.not_found", message="Agent not found", status_code=404)
    behavior = row["behavior_settings"] or {}
    tone = behavior.get("tone", "professional")
    fallback = row["fallback_message"] or (
        f"Hello! I'm {row['name']}. I can use your website knowledge, but I am not fully sure yet. "
        "Please clarify your request."
    )
    return {
        "agent_name": row["name"],
        "model": row["model"] or "gpt-4o-mini",
        "system_prompt": row["system_prompt"] or "",
        "tone": tone,
        "min_retrieval_similarity": float(row["min_retrieval_similarity"] or 0.72),
        "fallback_message": fallback,
    }


async def _resolve_or_create_conversation(
    db: AsyncSession, user_id: UUID, agent_id: UUID, visitor_id: str, conversation_id: UUID | None
) -> UUID:
    if conversation_id:
        result = await db.execute(
            text(
                """
                select id
                from public.conversations
                where id = :conversation_id and user_id = :user_id and agent_id = :agent_id
                """
            ),
            {"conversation_id": str(conversation_id), "user_id": str(user_id), "agent_id": str(agent_id)},
        )
        row = result.mappings().first()
        if row is None:
            raise AppError(code="conversation.not_found", message="Conversation not found", status_code=404)
        return UUID(str(row["id"]))

    result = await db.execute(
        text(
            """
            select id
            from public.conversations
            where user_id = :user_id and agent_id = :agent_id and visitor_id = :visitor_id and status = 'open'
            order by created_at desc
            limit 1
            """
        ),
        {"user_id": str(user_id), "agent_id": str(agent_id), "visitor_id": visitor_id},
    )
    existing = result.mappings().first()
    if existing:
        return UUID(str(existing["id"]))

    created = await db.execute(
        text(
            """
            insert into public.conversations (agent_id, user_id, visitor_id, channel, status)
            values (:agent_id, :user_id, :visitor_id, 'api', 'open')
            returning id
            """
        ),
        {"agent_id": str(agent_id), "user_id": str(user_id), "visitor_id": visitor_id},
    )
    return UUID(str(created.mappings().one()["id"]))


async def _retrieve_context(
    db: AsyncSession, agent_id: UUID, user_message: str, min_similarity: float
) -> list[dict[str, Any]]:
    embeddings = await _embed_texts([user_message])
    embedding = embeddings[0]
    result = await db.execute(
        text(
            """
            select id, knowledge_source_id, content, metadata, similarity
            from public.match_knowledge_chunks(
              :agent_id,
              CAST(:embedding AS vector),
              :match_count,
              :min_score
            )
            """
        ),
        {
            "agent_id": str(agent_id),
            "embedding": "[" + ",".join(f"{v:.10f}" for v in embedding) + "]",
            "match_count": 8,
            "min_score": min_similarity,
        },
    )
    return [dict(row) for row in result.mappings().all()]


async def _generate_grounded_answer(
    *,
    user_message: str,
    context_chunks: list[dict[str, Any]],
    model: str,
    system_prompt: str,
    fallback_message: str,
) -> tuple[str, bool]:
    if not context_chunks:
        return fallback_message, True

    settings = get_settings()
    if not settings.openai_api_key:
        raise AppError(code="runtime.llm_not_configured", message="OPENAI_API_KEY is required for runtime chat", status_code=500)

    context_block = "\n\n".join(
        f"[Chunk {idx + 1}] {chunk['content']}" for idx, chunk in enumerate(context_chunks[:6])
    )
    system_content = build_system_prompt(system_prompt)
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": model,
                "temperature": 0,
                "messages": [
                    {"role": "system", "content": system_content},
                    {
                        "role": "user",
                        "content": build_grounded_user_prompt(context_block, fallback_message, user_message),
                    },
                ],
            },
        )
        if response.status_code >= 400:
            raise AppError(
                code="runtime.llm_failed",
                message="LLM request failed",
                status_code=502,
                details={"status_code": response.status_code, "body": response.text[:500]},
            )

    payload = response.json()
    content = payload["choices"][0]["message"]["content"].strip()
    if not content:
        return fallback_message, True
    return content, False


async def run_chat(db: AsyncSession, user_id: UUID, payload: RuntimeChatRequest) -> RuntimeChatResponse:
    config = await _load_agent_runtime_config(db, user_id, payload.agent_id)
    model = payload.model_override or config["model"]
    system_prompt = payload.system_prompt_override or config["system_prompt"]
    if config["tone"]:
        system_prompt = f"{system_prompt}\n\nPreferred response tone: {config['tone']}.".strip()
    min_similarity = float(config["min_retrieval_similarity"])
    fallback_message = str(config["fallback_message"])

    conversation_id = await _resolve_or_create_conversation(
        db,
        user_id=user_id,
        agent_id=payload.agent_id,
        visitor_id=payload.visitor_id,
        conversation_id=payload.conversation_id,
    )

    await append_message(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        payload=ConversationMessageCreateRequest(role="user", content=payload.message, model=model),
    )

    chunks = await _retrieve_context(db, payload.agent_id, payload.message, min_similarity=min_similarity)
    answer, fallback_used = await _generate_grounded_answer(
        user_message=payload.message,
        context_chunks=chunks,
        model=model,
        system_prompt=system_prompt,
        fallback_message=fallback_message,
    )

    assistant_message = await append_message(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        payload=ConversationMessageCreateRequest(
            role="assistant",
            content=answer,
            model=model,
            metadata={"fallback_used": fallback_used, "retrieval_count": len(chunks)},
        ),
    )

    preview = [
        {
            "knowledge_source_id": str(chunk["knowledge_source_id"]),
            "similarity": float(chunk["similarity"]),
            "snippet": str(chunk["content"])[:180],
        }
        for chunk in chunks[:3]
    ]

    return RuntimeChatResponse(
        conversation_id=conversation_id,
        assistant_message_id=assistant_message.id,
        response=answer,
        model=model,
        fallback_used=fallback_used,
        retrieval_count=len(chunks),
        min_similarity=min_similarity,
        created_at=datetime.now(tz=UTC),
        retrieval_preview=preview,
    )

