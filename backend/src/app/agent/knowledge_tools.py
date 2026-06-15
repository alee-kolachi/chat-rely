"""Knowledge-base search tool for the chat agent (on-demand RAG)."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

from app.db.session import get_session_factory
from app.domains.runtime.service import (
    RAG_PROMPT_CHUNK_COUNT,
    _build_context_block,
    _build_retrieval_expanded_query,
    _retrieve_merged_chunks_for_message,
)

SEARCH_KNOWLEDGE_BASE_TOOL_NAME = "search_knowledge_base"

_SEARCH_KB_TOOL_DESCRIPTION = (
    "Search the brand's indexed knowledge base for policies, FAQs, return rules, "
    "shipping information, promotions, purchase perks, gifts, bonuses, and other static site copy. "
    "Use this for policy, FAQ, and promotion questions — not for live catalog, product availability, "
    "pricing, stock levels, or order status (use Shopify tools for those). "
    "When the customer asks what they get with a purchase (offers, freebies, gifts, deals), "
    "search here — not the product catalog. "
    "Do not call for greetings, thanks, or chitchat. "
    "Call this before declining on a policy or promotion topic. "
    "If results are empty or do not directly answer the question, decline politely — do not invent."
)

_SEARCH_KB_QUERY_DESCRIPTION = (
    "The customer's question or a short paraphrase with the topic keywords "
    "(e.g. `purchase promotion`, `free gift with order`, `return policy`). "
    "Include purchase/promotion/gift terms when they ask what comes with buying. "
    "Use for policies, FAQs, returns, shipping, promotions, and static brand content. "
    "Do not use for live catalog, product listings, pricing, stock, or order data."
)

KNOWLEDGE_TOOL_STATUS = "Searching our site and help content…"
KNOWLEDGE_TOOL_PREAMBLE = "Let me check our policies and site info."


def is_knowledge_tool_name(name: str) -> bool:
    return (name or "").strip() == SEARCH_KNOWLEDGE_BASE_TOOL_NAME


class SearchKnowledgeBaseInput(BaseModel):
    query: str = Field(
        min_length=1,
        max_length=500,
        description=_SEARCH_KB_QUERY_DESCRIPTION,
    )


def build_search_knowledge_base_tool(
    *,
    agent_id: UUID,
    min_similarity: float,
) -> StructuredTool:
    """LangChain tool: vector search over indexed knowledge for this agent."""

    async def _search_knowledge_base(query: str) -> str:
        q = (query or "").strip()
        if not q:
            return json.dumps({"excerpts": "", "chunk_count": 0})

        expanded_query = _build_retrieval_expanded_query(q)

        async with get_session_factory()() as db:
            chunks, _billing = await _retrieve_merged_chunks_for_message(
                db,
                agent_id,
                user_message=q,
                expanded_query=expanded_query,
                min_similarity=min_similarity,
                match_count=10,
            )
        block = _build_context_block(chunks[:RAG_PROMPT_CHUNK_COUNT], user_message=q)
        rag_mode = str(_billing.get("rag_fallback_mode") or "")
        weak = rag_mode in ("lexical_grounded_below_threshold", "lexical_supplement")
        return json.dumps(
            {
                "excerpts": block,
                "chunk_count": len(chunks),
                "relevance": (
                    "weak_match"
                    if weak
                    else ("no_match" if not block else "ok")
                ),
                "instruction": (
                    "Excerpts are empty or not directly relevant. "
                    "Do not invent an answer — decline politely in the brand voice."
                    if not block or weak
                    else "Use excerpts only if they directly answer the query."
                ),
            }
        )

    return StructuredTool.from_function(
        coroutine=_search_knowledge_base,
        name=SEARCH_KNOWLEDGE_BASE_TOOL_NAME,
        description=_SEARCH_KB_TOOL_DESCRIPTION,
        args_schema=SearchKnowledgeBaseInput,
    )


def knowledge_tool_status_message(tool_name: str) -> str:
    _ = tool_name
    return KNOWLEDGE_TOOL_STATUS


def knowledge_tool_preamble_message(tool_name: str) -> str:
    _ = tool_name
    return KNOWLEDGE_TOOL_PREAMBLE
