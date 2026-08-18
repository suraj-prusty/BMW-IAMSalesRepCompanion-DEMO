"""
Azure OpenAI service layer.

Provides async functions to call the Azure OpenAI Chat Completions API.
All calls go through this module — nowhere else in the codebase touches
the Azure endpoint directly.
"""

import httpx
from app.config import get_settings


def _build_url() -> str:
    """Construct the full Azure OpenAI chat completions URL."""
    s = get_settings()
    return (
        f"{s.azure_openai_endpoint}/openai/deployments/"
        f"{s.azure_openai_deployment}/chat/completions"
        f"?api-version={s.azure_openai_api_version}"
    )


def _build_headers() -> dict:
    """Build request headers with API key."""
    return {
        "Content-Type": "application/json",
        "api-key": get_settings().azure_openai_api_key,
    }


async def chat_completion(
    messages: list[dict],
    max_tokens: int = 500,
    temperature: float = 0.7,
) -> str:
    """
    Send a chat completion request to Azure OpenAI.

    Args:
        messages: List of {"role": str, "content": str} dicts.
        max_tokens: Maximum tokens in the response.
        temperature: Sampling temperature (0.0 – 1.0).

    Returns:
        The assistant's reply text (stripped).

    Raises:
        httpx.HTTPStatusError: If Azure returns a non-2xx status.
        Exception: For network or parse errors.
    """
    payload = {
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(_build_url(), headers=_build_headers(), json=payload)

    if response.status_code != 200:
        raise Exception(
            f"Azure OpenAI error {response.status_code}: {response.text}"
        )

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()
