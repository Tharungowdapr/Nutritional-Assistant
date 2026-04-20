"""
AaharAI NutriSync — Redis Cache Layer
Provides caching for API responses, chat messages, and food queries.
"""
import json
import logging
from typing import Any, Optional
import hashlib

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

from config import settings

logger = logging.getLogger(__name__)


class CacheService:
    """Redis caching service for performance optimization."""
    
    _instance: Optional["CacheService"] = None
    _client = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._connect()
        return cls._instance
    
    def _connect(self):
        """Connect to Redis."""
        if not REDIS_AVAILABLE:
            logger.warning("Redis module not available. Caching disabled.")
            return
        
        if settings.REDIS_PASSWORD:
            self._client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                password=settings.REDIS_PASSWORD,
                db=settings.REDIS_DB,
                decode_responses=True
            )
        else:
            self._client = redis.Redis(
                host=settings.REDIS_HOST,
                port=settings.REDIS_PORT,
                db=settings.REDIS_DB,
                decode_responses=True
            )
        
        # Test connection
        try:
            self._client.ping()
            logger.info(f"Redis connected: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Caching disabled.")
            self._client = None
    
    def _generate_key(self, prefix: str, *args) -> str:
        """Generate cache key from prefix and arguments."""
        key_parts = [prefix] + [str(arg) for arg in args]
        key_str = ":".join(key_parts)
        # Hash if key is too long
        if len(key_str) > 200:
            return f"{prefix}:{hashlib.md5(key_str.encode()).hexdigest()}"
        return key_str
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        if not self._client:
            return None
        try:
            value = self._client.get(key)
            if value:
                return json.loads(value)
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL."""
        if not self._client:
            return False
        try:
            serialized = json.dumps(value, default=str)
            expiry = ttl or settings.REDIS_CACHE_TTL
            self._client.setex(key, expiry, serialized)
            return True
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete key from cache."""
        if not self._client:
            return False
        try:
            self._client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern."""
        if not self._client:
            return 0
        try:
            keys = self._client.keys(pattern)
            if keys:
                return self._client.delete(*keys)
        except Exception as e:
            logger.warning(f"Cache delete pattern error: {e}")
        return 0
    
    def clear_all(self) -> bool:
        """Clear all cache."""
        if not self._client:
            return False
        try:
            self._client.flushdb()
            logger.info("Cache cleared")
            return True
        except Exception as e:
            logger.warning(f"Cache clear error: {e}")
            return False


# Singleton instance
cache = CacheService()


# Decorator for caching function results
def cached(prefix: str, ttl: Optional[int] = None):
    """Decorator to cache function results.
    
    Usage:
        @cached("foods", ttl=300)
        def get_foods():
            return expensive_database_query()
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Generate cache key
            key = cache._generate_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            result = cache.get(key)
            if result is not None:
                logger.debug(f"Cache hit: {key}")
                return result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            cache.set(key, result, ttl)
            logger.debug(f"Cache miss: {key}")
            
            return result
        return wrapper
    return decorator