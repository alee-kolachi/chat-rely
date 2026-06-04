"""LangChain tools exposed to the chat agent."""

from __future__ import annotations

from langchain_core.tools import StructuredTool
from pydantic import BaseModel, Field

ESCALATE_TO_HUMAN_TOOL_NAME = "escalate_to_human"


class EscalateToHumanInput(BaseModel):
    reason: str = Field(
        min_length=1,
        max_length=500,
        description=(
            "Brief reason for handing off to the human team. "
            "Be specific: include the customer's issue and what was already attempted."
        ),
    )


def build_escalate_to_human_tool() -> StructuredTool:
    """Schema-only tool; execution happens in the LangGraph tools node."""

    def _escalate_to_human(reason: str) -> str:
        _ = reason
        return "Escalation requested."

    return StructuredTool.from_function(
        func=_escalate_to_human,
        name=ESCALATE_TO_HUMAN_TOOL_NAME,
        description=(
            "Hand off this conversation to a human team member. "
            "Use when the visitor explicitly asks to speak with a person, "
            "when you have been unable to resolve their issue after a genuine attempt, "
            "or when the situation requires human judgment. "
            "Do not use this as a first resort for questions you can answer."
        ),
        args_schema=EscalateToHumanInput,
    )
