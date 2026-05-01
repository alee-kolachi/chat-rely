"""
Runtime chat: RAG retrieval here, **LangGraph** (`chat_graph`) for each model turn.

Conversation memory is loaded from Postgres; extend the graph with tool nodes
for agentic actions (Shopify, policies) per `supabase/RULES.md`.
"""

from datetime import UTC, datetime
import re
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import AppError
from app.domains.conversations.schemas import ConversationMessageCreateRequest
from app.domains.conversations.service import append_message, list_messages
from app.domains.knowledge.service import _embed_texts
from app.domains.runtime.chat_graph import (
    build_retrieval_query_for_embedding,
    build_turn_messages,
    invoke_runtime_chat_graph,
    slice_history_for_current_turn,
)
from app.domains.runtime.prompts import build_grounded_user_prompt, build_system_prompt
from app.domains.runtime.schemas import RuntimeChatRequest, RuntimeChatResponse

# Cosine similarity (1 - distance) from `match_knowledge_chunks`. Nav/listing-heavy
# pages often score ~0.45–0.55 vs natural questions; 0.72 filters everything out.
RAG_RELAX_MIN_SIMILARITY = 0.43
# After threshold passes, keep at most this many merged candidates; the model sees top N only.
RAG_MERGED_CHUNK_CAP = 20
RAG_PROMPT_CHUNK_COUNT = 8
RAG_ANN_CANDIDATE_POOL = 60
RAG_LEXICAL_CANDIDATE_POOL = 40


def _resolve_runtime_model(model: str) -> str:
    # Keep backward compatibility with legacy/open-ended model labels.
    normalized = (model or "").strip().lower()
    legacy_aliases = {"gpt-3.5", "gpt-3.5-turbo", "gpt35", "gpt-35"}
    if normalized in legacy_aliases:
        return "gpt-4o-mini"
    return model


def _build_open_chat_system_prompt(system_prompt: str) -> str:
    base = (system_prompt or "").strip()
    guidance = (
        "You are a customer-support chatbot for this brand. No indexed excerpts were retrieved for this question, "
        "so do not invent catalog details, prices, or policies. "
        "Respond helpfully to greetings and small talk; for product or policy questions, keep answers short, "
        "acknowledge you don’t have their knowledge base context for this turn, and suggest what the customer could "
        "ask next or where on the site they might look (without making up URLs). "
        "Use earlier messages in this thread for follow-ups when the user refers to something already discussed."
    )
    return f"{base}\n\n{guidance}".strip() if base else guidance


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
        "min_retrieval_similarity": float(row["min_retrieval_similarity"] or 0.52),
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


def _embedding_vector_param(embedding: list[float]) -> str:
    return "[" + ",".join(f"{v:.10f}" for v in embedding) + "]"


async def _match_top_chunks_ann(
    db: AsyncSession,
    agent_id: UUID,
    embedding: list[float],
    *,
    limit: int,
) -> list[dict[str, Any]]:
    """Nearest chunks by cosine distance, no similarity floor (last resort when RPC returns nothing)."""
    result = await db.execute(
        text(
            """
            select
              c.id,
              c.knowledge_source_id,
              c.content,
              c.metadata,
              (1 - (c.embedding <=> cast(:embedding as vector)))::double precision as similarity
            from public.knowledge_chunks c
            where c.agent_id = cast(:agent_id as uuid)
            order by c.embedding <=> cast(:embedding as vector)
            limit :limit
            """
        ),
        {
            "agent_id": str(agent_id),
            "embedding": _embedding_vector_param(embedding),
            "limit": limit,
        },
    )
    return [dict(row) for row in result.mappings().all()]


async def _match_chunks_with_embedding(
    db: AsyncSession,
    agent_id: UUID,
    embedding: list[float],
    min_similarity: float,
    *,
    match_count: int = 8,
) -> list[dict[str, Any]]:
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
            "embedding": _embedding_vector_param(embedding),
            "match_count": match_count,
            "min_score": min_similarity,
        },
    )
    return [dict(row) for row in result.mappings().all()]


