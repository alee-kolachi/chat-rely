from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_user, get_db
from app.domains.actions.schemas import (
    ActionCatalogEntry,
    ActionCatalogResponse,
    AgentActionPatchRequest,
)
from app.domains.actions.service import build_catalog, patch_agent_action

router = APIRouter(prefix="/agents", tags=["agent-actions"])


@router.get("/{agent_id}/actions/catalog", response_model=ActionCatalogResponse)
async def get_action_catalog(
    agent_id: UUID,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ActionCatalogResponse:
    entries = await build_catalog(db, user_id=user.user_id, agent_id=agent_id)
    return ActionCatalogResponse(entries=entries)


@router.patch("/{agent_id}/actions/{action_key:path}", response_model=ActionCatalogEntry)
async def patch_action(
    agent_id: UUID,
    action_key: str,
    payload: AgentActionPatchRequest,
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ActionCatalogEntry:
    return await patch_agent_action(
        db, user_id=user.user_id, agent_id=agent_id, action_key=action_key, payload=payload
    )
