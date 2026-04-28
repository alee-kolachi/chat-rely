from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_user, get_db
from app.domains.agents.schemas import (
    AgentCreateRequest,
    AgentDTO,
    AgentListResponse,
    AgentUpdateRequest,
)
from app.domains.agents.service import create_agent, list_agents, update_agent

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("", response_model=AgentDTO)
async def create_agent_route(
    payload: AgentCreateRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentDTO:
    return await create_agent(db, user.user_id, payload)


@router.get("", response_model=AgentListResponse)
async def list_agents_route(
    include_archived: bool = Query(default=False),
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentListResponse:
    agents = await list_agents(db, user.user_id, include_archived=include_archived)
    return AgentListResponse(agents=agents)


@router.patch("/{agent_id}", response_model=AgentDTO)
async def update_agent_route(
    agent_id: UUID,
    payload: AgentUpdateRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentDTO:
    return await update_agent(db, user.user_id, agent_id, payload)

