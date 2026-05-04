"""
AaharAI NutriSync — Long-term Memory Service
Handles "remember this" requests by persisting facts to the database.
"""
import logging
import re
from typing import Optional, List
from sqlalchemy.orm import Session

from app.models.user import UserMemoryDB

logger = logging.getLogger(__name__)

class LongTermMemory:
    """Service to manage persistent user facts."""

    @staticmethod
    def extract_and_save_fact(user_id: int, message: str, db: Session) -> Optional[str]:
        """
        Detects if user wants to remember something and saves it.
        Example: "Remember that I'm allergic to peanuts" -> Saves "Allergic to peanuts"
        """
        if not user_id or not message:
            return None
            
        message_lc = message.lower().strip()
        
        # Simple heuristic for "remember this"
        trigger = None
        if message_lc.startswith("remember that "):
            trigger = "remember that "
        elif message_lc.startswith("remember "):
            trigger = "remember "
        elif "remember this:" in message_lc:
            trigger = "remember this:"
            
        if not trigger:
            return None
            
        fact = message[message_lc.find(trigger) + len(trigger):].strip()
        if not fact:
            return None
            
        # Clean up punctuation at the end
        fact = re.sub(r'[.!?;]+$', '', fact)
        
        try:
            # Check if this fact already exists to avoid duplicates
            existing = db.query(UserMemoryDB).filter(
                UserMemoryDB.user_id == user_id,
                UserMemoryDB.fact == fact,
                UserMemoryDB.is_active == True
            ).first()
            
            if not existing:
                new_memory = UserMemoryDB(user_id=user_id, fact=fact)
                db.add(new_memory)
                db.commit()
                logger.info(f"🧠 Memory saved for user {user_id}: {fact}")
                return fact
        except Exception as e:
            logger.error(f"Failed to save long-term memory: {e}")
            db.rollback()
            
        return None

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
