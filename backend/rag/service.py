"""
AaharAI NutriSync — RAG Service
Orchestrates: user query → retrieve relevant chunks → augment prompt → generate response.
"""
import logging
from typing import Optional

import chromadb

from config import settings
from rag.llm_router import LLMRouter

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are AaharAI NutriSync, an expert Indian nutrition assistant powered by the IFCT 2017 
(Indian Food Composition Tables) database and ICMR-NIN 2024 RDA guidelines.

Rules:
1. Always cite your sources (e.g., "According to IFCT 2017..." or "As per ICMR-NIN 2024 RDA...")
2. Use Indian food names and portion sizes (katori, cup, tablespoon)
3. Provide nutrient values per 100g or per standard Indian portion
4. When recommending foods, consider the user's diet type (VEG/NON-VEG), region, and health conditions
5. For GLP-1 users, always enforce protein floors and nausea-safe food recommendations
6. Flag supplement needs when dietary sources alone cannot meet RDA (especially B12 for vegetarians)
7. Be specific with quantities — say "1 katori (150g) cooked ragi" not just "eat ragi"
8. Always provide the nutritional rationale behind your recommendations"""


class RAGService:
    """RAG pipeline: retrieve → augment → generate."""

    def __init__(self, llm_router: LLMRouter):
        self.llm_router = llm_router
        self._collection = None

    def _get_collection(self):
        """Lazy-load ChromaDB collection."""
        if self._collection is None:
            client = chromadb.PersistentClient(path=str(settings.CHROMA_DB_PATH))
            self._collection = client.get_collection("nutrisync")
        return self._collection

    def retrieve(self, query: str, top_k: int = None,
                 source_filter: Optional[str] = None) -> list[dict]:
        """Retrieve relevant chunks from ChromaDB."""
        collection = self._get_collection()
        top_k = top_k or settings.RAG_TOP_K

        # Build where filter
        where = None
        if source_filter:
            where = {"source": source_filter}

        results = collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where,
        )

        chunks = []
        for i in range(len(results["documents"][0])):
            chunks.append({
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i],
                "distance": results["distances"][0][i] if results.get("distances") else None,
            })

        return chunks

    def _build_context(self, chunks: list[dict]) -> str:
        """Format retrieved chunks into a context string."""
        context_parts = []
        for i, chunk in enumerate(chunks):
            meta = chunk["metadata"]
            source = meta.get("source", "unknown")
            identifier = meta.get("identifier", "")
            page = meta.get("page_number", "")

            header = f"[Source {i + 1}: {source}"
            if identifier:
                header += f" — {identifier}"
            if page:
                header += f" (page {page})"
            header += "]"

            context_parts.append(f"{header}\n{chunk['text']}")

        return "\n\n---\n\n".join(context_parts)

    def _build_user_context(self, user_profile: Optional[dict]) -> str:
        """Format user profile into context string."""
        if not user_profile:
            return ""

        parts = ["USER PROFILE:"]
        if user_profile.get("life_stage"):
            parts.append(f"  Life stage: {user_profile['life_stage']}")
        if user_profile.get("sex"):
            parts.append(f"  Sex: {user_profile['sex']}")
        if user_profile.get("diet_type"):
            parts.append(f"  Diet: {user_profile['diet_type']}")
        if user_profile.get("conditions"):
            parts.append(f"  Conditions: {', '.join(user_profile['conditions'])}")
        if user_profile.get("glp1_medication"):
            parts.append(f"  GLP-1: {user_profile['glp1_medication']} ({user_profile.get('glp1_phase', '')})")
        if user_profile.get("region_zone"):
            parts.append(f"  Region: {user_profile['region_zone']} {user_profile.get('region_state', '')}")
        if user_profile.get("energy_score"):
            parts.append(f"  Energy: {user_profile['energy_score']}/5 | Sleep: {user_profile.get('sleep_hours', '?')}h | Focus: {user_profile.get('focus_score', '?')}/5")

        return "\n".join(parts)

    async def chat(self, query: str, user_profile: Optional[dict] = None) -> dict:
        """Full RAG pipeline: retrieve → augment → generate."""
        # 1. Retrieve relevant chunks
        chunks = self.retrieve(query)

        # 2. Build augmented prompt
        context = self._build_context(chunks)
        user_ctx = self._build_user_context(user_profile)

        prompt = f"""{user_ctx}

RETRIEVED KNOWLEDGE (from IFCT 2017 database + ICMR-NIN 2024 RDA):
{context}

USER QUESTION:
{query}

Please provide a detailed, evidence-based answer using the retrieved knowledge above. Cite sources."""

        # 3. Generate response
        response_text, provider = await self.llm_router.generate(
            prompt=prompt,
            system=SYSTEM_PROMPT,
            temperature=0.7,
        )

        # 4. Format sources
        sources = [
            {
                "source": c["metadata"].get("source", "unknown"),
                "identifier": c["metadata"].get("identifier", ""),
                "page": c["metadata"].get("page_number", None),
                "sheet": c["metadata"].get("sheet", None),
            }
            for c in chunks
        ]

        return {
            "answer": response_text,
            "sources": sources,
            "llm_provider": provider,
        }

    @property
    def is_ready(self) -> bool:
        """Check if ChromaDB collection exists and has documents."""
        try:
            collection = self._get_collection()
            return collection.count() > 0
        except Exception:
            return False