async def _match_chunks_lexical(
    db: AsyncSession,
    agent_id: UUID,
    query_text: str,
    *,
    limit: int,
) -> list[dict[str, Any]]:
    q = (query_text or "").strip()
    if not q:
        return []
    result = await db.execute(
        text(
            """
            select
              c.id,
              c.knowledge_source_id,
              c.content,
              c.metadata,
              ts_rank_cd(
                to_tsvector('simple', coalesce(c.content, '')),
                websearch_to_tsquery('simple', :query_text)
              )::double precision as lexical_score
            from public.knowledge_chunks c
            where c.agent_id = cast(:agent_id as uuid)
              and to_tsvector('simple', coalesce(c.content, '')) @@ websearch_to_tsquery('simple', :query_text)
            order by lexical_score desc
            limit :limit
            """
        ),
        {"agent_id": str(agent_id), "query_text": q, "limit": limit},
    )
    rows = [dict(r) for r in result.mappings().all()]
    for row in rows:
        row["similarity"] = float(row.get("similarity") or 0.0)
    return rows


async def _retrieve_context(
    db: AsyncSession,
    agent_id: UUID,
    query_text: str,
    min_similarity: float,
    *,
    match_count: int = 8,
) -> list[dict[str, Any]]:
    text_q = (query_text or "").strip()
    if not text_q:
        return []
    embeddings = await _embed_texts([text_q])
    return await _match_chunks_with_embedding(
        db, agent_id, embeddings[0], min_similarity, match_count=match_count
    )


async def _retrieve_merged_chunks_for_message(
    db: AsyncSession,
    agent_id: UUID,
    *,
    user_message: str,
    expanded_query: str,
    min_similarity: float,
    match_count: int = 10,
) -> list[dict[str, Any]]:
    """
    Embed each distinct query string once, match at `min_similarity`, merge.
    If nothing passes the threshold (common for nav-heavy crawls vs. 0.72),
    retry the same vectors at RAG_RELAX_MIN_SIMILARITY without extra embedding calls.
    If still empty, take the top K nearest chunks by ANN (same vectors) so the assistant
    always gets excerpts when the index has any data for this agent.
    """
    msg = (user_message or "").strip()
    if not msg:
        return []
    raw_embedding = (await _embed_texts([msg]))[0]
    expanded_embedding: list[float] | None = None
    exp = (expanded_query or "").strip()
    if exp and exp != msg:
        expanded_embedding = (await _embed_texts([exp]))[0]

    async def merged_at(floor: float) -> list[dict[str, Any]]:
        parts = [await _match_chunks_with_embedding(db, agent_id, raw_embedding, floor, match_count=match_count)]
        if expanded_embedding is not None:
            parts.append(
                await _match_chunks_with_embedding(
                    db, agent_id, expanded_embedding, floor, match_count=match_count
                )
            )
        return _merge_chunks_by_best_similarity(parts)[:RAG_MERGED_CHUNK_CAP]

    merged = await merged_at(min_similarity)
    if not merged and min_similarity > RAG_RELAX_MIN_SIMILARITY:
        merged = await merged_at(RAG_RELAX_MIN_SIMILARITY)
    ann_candidates: list[list[dict[str, Any]]] = [
        await _match_top_chunks_ann(
            db, agent_id, raw_embedding, limit=max(RAG_ANN_CANDIDATE_POOL, match_count)
        )
    ]
    if expanded_embedding is not None:
        ann_candidates.append(
            await _match_top_chunks_ann(
                db, agent_id, expanded_embedding, limit=max(RAG_ANN_CANDIDATE_POOL, match_count)
            )
        )
    lexical_candidates: list[list[dict[str, Any]]] = [
        await _match_chunks_lexical(db, agent_id, msg, limit=RAG_LEXICAL_CANDIDATE_POOL)
    ]
    if exp and exp != msg:
        lexical_candidates.append(
            await _match_chunks_lexical(db, agent_id, exp, limit=RAG_LEXICAL_CANDIDATE_POOL)
        )
    merged = _merge_chunks_by_best_similarity([merged, *ann_candidates, *lexical_candidates])
    reranked = _rerank_chunks_for_query(merged, msg)
    return reranked[:RAG_MERGED_CHUNK_CAP]


def _merge_chunks_by_best_similarity(chunks_lists: list[list[dict[str, Any]]]) -> list[dict[str, Any]]:
    """Union several retrieval lists, keeping the strongest similarity per chunk id."""
    by_id: dict[Any, dict[str, Any]] = {}
    for lst in chunks_lists:
        for row in lst:
            cid = row.get("id")
            if cid is None:
                continue
            prev = by_id.get(cid)
            if prev is None or float(row.get("similarity") or 0) > float(prev.get("similarity") or 0):
                by_id[cid] = row
    return sorted(by_id.values(), key=lambda r: float(r.get("similarity") or 0), reverse=True)


def _extract_query_terms(query_text: str) -> set[str]:
    return {t for t in re.findall(r"[a-zA-Z0-9]{4,}", (query_text or "").casefold())}


