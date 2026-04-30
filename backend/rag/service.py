"""
AaharAI NutriSync — RAG Service
Orchestrates: user query → hybrid search → rerank → augment prompt → generate response.
"""
import logging
from typing import Optional

import chromadb

from config import settings
from rag.llm_router import LLMRouter
from rag.hybrid import create_hybrid_retriever
from rag.reranker import rerank_documents

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
8. Always provide the nutritional rationale behind your recommendations
9. Format your response with clear sections using markdown headers and bullet points"""


class RAGService:
    """RAG pipeline: retrieve → augment → generate."""

    def __init__(self, llm_router: LLMRouter):
        self.llm_router = llm_router
        self._collection = None

    def _get_client(self):
        try:
            return chromadb.PersistentClient(path=str(settings.CHROMA_DB_PATH))
        except Exception:
            return None

    def _get_collection(self, name="nutrisync"):
        """Lazy-load ChromaDB collection with configured embedding function."""
        try:
            client = self._get_client()
            if not client: return None
            
            # IMP-003: Explicitly provide the embedding function for retrieval consistency
            import chromadb.utils.embedding_functions as ef
            embed_fn = ef.OllamaEmbeddingFunction(
                url=settings.OLLAMA_BASE_URL + "/api/embeddings",
                model_name=settings.OLLAMA_EMBED_MODEL,
            )
            
            return client.get_collection(name, embedding_function=embed_fn)
        except Exception as e:
            logger.warning(f"ChromaDB collection {name} not found or embedding mismatch: {e}")
            # Fallback to default embeddings if Ollama fails
            try:
                client2 = self._get_client()
                if client2:
                    return client2.get_collection(name)
            except:
                pass
            return None

    def retrieve(self, query: str, top_k: int = None,
                 collection_name: str = "nutrisync",
                 source_filter: Optional[str] = None) -> list[dict]:
        """Retrieve relevant chunks using hybrid search + reranking."""
        top_k = top_k or settings.RAG_TOP_K
        
        # Try hybrid search + reranking first
        try:
            hybrid = create_hybrid_retriever(collection_name)
            candidates = hybrid.get_documents_for_rerank(query, k=8)
            
            if candidates:
                reranked = rerank_documents(query, candidates, top_k=top_k)
                texts = [r["text"] for r in reranked]
                
                chunks = []
                for i, text in enumerate(texts):
                    chunks.append({
                        "text": text,
                        "metadata": {"rank": i + 1, "source": "hybrid"},
                        "rerank_score": reranked[i].get("score", 0)
                    })
                
                return chunks
        except Exception as e:
            logger.warning(f"Hybrid search failed, falling back to vector: {e}")
        
        # Fallback to vector-only
        collection = self._get_collection(collection_name)
        if collection is None:
            return []

        where = None
        if source_filter:
            where = {"source": source_filter}

        try:
            results = collection.query(
                query_texts=[query],
                n_results=top_k,
                where=where,
            )
        except Exception as e:
            logger.error(f"ChromaDB query failed: {e}")
            return []

        chunks = []
        if results and results["documents"] and results["documents"][0]:
            for i in range(len(results["documents"][0])):
                distance = results["distances"][0][i] if results.get("distances") else None
                
                if distance is not None:
                    similarity = 1.0 - distance
                    if similarity < settings.RAG_SCORE_THRESHOLD:
                        continue
                
                chunks.append({
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                    "distance": distance,
                })

        return chunks

    def _build_context(self, chunks: list[dict]) -> str:
        """Format retrieved chunks into a context string."""
        if not chunks:
            return "No relevant data found in the knowledge base."

        context_parts = []
        for i, chunk in enumerate(chunks):
            meta = chunk.get("metadata", {})
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

    def _build_user_context(self, user_profile: Optional[dict], user_id: int = None) -> str:
        """Format user profile and meal memory into context string."""
        if not user_profile and not user_id:
            return ""

        # Import memory functions
        try:
            from memory.user_memory import format_user_profile
            from memory.meal_memory import format_recent_meals
        except ImportError:
            pass

        parts = []

        # Add user profile
        if user_profile:
            profile_text = format_user_profile(user_profile) if 'format_user_profile' in dir() else self._format_profile(user_profile)
            parts.append(profile_text)

        # Add meal memory (last 3 days)
        if user_id:
            try:
                meal_text = format_recent_meals(user_id, days=3)
                if meal_text:
                    parts.append(f"\n{meal_text}")
            except Exception as e:
                logger.debug(f"Could not load meal memory: {e}")

        return "\n\n".join(parts) if parts else ""

    def _format_profile(self, user_profile: dict) -> str:
        """Fallback profile formatter."""
        parts = ["USER PROFILE:"]
        field_map = {
            "life_stage": "Life stage",
            "sex": "Sex",
            "diet_type": "Diet",
            "region_zone": "Region",
            "profession": "Profession",
            "glp1_medication": "GLP-1 Medication",
            "glp1_phase": "GLP-1 Phase",
        }
        for key, label in field_map.items():
            if user_profile.get(key):
                parts.append(f"  {label}: {user_profile[key]}")

        if user_profile.get("conditions"):
            parts.append(f"  Conditions: {', '.join(user_profile['conditions'])}")
        
        return "\n".join(parts)

    async def classify_intent(self, query: str) -> str:
        """Classify user query into: FOOD_SEARCH, CLINICAL_ADVICE, GENERAL_CHAT."""
        prompt = f"""Classify the intent of this query: "{query}"
        
        Options:
        - FOOD_SEARCH: Query about specific food nutrients, calories, or comparisons.
        - CLINICAL_ADVICE: Query about health conditions (Diabetes, PCOS, etc.) or GLP-1.
        - GENERAL_CHAT: Greetings, general talk, or non-nutritional queries.
        
        Reply with only the option name."""
        
        intent, _ = await self.llm_router.generate(prompt, "You are an Intent Classifier.", temperature=0)
        intent = intent.strip().upper()
        if "FOOD_SEARCH" in intent: return "FOOD_SEARCH"
        if "CLINICAL_ADVICE" in intent: return "CLINICAL_ADVICE"
        return "GENERAL_CHAT"

    async def chat(self, query: str, user_profile: Optional[dict] = None, history: Optional[list] = None, user_id: int = None) -> dict:
        """Enhanced RAG pipeline with intent routing and tool use."""
        # 1. Classify intent
        intent = await self.classify_intent(query)
        logger.info(f"RAG Intent: {intent}")

        # 2. Route retrieval based on intent
        # All data is in the single "nutrisync" collection created by ingestion.
        # Intent is used for prompt routing, not collection routing.
        chunks = self.retrieve(query, collection_name="nutrisync")

        # 2. Build augmented prompt
        context = self._build_context(chunks)
        user_ctx = self._build_user_context(user_profile, user_id)
        
        # Format chat history
        history_str = ""
        if history:
            history_parts = ["CONVERSATION HISTORY:"]
            for h in history[-5:]: # Last 5 turns for context
                history_parts.append(f"USER: {h.get('user_message')}\nASSISTANT: {h.get('assistant_message')}")
            history_str = "\n".join(history_parts) + "\n\n"

        prompt = f"""{user_ctx}

