from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_user, get_db
from app.domains.agents.reliability_schemas import (
    AgentReliabilityDTO,
    AgentReliabilityUpdateRequest,
)
from app.domains.agents.reliability_service import get_reliability, update_reliability
from app.domains.agents.schemas import (
    AgentCreateRequest,
    AgentDTO,
    AgentListResponse,
    AgentUpdateRequest,
)
from app.domains.agents.service import create_agent, list_agents, update_agent
from app.domains.analytics.schemas import AgentAnalyticsResponse
from app.domains.analytics.service import build_agent_analytics
from app.domains.dashboard.schemas import AgentDashboardResponse
from app.domains.dashboard.service import build_agent_dashboard

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


@router.get("/{agent_id}/dashboard", response_model=AgentDashboardResponse)
async def get_agent_dashboard_route(
    agent_id: UUID,
    range_key: str | None = Query(
        default=None,
        description="7d, 30d, 90d, 365d (ignored if from/to set)",
    ),
    range_from: datetime | None = Query(default=None, alias="from"),
    range_to: datetime | None = Query(default=None, alias="to"),
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentDashboardResponse:
    return await build_agent_dashboard(
        db,
        user_id=user.user_id,
        agent_id=agent_id,
        range_key=range_key,
        range_from=range_from,
        range_to=range_to,
        tick_lifecycle=False,
    )


@router.get("/{agent_id}/reliability", response_model=AgentReliabilityDTO)
async def get_agent_reliability_route(
    agent_id: UUID,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentReliabilityDTO:
    return await get_reliability(db, user.user_id, agent_id)


@router.patch("/{agent_id}/reliability", response_model=AgentReliabilityDTO)
async def update_agent_reliability_route(
    agent_id: UUID,
    payload: AgentReliabilityUpdateRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentReliabilityDTO:
    return await update_reliability(db, user.user_id, agent_id, payload)


@router.get("/{agent_id}/analytics", response_model=AgentAnalyticsResponse)
async def get_agent_analytics_route(
    agent_id: UUID,
    range_key: str | None = Query(
        default=None,
        description="7d, 30d, 90d, 365d (ignored if from/to set)",
    ),
    range_from: datetime | None = Query(default=None, alias="from"),
    range_to: datetime | None = Query(default=None, alias="to"),
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentAnalyticsResponse:
    return await build_agent_analytics(
        db,
        user_id=user.user_id,
        agent_id=agent_id,
        range_key=range_key,
        range_from=range_from,
        range_to=range_to,
        tick_lifecycle=False,
    )

