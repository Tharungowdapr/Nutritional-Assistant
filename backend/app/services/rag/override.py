import json
import httpx
import asyncio

# Module-level shared HTTP client for connection reuse
_http_client: httpx.AsyncClient | None = None
_http_client_lock = asyncio.Lock()


async def _get_http_client() -> httpx.AsyncClient:
    """Get or create a shared async HTTP client."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=120)
    return _http_client


async def stream_generate_override(
    prompt: str, system: str, config: dict, json_mode: bool = False, max_tokens: int = 1024
):
    provider = config["provider"]
    api_key = config["api_key"]
    model = config["model"]

    if provider in ("groq", "openrouter", "together", "mistral", "openai", "azure"):
        base_urls = {
            "groq": "https://api.groq.com/openai/v1",
            "openrouter": "https://openrouter.ai/api/v1",
            "together": "https://api.together.xyz/v1",
            "mistral": "https://api.mistral.ai/v1",
            "openai": "https://api.openai.com/v1",
        }
        url = f"{base_urls[provider]}/chat/completions" if provider != "azure" else model
        if not model:
            model = {
                "groq": "llama-3.1-8b-instant",
                "openai": "gpt-4o-mini",
                "openrouter": "meta-llama/llama-3.1-8b-instruct:free",
                "mistral": "mistral-small-latest",
                "together": "meta-llama/Llama-3-70b-chat-hf",
            }.get(provider, "")
        payload = {
            "model": model,
            "temperature": 0.7,
            "max_tokens": max_tokens,
            "stream": True,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        import logging

        logger = logging.getLogger("app.services.rag.override")
        logger.info(f"Overriding LLM with {provider} ({model})")

        client = await _get_http_client()
        try:
            async with client.stream("POST", url, json=payload, headers={"Authorization": f"Bearer {api_key}"}) as resp:
                if resp.status_code == 401 or resp.status_code == 403:
                    yield "INVALID_API_KEY"
                    return
                if resp.status_code == 429 or resp.status_code == 413:
                    yield "RATE_LIMITED"
                    return
                if resp.status_code != 200:
                    error_text = await resp.aread()
                    logger.error(f"{provider} API failed ({resp.status_code}): {error_text.decode()}")
                    yield f"Error from {provider}: {resp.status_code}"
                    return

                buf = ""
                last_yield = asyncio.get_running_loop().time()
                async for line in resp.aiter_lines():
                    try:
                        if not line.startswith("data: "):
                            continue
                        raw = line[6:]
                        if raw.strip() == "[DONE]":
                            break
                        part = json.loads(raw)
                        delta = part["choices"][0]["delta"].get("content", "")
                        if not delta:
                            continue
                        buf += delta
                        now = asyncio.get_running_loop().time()
                        if len(buf) >= 30 or (now - last_yield) >= 0.15:
                            yield buf
                            buf = ""
                            last_yield = now
                    except Exception:
                        continue
                if buf:
                    yield buf
        except Exception as e:
            logger.error(f"{provider} Connection Error: {e}")
            yield f"Connection error: {str(e)}"

    elif provider == "gemini":
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        m = genai.GenerativeModel(model)
        response = m.generate_content(system + "\n\n" + prompt, stream=True)
        for chunk in response:
            yield chunk.text

    elif provider == "anthropic":
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=api_key)
        async with client.messages.stream(
            max_tokens=4096, model=model, system=system, messages=[{"role": "user", "content": prompt}]
        ) as stream:
            async for text in stream.text_stream:
                yield text

    elif provider == "ollama":
        url = api_key if api_key.startswith("http") else "http://localhost:11434"
        payload = {"model": model, "prompt": prompt, "system": system, "stream": True}
        client = await _get_http_client()
        async with client.stream("POST", f"{url}/api/generate", json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    part = json.loads(line)
                    if "response" in part:
                        yield part["response"]
                except Exception:
                    continue
    elif provider == "cohere":
        import cohere

        co = cohere.Client(api_key=api_key)
        try:
            # Cohere v5+ streaming
            for event in co.chat_stream(message=prompt, model=model, preamble=system):
                if event.event_type == "text-generation":
                    yield event.text
        except Exception as e:
            yield f"Cohere error: {str(e)}"
    else:
        yield f"Provider '{provider}' stream not supported yet. Targeted for {model}."


async def generate_override(prompt: str, system: str, config: dict, json_mode: bool = False, max_tokens: int = 2048):
    res = ""
    async for t in stream_generate_override(prompt, system, config, json_mode=json_mode, max_tokens=max_tokens):
        res += t
    return res
