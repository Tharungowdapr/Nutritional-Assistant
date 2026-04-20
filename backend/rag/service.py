"""
AaharAI NutriSync — RAG Service
Orchestrates: user query → retrieve relevant chunks → augment prompt → generate response.
"""
import logging
from typing import Optional, List, Dict, Any
from datetime import datetime

import chromadb

from config import settings
from rag.llm_router import LLMRouter
from agent.tools.gap_analyzer import gap_analyzer
from engines.glp1_engine import glp1_engine
from agent.tools.citation_verifier import citation_verifier
from agent.tools.semantic_substitution import semantic_substitution

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
            # Fallback to default if Ollama fails
            try:
                return client.get_client().get_collection(name)
            except:
                return None

    def retrieve(self, query: str, top_k: int = None,
                 collection_name: str = "nutrisync",
                 source_filter: Optional[str] = None) -> list[dict]:
        """Retrieve relevant chunks from a specific ChromaDB collection."""
        collection = self._get_collection(collection_name)
        if collection is None:
            return []

        top_k = top_k or settings.RAG_TOP_K

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
                
                # IMP-015: Apply score threshold filter
                # ChromaDB cosine distance: lower = more similar
                # Convert threshold (0-1) to distance: distance <= (1.0 - threshold)
                if distance is not None:
                    similarity = 1.0 - distance
                    if similarity < settings.RAG_SCORE_THRESHOLD:
                        continue  # Skip low-confidence results
                
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

    def _build_user_context(self, user_profile: Optional[dict]) -> str:
        """Format user profile into context string."""
        if not user_profile:
            return ""

        # Phase 3: Add Digital Twin Context
        clinical_ctx = ""
        if user_profile and user_profile.get("medications"):
            # If user is on GLP-1, add pharmacokinetic context
            glp1_meds = [m for m in user_profile["medications"] if any(x in m.get("name", "") for x in ["Sema", "Lira", "Tirze"])]
            if glp1_meds:
                # Assuming simple dummy data for demo
                status = glp1_engine.simulate_state(glp1_meds[0]["name"], 0.5, datetime.now()) # simplified
                clinical_ctx += f"DIGITAL TWIN (GLP-1): {status['clinical_advice']}\n"
        
        # Add GAP analysis summary
        if user_profile and user_profile.get("id"):
            # Mocking intake logs for gap analysis
            logs = [{"iron_mg": 5.0, "vit_b12_mcg": 0.5}] # Mocked 
            targets = {"iron_mg": 18.0, "vit_b12_mcg": 2.4}
            analysis = gap_analyzer.analyze_gaps(logs, targets)
            clinical_ctx += f"NUTRIENT GAP: {analysis['summary']}\n"

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

    async def chat(self, query: str, user_profile: Optional[dict] = None, history: Optional[list] = None) -> dict:
        """Enhanced RAG pipeline with intent routing and tool use."""
        # 1. Classify intent
        intent = await self.classify_intent(query)
        logger.info(f"RAG Intent: {intent}")

        # 2. Route retrieval based on intent
        collection_map = {
            "FOOD_SEARCH": "nutrisync_foods",
            "CLINICAL_ADVICE": "nutrisync_clinical",
            "GENERAL_CHAT": "nutrisync"
        }
        col_name = collection_map.get(intent, "nutrisync")
        chunks = self.retrieve(query, collection_name=col_name)

        # 2. Build augmented prompt
        context = self._build_context(chunks)
        user_ctx = self._build_user_context(user_profile)
        
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
        collection_map = {
            "FOOD_SEARCH": "nutrisync_foods",
            "CLINICAL_ADVICE": "nutrisync_clinical",
            "GENERAL_CHAT": "nutrisync"
        }
        col_name = collection_map.get(intent, "nutrisync")
        chunks = self.retrieve(query, collection_name=col_name)
        context = self._build_context(chunks)
        user_ctx = self._build_user_context(user_profile)

        source_prompt = "RETRIEVED KNOWLEDGE (" + ("IFCT 2017" if intent == "FOOD_SEARCH" else "Medical Guidelines") + "):"
        
        prompt = f"""{user_ctx}

{source_prompt}
{context}

USER QUESTION:
{query}

Provide a concise, evidence-based answer. Respond token-by-token."""

        full_answer = ""
        async for token in self.llm_router.stream_generate(prompt, SYSTEM_PROMPT):
            full_answer += token
            yield token
        
        # Post-generation: Verification & Swaps (appended to stream)
        v_result = citation_verifier.verify(full_answer, chunks)
        if v_result["status"] != "VERIFIED":
            yield f"\n\n> [!CAUTION]\n> {v_result['alerts'][0]}"
        
        # Auto-suggestion for unhealthy items mentioned
        unhealthy_items = ["white rice", "maida", "potato"]
        for item in unhealthy_items:
            if item in query.lower() or item in full_answer.lower():
                swaps = semantic_substitution.suggest(item)
                if swaps:
                    yield f"\n\n**NutriSync Swap Suggestion:** Try **{swaps[0]['name']}** instead of {item}. *Reason: {swaps[0]['reason']}*"
                    break

    @property
    def is_ready(self) -> bool:
        """Check if ChromaDB collection exists and has documents."""
        try:
            collection = self._get_collection()
            return collection is not None and collection.count() > 0
        except Exception:
            return False
