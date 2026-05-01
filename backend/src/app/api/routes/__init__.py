from fastapi import APIRouter

from app.api.routes.agents import router as agents_router
from app.api.routes.bootstrap import router as bootstrap_router
from app.api.routes.conversations import router as conversations_router
from app.api.routes.health import router as health_router
from app.api.routes.knowledge import router as knowledge_router
from app.api.routes.knowledge_files import router as knowledge_files_router
from app.api.routes.knowledge_qa import router as knowledge_qa_router
from app.api.routes.knowledge_snippets import router as knowledge_snippets_router
from app.api.routes.knowledge_website import router as knowledge_website_router
from app.api.routes.onboarding import router as onboarding_router
from app.api.routes.runtime import router as runtime_router
from app.api.routes.system import router as system_router


def get_api_router() -> APIRouter:
    router = APIRouter(prefix="/api/v1")
    router.include_router(health_router)
    router.include_router(system_router)
    router.include_router(bootstrap_router)
    router.include_router(agents_router)
    # Register website routes before generic `/knowledge/*` so nested paths always resolve.
    router.include_router(knowledge_website_router)
    router.include_router(knowledge_files_router)
    router.include_router(knowledge_snippets_router)
    router.include_router(knowledge_qa_router)
    router.include_router(knowledge_router)
    router.include_router(onboarding_router)
    router.include_router(runtime_router)
    router.include_router(conversations_router)
    return router