{history_str}RETRIEVED KNOWLEDGE (from IFCT 2017 database + ICMR-NIN 2024 RDA):
{context}

USER QUESTION:
{query}

Please provide a detailed, evidence-based answer using the retrieved knowledge above. Cite sources. If the user is following up on a previous question, use the conversation history context."""

        # 3. Generate response
        response_text, provider = await self.llm_router.generate(
            prompt=prompt,
            system=SYSTEM_PROMPT,
            temperature=0.7,
        )

        # If no LLM provider was available, provide a safe fallback using retrieved
        # context so the API remains useful even without a working local LLM.
        if provider == "none" or (isinstance(response_text, str) and "no LLM provider" in response_text):
            fallback = "**LLM unavailable — retrieved knowledge:**\n\n"
            if chunks:
                for i, c in enumerate(chunks[:5]):
                    meta = c.get("metadata", {})
                    src = meta.get("source", "unknown")
                    ident = meta.get("identifier", "")
                    header = f"- Source {i+1}: {src}"
                    if ident:
                        header += f" ({ident})"
                    fallback += f"{header}\n{c.get('text','')}\n\n"
            else:
                fallback += "No knowledge-base results available."
            response_text = fallback

        # 4. Format sources
        sources = [
            {
                "source": c.get("metadata", {}).get("source", "unknown"),
                "identifier": c.get("metadata", {}).get("identifier", ""),
                "page": c.get("metadata", {}).get("page_number", None),
                "sheet": c.get("metadata", {}).get("sheet", None),
            }
            for c in chunks
        ]

        return {
            "answer": response_text,
            "sources": sources,
            "llm_provider": provider,
        }

    async def chat_stream(self, query: str, user_profile: Optional[dict] = None):
        """Streaming RAG pipeline."""
        intent = await self.classify_intent(query)
        chunks = self.retrieve(query, collection_name="nutrisync")
        context = self._build_context(chunks)
        user_ctx = self._build_user_context(user_profile)

        source_prompt = "RETRIEVED KNOWLEDGE (" + ("IFCT 2017" if intent == "FOOD_SEARCH" else "Medical Guidelines") + "):"
        
        prompt = f"""{user_ctx}

{source_prompt}
{context}

USER QUESTION:
{query}

Provide a concise, evidence-based answer. Respond token-by-token."""

        async for token in self.llm_router.stream_generate(prompt, SYSTEM_PROMPT):
            yield token

    @property
    def is_ready(self) -> bool:
        """Check if ChromaDB collection exists and has documents."""
        try:
            collection = self._get_collection()
            return collection is not None and collection.count() > 0
        except Exception:
            return False
