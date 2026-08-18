"""
Application configuration loaded from .env file.

Uses pydantic-settings for type-safe, validated settings.
The .env file lives in the project root (one level above backend/).
"""

import os
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Server ──────────────────────────────────────────────────────────
    port: int = 8000
    environment: str = "development"

    # ── Azure OpenAI ─────────────────────────────────────────────────────
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_api_version: str = "2024-08-01-preview"
    azure_openai_deployment: str = "gpt-4o"

    # ── Demo Auth (POC only) ─────────────────────────────────────────────
    demo_email: str = "demo.agenticai@corporate.com"
    demo_password: str = "AgenticAI@2026"

    # ── Frontend static files (production) ───────────────────────────────
    dist_dir: str = ""  # resolved at startup

    model_config = {
        "env_file": os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance (singleton)."""
    return Settings()
