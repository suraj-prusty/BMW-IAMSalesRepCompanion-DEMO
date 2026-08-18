"""
API router aggregator.

Collects all sub-routers and exposes them under /api.
"""

from fastapi import APIRouter
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.ai import router as ai_router

router = APIRouter(prefix="/api")

router.include_router(health_router)
router.include_router(auth_router)
router.include_router(ai_router)
