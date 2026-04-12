"""
AaharAI NutriSync — LLM Router
Implements Ollama ↔ Groq fallback with circuit-breaker pattern.
Updated for gemma4:e2b model.
"""
import time
import logging
import httpx
import json
from typing import Optional

logger = logging.getLogger(__name__)


class LLMRouter:
    """Routes LLM requests to Ollama (primary) or Groq (fallback)."""

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
            logger.info(f"✅ LLM Router: Using Ollama (local) — model: {self.ollama_model}")
        elif self._groq_available:
            self._active_provider = "groq"
            logger.info(f"⚡ LLM Router: Using Groq (cloud) — model: {self.groq_model}")
        else:
            self._active_provider = "none"
            logger.warning("❌ LLM Router: No LLM provider available!")

    async def _check_ollama(self) -> bool:
        """Ping Ollama's /api/tags endpoint."""
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.ollama_url}/api/tags")
                self._ollama_available = resp.status_code == 200
                self._last_ollama_check = time.time()
        except Exception:
            self._ollama_available = False
            self._last_ollama_check = time.time()
        return self._ollama_available

    async def _check_groq(self) -> bool:
        """Verify Groq API key is valid."""
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
        """Circuit breaker: retry Ollama if enough time has passed."""
        if self._active_provider != "ollama" and \
           time.time() - self._last_ollama_check > self.retry_interval:
            if await self._check_ollama():
                self._active_provider = "ollama"
                logger.info("🔄 LLM Router: Ollama is back! Switching to local.")

    async def generate(self, prompt: str, system: str = "",
                       temperature: float = 0.7) -> tuple[str, str]:
        """Generate text using the active LLM provider.
        Returns (response_text, provider_name).
        """
        await self._maybe_retry_ollama()

        if self._active_provider == "ollama":
            try:
                return await self._generate_ollama(prompt, system, temperature), "ollama"
            except Exception as e:
                logger.warning(f"Ollama failed: {e}. Falling back to Groq.")
                self._ollama_available = False
                self._active_provider = "groq" if self._groq_available else "none"

        if self._active_provider == "groq":
            try:
                return await self._generate_groq(prompt, system, temperature), "groq"
            except Exception as e:
                logger.error(f"Groq also failed: {e}")

        return "I'm sorry, no LLM provider is currently available. Please ensure Ollama is running.", "none"

    async def _generate_ollama(self, prompt: str, system: str,
                                temperature: float) -> str:
        """Call Ollama's /api/generate endpoint."""
        payload = {
            "model": self.ollama_model,
            "prompt": prompt,
            "system": system,
            "stream": True,
            "options": {"temperature": temperature},
        }
        # Ollama returns an NDJSON stream of partial tokens. Consume the
        # stream and concatenate `response` fields into the final string.
        async with httpx.AsyncClient(timeout=180) as client:
            async with client.stream("POST", f"{self.ollama_url}/api/generate", json=payload) as resp:
                resp.raise_for_status()
                assembled = ""
                async for raw_line in resp.aiter_lines():
                    if not raw_line:
                        continue
                    try:
                        part = json.loads(raw_line)
                    except Exception:
                        continue
                    # Concatenate incremental `response` tokens
                    if "response" in part and part["response"]:
                        assembled += part["response"]
                    # If the stream indicates completion, stop
                    if part.get("done"):
                        break
                return assembled

    async def _generate_groq(self, prompt: str, system: str,
                              temperature: float) -> str:
        """Call Groq's OpenAI-compatible chat endpoint."""
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.groq_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": 2048,
        }
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {self.groq_api_key}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]

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
