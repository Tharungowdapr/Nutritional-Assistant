import httpx
import json
import logging
from typing import Optional, AsyncGenerator, Union
from app.core.config import settings

logger = logging.getLogger(__name__)


class LLMProxy:
    """Unified proxy for multiple LLM providers with streaming support."""

    @staticmethod
    async def complete(
        provider: str,
        model: str,
        prompt: str,
        system_prompt: str = "",
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> str:
        """Non-streaming completion."""
        try:
            if provider == "ollama":
                return await LLMProxy._complete_ollama(model, prompt, system_prompt, base_url, temperature, max_tokens)
            elif provider in ["openai", "groq", "openrouter", "mistral", "together"]:
                return await LLMProxy._complete_openai_compatible(
                    provider, model, prompt, system_prompt, api_key, temperature, max_tokens
                )
            elif provider == "anthropic":
                return await LLMProxy._complete_anthropic(
                    model, prompt, system_prompt, api_key, temperature, max_tokens
                )
            elif provider == "gemini":
                return await LLMProxy._complete_gemini(model, prompt, system_prompt, api_key, temperature, max_tokens)
            elif provider == "cohere":
                return await LLMProxy._complete_cohere(model, prompt, system_prompt, api_key, temperature, max_tokens)
            else:
                raise ValueError(f"Unsupported provider: {provider}")
        except Exception as e:
            logger.error(f"LLM Proxy Error ({provider}): {e}")
            raise

    @staticmethod
    async def stream(
        provider: str,
        model: str,
        prompt: str,
        system_prompt: str = "",
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """Streaming completion."""
        if provider == "ollama":
            async for chunk in LLMProxy._stream_ollama(model, prompt, system_prompt, base_url, temperature, max_tokens):
                yield chunk
        elif provider in ["openai", "groq", "openrouter", "mistral", "together"]:
            async for chunk in LLMProxy._stream_openai_compatible(
                provider, model, prompt, system_prompt, api_key, temperature, max_tokens
            ):
                yield chunk
        else:
            # Fallback to non-streaming for unsupported providers (or implement them)
            res = await LLMProxy.complete(
                provider, model, prompt, system_prompt, api_key, base_url, temperature, max_tokens
            )
            yield res

    @staticmethod
    async def _complete_ollama(
        model: str, prompt: str, system: str, base_url: Optional[str], temp: float, tokens: int
    ) -> str:
        url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/") + "/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": {"temperature": temp, "num_predict": tokens},
        }
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json().get("response", "")

    @staticmethod
    async def _stream_ollama(
        model: str, prompt: str, system: str, base_url: Optional[str], temp: float, tokens: int
    ) -> AsyncGenerator[str, None]:
        url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/") + "/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "system": system,
            "stream": True,
            "options": {"temperature": temp, "num_predict": tokens},
        }
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        chunk = data.get("response", "")
                        if chunk:
                            yield chunk
                        if data.get("done"):
                            break
                    except Exception:
                        continue

    @staticmethod
    async def _complete_openai_compatible(
        provider: str, model: str, prompt: str, system: str, api_key: str, temp: float, tokens: int
    ) -> str:
        bases = {
            "openai": "https://api.openai.com/v1",
            "groq": "https://api.groq.com/openai/v1",
            "openrouter": "https://openrouter.ai/api/v1",
            "mistral": "https://api.mistral.ai/v1",
            "together": "https://api.together.xyz/v1",
        }
        url = f"{bases.get(provider)}/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        if not model:
            model = {
                "groq": "llama-3.1-8b-instant",
                "openai": "gpt-4o-mini",
                "openrouter": "meta-llama/llama-3.1-8b-instruct:free",
                "mistral": "mistral-small-latest",
                "together": "meta-llama/Llama-3-70b-chat-hf",
            }.get(provider, "")
        payload = {"model": model, "messages": messages, "temperature": temp, "max_tokens": tokens}
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 401 or resp.status_code == 403:
                raise PermissionError(f"Invalid API key for {provider}. Please update your LLM provider settings.")
            if resp.status_code == 429:
                raise ConnectionError(f"Rate limit exceeded for {provider}. Check your billing tier.")
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

    @staticmethod
    async def _stream_openai_compatible(
        provider: str, model: str, prompt: str, system: str, api_key: str, temp: float, tokens: int
    ) -> AsyncGenerator[str, None]:
        bases = {
            "openai": "https://api.openai.com/v1",
            "groq": "https://api.groq.com/openai/v1",
            "openrouter": "https://openrouter.ai/api/v1",
            "mistral": "https://api.mistral.ai/v1",
            "together": "https://api.together.xyz/v1",
        }
        url = f"{bases.get(provider)}/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        if not model:
            model = {
                "groq": "llama-3.1-8b-instant",
                "openai": "gpt-4o-mini",
                "openrouter": "meta-llama/llama-3.1-8b-instruct:free",
                "mistral": "mistral-small-latest",
                "together": "meta-llama/Llama-3-70b-chat-hf",
            }.get(provider, "")
        payload = {"model": model, "messages": messages, "temperature": temp, "max_tokens": tokens, "stream": True}
        async with httpx.AsyncClient(timeout=60) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as resp:
                if resp.status_code == 401 or resp.status_code == 403:
                    yield "Error: Invalid API key for " + provider + ". Please update your LLM provider settings."
                    return
                if resp.status_code == 429:
                    yield "Error: Rate limit exceeded for " + provider + ". Check your billing tier."
                    return
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    if "[DONE]" in line:
                        break
                    try:
                        data = json.loads(line[6:])
                        chunk = data["choices"][0]["delta"].get("content", "")
                        if chunk:
                            yield chunk
                    except Exception:
                        continue

    @staticmethod
    async def _complete_anthropic(model: str, prompt: str, system: str, api_key: str, temp: float, tokens: int) -> str:
        url = "https://api.anthropic.com/v1/messages"
        headers = {"x-api-key": api_key, "anthropic-version": "2023-06-01", "Content-Type": "application/json"}
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": tokens,
            "temperature": temp,
        }
        if system:
            payload["system"] = system
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]

    @staticmethod
    async def _complete_gemini(model: str, prompt: str, system: str, api_key: str, temp: float, tokens: int) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
        full_prompt = f"System: {system}\n\nUser: {prompt}" if system else prompt
        payload = {
            "contents": [{"parts": [{"text": full_prompt}]}],
            "generationConfig": {"temperature": temp, "maxOutputTokens": tokens},
        }
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            return resp.json()["candidates"][0]["content"]["parts"][0]["text"]

    @staticmethod
    async def _complete_cohere(model: str, prompt: str, system: str, api_key: str, temp: float, tokens: int) -> str:
        url = "https://api.cohere.ai/v1/chat"
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        payload = {"model": model, "message": prompt, "temperature": temp, "max_tokens": tokens}
        if system:
            payload["preamble"] = system
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            return resp.json().get("text", "")
