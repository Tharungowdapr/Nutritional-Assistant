"""
AaharAI NutriSync — LLM Router
Implements Ollama ↔ Groq fallback with circuit-breaker pattern.
Integrated with LLMProxy for unified provider handling.
"""
import time
import logging
import httpx
import json
from app.services.llm.proxy import LLMProxy

logger = logging.getLogger(__name__)

class LLMRouter:
    """Routes LLM requests to Ollama (primary) or Groq (fallback), using LLMProxy."""

    def __init__(self, ollama_base_url: str, ollama_model: str,
                 groq_api_key: str, groq_model: str,
                 retry_interval: int = 60):
        self.ollama_url = ollama_base_url
        self.ollama_model = ollama_model
        self.groq_api_key = groq_api_key
        self.groq_model = groq_model
        self.retry_interval = retry_interval

        self._ollama_available: bool = False
        self._groq_available: bool = False
        self._last_ollama_check: float = 0
        self._active_provider: str = "unknown"

    async def initialize(self):
        """Check both providers and set the active one."""
        await self._check_ollama()
        if not self._ollama_available:
            await self._check_groq()

        if self._ollama_available:
            self._active_provider = "ollama"
            logger.info(f"LLM Router: Using Ollama (local) — model: {self.ollama_model}")
        elif self._groq_available:
            self._active_provider = "groq"
            logger.info(f"LLM Router: Using Groq (cloud) — model: {self.groq_model}")
        else:
            self._active_provider = "none"
            logger.warning("LLM Router: No LLM provider available!")

    async def _check_ollama(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{self.ollama_url}/api/tags")
                self._ollama_available = resp.status_code == 200
                self._last_ollama_check = time.time()
        except Exception:
            self._ollama_available = False
            self._last_ollama_check = time.time()
        return self._ollama_available

    async def _check_groq(self) -> bool:
        if not self.groq_api_key or self.groq_api_key in ("", "your_groq_api_key_here"):
            self._groq_available = False
            return False
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    "https://api.groq.com/openai/v1/models",
                    headers={"Authorization": f"Bearer {self.groq_api_key}"},
                )
                self._groq_available = resp.status_code == 200
        except Exception:
            self._groq_available = False
        return self._groq_available

    async def _maybe_retry_ollama(self):
        if self._active_provider != "ollama" and \
           time.time() - self._last_ollama_check > self.retry_interval:
            if await self._check_ollama():
                self._active_provider = "ollama"
                logger.info("LLM Router: Ollama is back! Switching to local.")

    async def generate(self, prompt: str, system: str = "",
                       temperature: float = 0.7, max_tokens: int = 4096,
                       provider_override: dict = None) -> tuple[str, str]:
        """Generate with optional dynamic provider override.
        
        When provider_override is provided (e.g. from user's saved LLM config),
        it takes precedence over the built-in Ollama/Groq fallback chain.
        Format: {"provider": str, "api_key": str, "model": str, "base_url": str?}
        """
        if provider_override:
            from app.services.rag.override import generate_override
            try:
                content = await generate_override(prompt, system, provider_override)
                if content == "INVALID_API_KEY":
                    return "**Invalid API Key** — Update your LLM provider settings.", provider_override["provider"]
                if content == "RATE_LIMITED":
                    return "**Rate Limit Exceeded** — Check your LLM provider billing tier.", provider_override["provider"]
                if content.startswith("Error from") or content.startswith("Connection error"):
                    return f"**LLM Error** — {content[:100]}", provider_override["provider"]
                return content, provider_override["provider"]
            except Exception as e:
                logger.error(f"Provider override failed ({provider_override.get('provider')}): {e}. Falling back.")
        
        await self._maybe_retry_ollama()

        if self._active_provider == "ollama":
            try:
                content = await LLMProxy.complete(
                    provider="ollama", model=self.ollama_model, prompt=prompt,
                    system_prompt=system, base_url=self.ollama_url, 
                    temperature=temperature, max_tokens=max_tokens
                )
                return content, "ollama"
            except Exception as e:
                logger.warning(f"Ollama failed: {e}. Falling back.")
                self._ollama_available = False
                self._active_provider = "groq" if self._groq_available else "none"

        if self._active_provider == "groq":
            try:
                content = await LLMProxy.complete(
                    provider="groq", model=self.groq_model, prompt=prompt,
                    system_prompt=system, api_key=self.groq_api_key, 
                    temperature=temperature, max_tokens=max_tokens
                )
                return content, "groq"
            except Exception as e:
                logger.error(f"Groq failed: {e}")

        return "I'm sorry, no LLM provider is available.", "none"

    async def stream_generate(self, prompt: str, system: str = "",
                              temperature: float = 0.7, max_tokens: int = 4096,
                              provider_override: dict = None):
        """Streaming version of generate with optional provider override."""
        if provider_override:
            from app.services.rag.override import stream_generate_override
            try:
                async for chunk in stream_generate_override(prompt, system, provider_override):
                    if chunk == "INVALID_API_KEY":
                        yield "**Invalid API Key** — Update your LLM provider settings."
                        return
                    if chunk == "RATE_LIMITED":
                        yield "**Rate Limit Exceeded** — Check your LLM provider billing tier."
                        return
                    if chunk.startswith("Error from") or chunk.startswith("Connection error"):
                        yield f"**LLM Error** — {chunk[:100]}"
                        return
                    yield chunk
                return
            except Exception as e:
                logger.error(f"Provider override stream failed ({provider_override.get('provider')}): {e}. Falling back.")
        
        await self._maybe_retry_ollama()

        if self._active_provider == "ollama":
            try:
                async for chunk in LLMProxy.stream(
                    provider="ollama", model=self.ollama_model, prompt=prompt,
                    system_prompt=system, base_url=self.ollama_url, 
                    temperature=temperature, max_tokens=max_tokens
                ):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Ollama stream failed: {e}. Falling back.")
                self._ollama_available = False
                self._active_provider = "groq" if self._groq_available else "none"

        if self._active_provider == "groq":
            try:
                async for chunk in LLMProxy.stream(
                    provider="groq", model=self.groq_model, prompt=prompt,
                    system_prompt=system, api_key=self.groq_api_key, 
                    temperature=temperature, max_tokens=max_tokens
                ):
                    yield chunk
                return
            except Exception as e:
                logger.error(f"Groq stream failed: {e}")

        yield "LLM Provider Unavailable."

    @property
    def active_provider(self) -> str:
        return self._active_provider

    @property
    def status(self) -> dict:
        return {
            "active_provider": self._active_provider,
            "ollama_available": self._ollama_available,
            "groq_available": self._groq_available,
            "ollama_model": self.ollama_model,
            "groq_model": self.groq_model,
        }
