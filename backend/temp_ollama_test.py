import asyncio
import json
import httpx

async def main():
    payload = {
        "model": "gemma4:e2b",
        "prompt": "hello",
        "system": "sys",
        "stream": True,
        "options": {"temperature": 0.7},
    }
    async with httpx.AsyncClient(timeout=30) as client:
        try:
            async with client.stream("POST", "http://localhost:11434/api/generate", json=payload) as resp:
                print("STATUS:", resp.status_code)
                async for line in resp.aiter_lines():
                    print("LINE:", line)
        except Exception as e:
            print("EXCEPTION:", e)

if __name__ == '__main__':
    asyncio.run(main())
