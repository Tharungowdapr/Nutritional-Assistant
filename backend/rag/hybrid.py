"""
AaharAI NutriSync — Hybrid Search Retriever
Combines BM25 (keyword) + Vector (semantic) search for better accuracy.
"""
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Try to import rank-bm25
try:
    from rank_bm25 import BM25Okapi
    BM25_AVAILABLE = True
except ImportError:
    BM25_AVAILABLE = False
    logger.warning("rank-bm25 not installed. Using vector-only search.")


class HybridRetriever:
    """Hybrid search combining BM25 + Vector search."""
    
    def __init__(self, chroma_client=None, collection_name: str = "nutrisync"):
        self.chroma_client = chroma_client
        self.collection_name = collection_name
        self._bm25 = None
        self._documents = []
        self._metadata = []
    
    def load_documents(self, documents: List[Dict[str, Any]]):
        """Load documents for BM25 search.
        
        Args:
            documents: List of dicts with "text" and optional "metadata" keys
        """
        self._documents = [doc.get("text", "") for doc in documents]
        self._metadata = [doc.get("metadata", {}) for doc in documents]
        
        # Build BM25 index
        if BM25_AVAILABLE and self._documents:
            tokenized = [doc.split() for doc in self._documents]
            self._bm25 = BM25Okapi(tokenized)
            logger.info(f"BM25 index built with {len(self._documents)} documents")
    
    def bm25_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """BM25 keyword search."""
        if not self._bm25 or not self._documents:
            return []
        
        tokenized_query = query.lower().split()
        scores = self._bm25.get_scores(tokenized_query)
        
        # Get top results
        results = []
        for i, score in enumerate(scores):
            if score > 0:
                results.append({
                    "text": self._documents[i],
                    "metadata": self._metadata[i],
                    "bm25_score": score,
                    "source": "bm25"
                })
        
        # Sort by score and return top_k
        results.sort(key=lambda x: x["bm25_score"], reverse=True)
        return results[:top_k]
    
    def vector_search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Vector (semantic) search using ChromaDB."""
        if not self.chroma_client:
            return []
        
        try:
            collection = self.chroma_client.get_or_create_collection(
                name=self.collection_name
            )
            
            import chromadb.utils.embedding_functions as ef
            from config import settings
            
            embed_fn = ef.OllamaEmbeddingFunction(
                url=settings.OLLAMA_BASE_URL + "/api/embeddings",
                model_name=settings.OLLAMA_EMBED_MODEL,
            )
            
            collection = self.chroma_client.get_or_create_collection(
                name=self.collection_name,
                embedding_function=embed_fn
            )
            
            results = collection.query(
                query_texts=[query],
                n_results=top_k,
                include=["documents", "metadatas", "distances"]
            )
            
            if not results or not results.get("documents"):
                return []
            
            output = []
            for i in range(len(results["documents"][0])):
                output.append({
                    "text": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                    "distance": results["distances"][0][i] if results.get("distances") else 0,
                    "source": "vector"
                })
            
            return output
        except Exception as e:
            logger.warning(f"Vector search failed: {e}")
            return []
    
    def hybrid_search(self, query: str, bm25_k: int = 5, vector_k: int = 5) -> List[Dict[str, Any]]:
        """Combined BM25 + Vector search with score fusion."""
        bm25_results = self.bm25_search(query, top_k=bm25_k)
        vector_results = self.vector_search(query, top_k=vector_k)
        
        # Deduplicate by text
        seen = set()
        combined = []
        
        # Interleave results (RRF - Reciprocal Rank Fusion)
        max_len = max(len(bm25_results), len(vector_results)) if (bm25_results or vector_results) else 0
        
        for i in range(max_len):
            if i < len(bm25_results) and bm25_results[i]["text"] not in seen:
                seen.add(bm25_results[i]["text"])
                combined.append(bm25_results[i])
            
            if i < len(vector_results) and vector_results[i]["text"] not in seen:
                seen.add(vector_results[i]["text"])
                combined.append(vector_results[i])
        
        return combined
    
    def get_documents_for_rerank(self, query: str, k: int = 8) -> List[str]:
        """Get documents ready for cross-encoder reranking."""
        results = self.hybrid_search(query, bm25_k=k, vector_k=k)
        return [r["text"] for r in results]


def create_hybrid_retriever(collection_name: str = "nutrisync") -> HybridRetriever:
    """Factory function to create hybrid retriever."""
    from config import settings
    
    chroma_client = None
    try:
        import chromadb
        chroma_client = chromadb.PersistentClient(
            path=str(settings.CHROMA_DB_PATH)
        )
    except Exception as e:
        logger.warning(f"Could not create ChromaDB client: {e}")
    
    return HybridRetriever(chroma_client, collection_name)