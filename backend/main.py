"""
Intelligent IAM Copilot — FastAPI Backend.

Entry point for the Python backend server.
Replaces the previous Express.js server (server.js).

Run:
    uvicorn main:app --reload --port 8000     (development)
    python main.py                             (alternative)

Production:
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

import os
import sys
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).parent))

from app.api.router import router as api_router
from app.config import get_settings

# ── App factory ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="Intelligent IAM Copilot API",
    description="Backend API for BMW IAM Field Intelligence POC",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # POC: open; tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routes ──────────────────────────────────────────────────────────────

app.include_router(api_router)


# ── Static file serving (production) ────────────────────────────────────────

settings = get_settings()
dist_path = settings.dist_dir or os.path.join(
    os.path.dirname(__file__), "..", "dist"
)

if os.path.isdir(dist_path):
    # Mount static assets (JS, CSS, images) at /
    app.mount("/", StaticFiles(directory=dist_path, html=False), name="static")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request):
        """
        SPA fallback: serve index.html for all non-API routes.

        This lets React Router handle client-side routing.
        If the request starts with /api, return 404 — let API routers handle it.
        """
        if full_path.startswith("api/"):
            return JSONResponse(
                {"error": "API route not found"}, status_code=404
            )

        index_file = os.path.join(dist_path, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)

        return JSONResponse(
            {"error": "Frontend not built. Run: npm run build"},
            status_code=404,
        )

    @app.exception_handler(404)
    async def spa_fallback(request: Request, _exc):
        """Catch 404s for client-side routes and return index.html."""
        if request.url.path.startswith("/api"):
            return JSONResponse(
                {"error": "API route not found"}, status_code=404
            )
        index_file = os.path.join(dist_path, "index.html")
        if os.path.isfile(index_file):
            return FileResponse(index_file)
        return JSONResponse({"error": "Not found"}, status_code=404)


# ── Startup ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=settings.environment == "development",
    )
