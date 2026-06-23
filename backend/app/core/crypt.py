import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from app.core.config import settings


def _get_fernet() -> Fernet:
    """Generate a Fernet instance using the SECRET_KEY as a seed."""
    password = settings.SECRET_KEY.encode()
    # Use a fixed salt for deterministic key derivation from SECRET_KEY
    salt = b"nutrisync_salt_static"
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(password))
    return Fernet(key)


def encrypt_api_key(api_key: str) -> str:
    """Encrypt an API key string."""
    if not api_key:
        return ""
    f = _get_fernet()
    return f.encrypt(api_key.encode()).decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt an encrypted API key string."""
    if not encrypted_key:
        return ""
    f = _get_fernet()
    try:
        return f.decrypt(encrypted_key.encode()).decode()
    except Exception:
        return ""
