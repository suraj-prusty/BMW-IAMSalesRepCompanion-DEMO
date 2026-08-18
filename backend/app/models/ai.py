"""
Pydantic models for AI/LLM endpoints.
"""

from pydantic import BaseModel, Field


# ── Chat ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    """A single message in a conversation turn."""
    role: str          # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    """Expected body for POST /api/ai/chat."""
    messages: list[ChatMessage]
    system_context: str | None = None   # kept for backwards compat; RAG injected server-side


class ChatResponse(BaseModel):
    """Response body for POST /api/ai/chat."""
    reply: str


# ── Generate ────────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    """Expected body for POST /api/ai/generate (pitch, summary, email)."""
    system_prompt: str = Field(alias="systemPrompt")
    user_prompt: str = Field(alias="userPrompt")
    max_tokens: int = Field(default=350, alias="maxTokens")
    temperature: float = Field(default=0.7)

    model_config = {"populate_by_name": True}


class GenerateResponse(BaseModel):
    """Response body for POST /api/ai/generate."""
    reply: str
