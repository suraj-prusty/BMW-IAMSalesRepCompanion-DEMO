"""
AI/LLM endpoints.

POST /api/ai/chat    — RAG-powered chatbot (ChatBot component).
POST /api/ai/generate — general-purpose generation (pitch, summary, email).
"""

from fastapi import APIRouter, HTTPException
from app.models.ai import ChatRequest, ChatResponse, GenerateRequest, GenerateResponse
from app.services.azure_openai import chat_completion
from app.data.rag_knowledge import RAG_KNOWLEDGE

router = APIRouter(tags=["ai"])


def _build_rag_system_prompt(system_context: str | None = None) -> str:
    """
    Build the full system prompt with RAG knowledge injected server-side.

    The frontend may still send a screen-specific system_context.
    We prepend the RAG knowledge base to it for richer answers.
    """
    base = f"""You are an expert IAM field intelligence assistant for BMW's Independent Aftermarket program.

--- BMW IAM PROGRAM KNOWLEDGE BASE ---
{RAG_KNOWLEDGE}
--- END OF KNOWLEDGE BASE ---
"""
    if system_context:
        base += f"\n\n{system_context}"

    base += "\n\nWhen answering, prioritise the knowledge base above. Be concise and actionable."
    return base


@router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(body: ChatRequest):
    """
    Chat endpoint for the ChatBot component.

    Receives conversation history + optional screen context.
    Injects the full RAG knowledge base server-side before calling Azure OpenAI.
    """
    try:
        system_prompt = _build_rag_system_prompt(body.system_context)

        messages = [{"role": "system", "content": system_prompt}]
        messages.extend(
            {"role": m.role, "content": m.content} for m in body.messages
        )

        reply = await chat_completion(messages, max_tokens=500, temperature=0.7)

        return ChatResponse(reply=reply)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/generate", response_model=GenerateResponse)
async def ai_generate(body: GenerateRequest):
    """
    General-purpose AI generation endpoint.

    Used for:
      - Pre-visit pitch generation (DealerBriefing)
      - Pre-visit intelligence summary (DealerBriefing)
      - Post-visit meeting summary (ReviewSubmit)
      - Follow-up email draft (ReviewSubmit)
    """
    try:
        messages = [
            {"role": "system", "content": body.system_prompt},
            {"role": "user", "content": body.user_prompt},
        ]

        reply = await chat_completion(
            messages,
            max_tokens=body.max_tokens,
            temperature=body.temperature,
        )

        return GenerateResponse(reply=reply)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
