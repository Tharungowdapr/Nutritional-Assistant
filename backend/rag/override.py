import json
import httpx

async def stream_generate_override(prompt: str, system: str, config: dict):
    provider = config["provider"]
    api_key = config["api_key"]
    model = config["model"]
    
    if provider == "groq" or provider in ("openrouter", "together", "mistral"):
        base_urls = {
            "groq": "https://api.groq.com/openai/v1",
            "openrouter": "https://openrouter.ai/api/v1",
            "together": "https://api.together.xyz/v1",
            "mistral": "https://api.mistral.ai/v1",
        }
        url = f"{base_urls[provider]}/chat/completions"
        payload = {
            "model": model, "temperature": 0.7, "stream": True,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}]
        }
        async with httpx.AsyncClient(timeout=30) as client:
            async with client.stream("POST", url, json=payload, headers={"Authorization": f"Bearer {api_key}"}) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.startswith("data: "): continue
                    if "[DONE]" in line: break
                    try:
                        delta = json.loads(line[6:])["choices"][0]["delta"].get("content", "")
                        if delta: yield delta
                    except: continue

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
        import asyncio
        co = cohere.Client(api_key)
        res = co.chat_stream(message=prompt, model=model, preamble=system)
        for event in res:
            if event.event_type == "text-generation":
                yield event.text
            await asyncio.sleep(0) # yield control
    else:
        yield f"Provider {provider} stream not supported yet."

async def generate_override(prompt: str, system: str, config: dict):
    res = ""
    async for t in stream_generate_override(prompt, system, config):
        res += t
    return res
