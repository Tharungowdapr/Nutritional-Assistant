import json
import httpx

async def stream_generate_override(prompt: str, system: str, config: dict):
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
        payload = {
            "model": model, "temperature": 0.7, "stream": True,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}]
        }
        
        import logging
        logger = logging.getLogger("app.services.rag.override")
        logger.info(f"🚀 Overriding LLM with {provider} ({model})")
        
        async with httpx.AsyncClient(timeout=30) as client:
            try:
                async with client.stream("POST", url, json=payload, headers={"Authorization": f"Bearer {api_key}"}) as resp:
                    if resp.status_code != 200:
                        error_text = await resp.aread()
                        logger.error(f"❌ {provider} API failed ({resp.status_code}): {error_text.decode()}")
                        yield f"Error from {provider}: {resp.status_code}"
                        return
                        
                    async for line in resp.aiter_lines():
                        try:
                            data = line[6:]
                            if not data or data.strip() == "[DONE]": break
                            part = json.loads(data)
                            delta = part["choices"][0]["delta"].get("content", "")
                            if delta: yield delta
                        except Exception as e:
                            continue
            except Exception as e:
                logger.error(f"💥 {provider} Connection Error: {e}")
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
            max_tokens=4096,
            model=model,
            system=system,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            async for text in stream.text_stream:
                yield text
                
    elif provider == "ollama":
        url = api_key if api_key.startswith("http") else "http://localhost:11434"
        payload = {"model": model, "prompt": prompt, "system": system, "stream": True}
        async with httpx.AsyncClient(timeout=120) as client:
            async with client.stream("POST", f"{url}/api/generate", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line: continue
                    try:
                        part = json.loads(line)
                        if "response" in part: yield part["response"]
                    except: continue
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

async def generate_override(prompt: str, system: str, config: dict):
    res = ""
    async for t in stream_generate_override(prompt, system, config):
        res += t
    return res
