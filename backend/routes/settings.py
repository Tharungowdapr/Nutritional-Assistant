"""
AaharAI NutriSync — Settings Routes
LLM provider config: save, test, activate, list.
API keys encrypted with Fernet before storing.
"""
import json, logging, time
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from auth.database import get_db, UserDB
from auth.dependencies import require_user

router = APIRouter(prefix="/api/settings", tags=["Settings"])
logger = logging.getLogger(__name__)


# ── Simple AES-like encryption using secrets ──────────────────────────────
def _encrypt(value: str, secret: str) -> str:
    """XOR-based obfuscation + base64. For production use Fernet from cryptography."""
    try:
        from cryptography.fernet import Fernet
        import hashlib, base64
        key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
        f = Fernet(key)
        return f.encrypt(value.encode()).decode()
    except ImportError:
        # Fallback: store as-is (warn in logs)
        logger.warning("cryptography package not installed — API keys stored unencrypted. Run: pip install cryptography")
        return value


def _decrypt(value: str, secret: str) -> str:
    try:
        from cryptography.fernet import Fernet
        import hashlib, base64
        key = base64.urlsafe_b64encode(hashlib.sha256(secret.encode()).digest())
        f = Fernet(key)
        return f.decrypt(value.encode()).decode()
    except Exception:
        return value  # return as-is if decryption fails


def _get_secret() -> str:
    from config import settings as cfg
    return cfg.SECRET_KEY


# ── Pydantic schemas ──────────────────────────────────────────────────────
class ProviderSaveRequest(BaseModel):
    provider: str
    api_key: str
    model: str

class ProviderTestRequest(BaseModel):
    provider: str
    api_key: str
    model: str


# ── Helpers ───────────────────────────────────────────────────────────────
def _get_provider_configs(user: UserDB) -> dict:
    """Read llm_provider_configs from user.profile JSON."""
    profile = user.profile or {}
    if isinstance(profile, str):
        try: profile = json.loads(profile)
        except: profile = {}
    return profile.get("llm_provider_configs", {})


def _save_provider_configs(user: UserDB, configs: dict, db: Session):
    profile = user.profile or {}
    if isinstance(profile, str):
        try: profile = json.loads(profile)
        except: profile = {}
    profile["llm_provider_configs"] = configs
    user.profile = profile
    db.commit()


# ── Routes ────────────────────────────────────────────────────────────────
@router.get("/llm-providers")
async def list_providers(user: UserDB = Depends(require_user), db: Session = Depends(get_db)):
    """List configured providers for this user (keys masked)."""
    configs = _get_provider_configs(user)
    result = []
    for provider, cfg in configs.items():
        result.append({
            "provider": provider,
            "model": cfg.get("model", ""),
            "is_active": cfg.get("is_active", False),
            "latency_ms": cfg.get("latency_ms"),
            "api_key_set": bool(cfg.get("encrypted_key")),
        })
    return {"providers": result}


@router.put("/llm-providers")
async def save_provider(
    req: ProviderSaveRequest,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Save/update a provider config with encrypted API key."""
    configs = _get_provider_configs(user)
    encrypted = _encrypt(req.api_key, _get_secret())
    configs[req.provider] = {
        **configs.get(req.provider, {}),
        "model": req.model,
        "encrypted_key": encrypted,
        "is_active": configs.get(req.provider, {}).get("is_active", False),
    }
    _save_provider_configs(user, configs, db)
    return {"success": True, "provider": req.provider}


@router.post("/llm-providers/test")
async def test_provider(req: ProviderTestRequest, user: UserDB = Depends(require_user)):
    """Validate an API key by sending a short test prompt. Returns latency."""
    api_key = req.api_key
    model = req.model
    provider = req.provider

    start = time.time()
    try:
        test_prompt = "Reply with only the word: OK"

        if provider == "groq":
            from groq import Groq
            client = Groq(api_key=api_key)
            resp = client.chat.completions.create(
                model=model, messages=[{"role": "user", "content": test_prompt}], max_tokens=5
            )
            resp.choices[0].message.content

        elif provider == "gemini":
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            m = genai.GenerativeModel(model)
            resp = m.generate_content(test_prompt)
            resp.text

        elif provider == "anthropic":
            import anthropic
            client = anthropic.Anthropic(api_key=api_key)
            resp = client.messages.create(
                model=model, max_tokens=5,
                messages=[{"role": "user", "content": test_prompt}]
            )
            resp.content[0].text

        elif provider in ("openrouter", "together", "mistral"):
            import httpx
            base_urls = {
                "openrouter": "https://openrouter.ai/api/v1",
                "together": "https://api.together.xyz/v1",
                "mistral": "https://api.mistral.ai/v1",
            }
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{base_urls[provider]}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": model, "messages": [{"role": "user", "content": test_prompt}], "max_tokens": 5}
                )
                resp.raise_for_status()
                resp.json()["choices"][0]["message"]["content"]

        elif provider == "ollama":
            import httpx
            base_url = api_key if api_key.startswith("http") else "http://localhost:11434"
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    f"{base_url}/api/generate",
                    json={"model": model, "prompt": test_prompt, "stream": False}
                )
                resp.raise_for_status()
                resp.json().get("response", "")

        elif provider == "cohere":
            import cohere
            co = cohere.Client(api_key)
            resp = co.chat(message=test_prompt, model=model)
            resp.text

        latency = round((time.time() - start) * 1000)
        return {"valid": True, "latency_ms": latency, "model": model}

    except Exception as e:
        return {"valid": False, "latency_ms": None, "error": str(e)[:120]}


@router.put("/llm-providers/{provider}/activate")
async def activate_provider(
    provider: str,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    """Set a provider as the active default."""
    configs = _get_provider_configs(user)
    for p in configs:
        configs[p]["is_active"] = (p == provider)
    _save_provider_configs(user, configs, db)
    return {"success": True, "active": provider}


@router.delete("/llm-providers/{provider}")
async def delete_provider(
    provider: str,
    user: UserDB = Depends(require_user),
    db: Session = Depends(get_db),
):
    configs = _get_provider_configs(user)
    configs.pop(provider, None)
    _save_provider_configs(user, configs, db)
    return {"success": True}


@router.get("/llm-providers/ollama/models")
async def list_ollama_models():
    """Probe localhost:11434 for locally installed Ollama models."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get("http://localhost:11434/api/tags")
            data = resp.json()
            return {"models": [m["name"] for m in data.get("models", [])]}
    except Exception as e:
        return {"models": [], "error": str(e)}