def _rerank_chunks_for_query(chunks: list[dict[str, Any]], query_text: str) -> list[dict[str, Any]]:
    if not chunks:
        return chunks
    query_terms = _extract_query_terms(query_text)
    if not query_terms:
        return sorted(chunks, key=lambda r: float(r.get("similarity") or 0.0), reverse=True)

    def score(row: dict[str, Any]) -> tuple[float, float]:
        sim = float(row.get("similarity") or 0.0)
        lex = float(row.get("lexical_score") or 0.0)
        text = str(row.get("content") or "").casefold()
        coverage = sum(1 for term in query_terms if term in text) / max(1, len(query_terms))
        return (sim + (coverage * 0.20) + (lex * 0.25), sim)

    return sorted(chunks, key=score, reverse=True)


def _looks_like_fallback_response(answer: str, fallback_message: str) -> bool:
    a = (answer or "").strip().casefold()
    f = (fallback_message or "").strip().casefold()
    if not a:
        return True
    if f and a == f:
        return True
    return "not fully sure based on available information" in a


async def run_chat(db: AsyncSession, user_id: UUID, payload: RuntimeChatRequest) -> RuntimeChatResponse:
    config = await _load_agent_runtime_config(db, user_id, payload.agent_id)
    model = _resolve_runtime_model(payload.model_override or config["model"])
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

    history_rows = await list_messages(db, user_id, conversation_id)
    history = slice_history_for_current_turn(history_rows, current_user_content=payload.message)

    expanded_query = build_retrieval_query_for_embedding(history, payload.message)
    chunks = await _retrieve_merged_chunks_for_message(
        db,
        payload.agent_id,
        user_message=payload.message,
        expanded_query=expanded_query,
        min_similarity=min_similarity,
        match_count=10,
    )
    prompt_chunks = chunks[:RAG_PROMPT_CHUNK_COUNT]

    has_context = bool(prompt_chunks)
    system_content = _build_open_chat_system_prompt(system_prompt)
    grounded_user = payload.message
    if has_context:
        system_content = build_system_prompt(system_prompt)
        context_block = "\n\n".join(
            f"[Excerpt {idx + 1}]\n{chunk['content']}" for idx, chunk in enumerate(prompt_chunks)
        )
        grounded_user = build_grounded_user_prompt(context_block, fallback_message, payload.message)
    lc_messages = build_turn_messages(
        system_content=system_content,
        history_without_current_user=history,
        grounded_user_content=grounded_user,
    )
    answer, fallback_used = await invoke_runtime_chat_graph(
        messages=lc_messages,
        model=model,
        fallback_message=fallback_message,
        thread_id=str(conversation_id),
    )
    if has_context and _looks_like_fallback_response(answer, fallback_message):
        retry_user = (
            f"{grounded_user}\n\n"
            "Important: Retrieved excerpts are available above. "
            "Answer strictly from those excerpts and cite concrete facts present in them. "
            "Only use fallback if there is truly no relevant fact."
        )
        retry_messages = build_turn_messages(
            system_content=system_content,
            history_without_current_user=history,
            grounded_user_content=retry_user,
        )
        retry_answer, retry_fallback_used = await invoke_runtime_chat_graph(
            messages=retry_messages,
            model=model,
            fallback_message=fallback_message,
            thread_id=str(conversation_id),
        )
        if not _looks_like_fallback_response(retry_answer, fallback_message):
            answer, fallback_used = retry_answer, retry_fallback_used

    assistant_message = await append_message(
        db,
        user_id=user_id,
        conversation_id=conversation_id,
        payload=ConversationMessageCreateRequest(
            role="assistant",
            content=answer,
            model=model,
            metadata={
                "fallback_used": fallback_used,
                "retrieval_count": len(chunks),
                "prompt_chunk_count": len(prompt_chunks),
            },
        ),
    )

    preview = [
        {
            "knowledge_source_id": str(chunk["knowledge_source_id"]),
            "similarity": float(chunk["similarity"]),
            "snippet": str(chunk["content"])[:180],
        }
        for chunk in prompt_chunks[:5]
    ]

    return RuntimeChatResponse(
        conversation_id=conversation_id,
        assistant_message_id=assistant_message.id,
        response=answer,
        model=model,
        fallback_used=fallback_used,
        retrieval_count=len(prompt_chunks),
        min_similarity=min_similarity,
        created_at=datetime.now(tz=UTC),
        retrieval_preview=preview,
    )

