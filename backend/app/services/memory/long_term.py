"""
AaharAI NutriSync — Long-term Memory Service
Handles "remember this" requests using LLM-based fact extraction
with regex fallback for reliability.
"""
import logging
import re
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.user import UserMemoryDB

logger = logging.getLogger(__name__)

# Patterns that indicate the user wants to save a fact
REMEMBER_PATTERNS = [
    r"remember\s+(?:that\s+)?(.+)",
    r"(?:can you |please )?(?:store|save|note)\s+(?:that\s+)?(.+)",
    r"(?:my|the)\s+(?:diet\s+)?(?:is|was|has|had|contains|includes)\s+(.+)",
    r"i(?:'m| am)\s+(?:allergic to|diagnosed with|suffering from|taking|on)\s+(.+)",
    r"i\s+(?:can't|cannot|don't|shouldn't)\s+eat\s+(.+)",
    r"i\s+(?:prefer|like|love|enjoy)\s+(.+)",
]


class LongTermMemory:
    """Service to manage persistent user facts with LLM-enhanced extraction."""

    @staticmethod
    def extract_and_save_fact(user_id: int, message: str, db: Session) -> Optional[str]:
        """
        Detects if user wants to remember something and saves it.
        Uses LLM for complex extraction, falls back to regex for reliability.
        """
        if not user_id or not message:
            return None

        message_lower = message.lower().strip()

        # Quick regex check first (fast path)
        fact = LongTermMemory._regex_extract(message, message_lower)

        # If no regex match, try LLM extraction for complex sentences
        if not fact:
            fact = LongTermMemory._llm_extract(message)

        if not fact:
            return None

        # Clean up the fact
        fact = re.sub(r'[.!?;]+$', '', fact).strip()
        if len(fact) < 5 or len(fact) > 500:
            return None

        try:
            # Check for duplicates (fuzzy match)
            existing = db.query(UserMemoryDB).filter(
                UserMemoryDB.user_id == user_id,
                UserMemoryDB.is_active == True
            ).all()

            for mem in existing:
                if LongTermMemory._facts_overlap(fact, mem.fact):
                    logger.debug(f"Memory already exists (similar to: {mem.fact})")
                    return None

            new_memory = UserMemoryDB(user_id=user_id, fact=fact)
            db.add(new_memory)
            db.commit()
            logger.info(f"Memory saved for user {user_id}: {fact}")
            return fact
        except Exception as e:
            logger.error(f"Failed to save long-term memory: {e}")
            db.rollback()

        return None

    @staticmethod
    def _regex_extract(message: str, message_lower: str) -> Optional[str]:
        """Fast regex-based fact extraction."""
        for pattern in REMEMBER_PATTERNS:
            match = re.search(pattern, message_lower)
            if match:
                fact = match.group(1) if match.lastindex else match.group(0)
                # Preserve original casing from the message
                start = match.start(1) if match.lastindex else match.start()
                end = match.end(1) if match.lastindex else match.end()
                fact = message[start:end].strip()
                if len(fact) > 5:
                    return fact
        return None

    @staticmethod
    def _llm_extract(message: str) -> Optional[str]:
        """LLM-based fact extraction for complex sentences (async-safe wrapper)."""
        try:
            import asyncio
            from app.services.rag.llm_router import LLMRouter
            from app.core.config import settings

            extraction_prompt = f"""Extract the key personal health/dietary fact from this message.
Return ONLY the fact itself, nothing else. If there is no health/dietary fact, return "NONE".

Examples:
- "I'm allergic to peanuts" → "Allergic to peanuts"
- "I was diagnosed with Type 2 diabetes last year" → "Has Type 2 diabetes"
- "Please remember that I'm vegetarian" → "Vegetarian"
- "I can't eat gluten" → "Cannot eat gluten (gluten intolerant)"
- "My morning walk is at 6am" → "Morning walk at 6am"
- "What is protein?" → "NONE"

Message: "{message}"
Fact:"""

            # Try synchronous LLM call via router
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # We're inside an async context - use a thread
                    import concurrent.futures
                    with concurrent.futures.ThreadPoolExecutor() as pool:
                        router = LLMRouter(
                            ollama_base_url=settings.OLLAMA_BASE_URL,
                            ollama_model=settings.OLLAMA_MODEL,
                            groq_api_key=settings.GROQ_API_KEY,
                            groq_model=settings.GROQ_MODEL,
                        )
                        future = pool.submit(
                            asyncio.run,
                            router.generate(extraction_prompt, system="You are a fact extractor.", temperature=0)
                        )
                        result = future.result(timeout=10)
                        response = result[0] if isinstance(result, tuple) else result
                else:
                    router = LLMRouter(
                        ollama_base_url=settings.OLLAMA_BASE_URL,
                        ollama_model=settings.OLLAMA_MODEL,
                        groq_api_key=settings.GROQ_API_KEY,
                        groq_model=settings.GROQ_MODEL,
                    )
                    response = asyncio.run(
                        router.generate(extraction_prompt, system="You are a fact extractor.", temperature=0)
                    )
                    response = response[0] if isinstance(response, tuple) else response

                if response and response.strip().upper() != "NONE":
                    return response.strip().strip('"').strip("'")
            except Exception as e:
                logger.debug(f"LLM fact extraction failed (falling back to regex): {e}")

        except Exception as e:
            logger.debug(f"LLM extraction unavailable: {e}")

        return None

    @staticmethod
    def _facts_overlap(fact1: str, fact2: str) -> bool:
        """Check if two facts are similar enough to be considered duplicates."""
        words1 = set(fact1.lower().split())
        words2 = set(fact2.lower().split())
        if not words1 or not words2:
            return False
        overlap = len(words1 & words2) / max(len(words1), len(words2))
        return overlap > 0.7

    @staticmethod
    def get_user_memories(user_id: int, db: Session) -> List[str]:
        """Retrieve all active memories for a user."""
        if not user_id:
            return []

        try:
            memories = db.query(UserMemoryDB).filter(
                UserMemoryDB.user_id == user_id,
                UserMemoryDB.is_active == True
            ).all()
            return [m.fact for m in memories]
        except Exception as e:
            logger.error(f"Failed to fetch memories: {e}")
            return []

    @staticmethod
    def format_memories_for_prompt(user_id: int, db: Session) -> str:
        """Format memories as a block for LLM prompt."""
        facts = LongTermMemory.get_user_memories(user_id, db)
        if not facts:
            return ""

        parts = ["PERSONAL FACTS & PREFERENCES (Long-term Memory):"]
        for f in facts:
            parts.append(f"- {f}")

        return "\n".join(parts) + "\n\n"
