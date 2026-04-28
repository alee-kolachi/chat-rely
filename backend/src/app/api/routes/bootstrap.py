from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, get_current_user, get_db
from app.domains.bootstrap.schemas import BootstrapResponse, MeContextResponse
from app.domains.bootstrap.service import bootstrap_me, fetch_me_context

router = APIRouter(tags=["bootstrap"])


@router.post("/bootstrap/me", response_model=BootstrapResponse)
async def bootstrap_me_route(
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BootstrapResponse:
    return await bootstrap_me(db, user.user_id)


@router.get("/me/context", response_model=MeContextResponse)
async def me_context_route(
    user: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MeContextResponse:
    return await fetch_me_context(db, user.user_id)

