"""
AaharAI NutriSync — Cross-Encoder Reranker
Uses cross-encoder to rerank retrieved documents for better relevance.
"""
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Try to import cross-encoder
try:
    from sentence_transformers import CrossEncoder
    CROSS_ENCODER_AVAILABLE = True
except ImportError:
    CROSS_ENCODER_AVAILABLE = False
    logger.warning("sentence-transformers not installed. Skipping reranking.")


class CrossEncoderReranker:
    """Reranks documents using cross-encoder model."""
    
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model_name = model_name
        self._model = None
        
        if CROSS_ENCODER_AVAILABLE:
            try:
                self._model = CrossEncoder(model_name)
                logger.info(f"Reranker model loaded: {model_name}")
            except Exception as e:
                logger.warning(f"Could not load reranker model: {e}")
    
    def rerank(self, query: str, documents: List[str], top_k: int = 3) -> List[Dict[str, Any]]:
        """Rerank documents based on relevance to query.
        
        Args:
            query: The search query
            documents: List of document texts to rerank
            top_k: Number of top documents to return
            
        Returns:
            List of dicts with "text" and "score" keys
        """
        if not self._model or not documents:
            return [{"text": doc, "score": 0} for doc in documents[:top_k]]
        
        try:
            # Create query-document pairs
            pairs = [[query, doc] for doc in documents]
            
            # Get relevance scores
            scores = self._model.predict(pairs)
            
            # Sort by score
            ranked = sorted(
                zip(documents, scores),
                key=lambda x: x[1],
                reverse=True
            )
            
            return [
                {"text": doc, "score": float(score)}
                for doc, score in ranked[:top_k]
            ]
        except Exception as e:
            logger.warning(f"Reranking failed: {e}")
            return [{"text": doc, "score": 0} for doc in documents[:top_k]]
    
    def rerank_with_metadata(self, query: str, documents: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
        """Rerank documents that have metadata."""
        if not self._model or not documents:
            return documents[:top_k]
        
        try:
            texts = [doc.get("text", "") for doc in documents]
            pairs = [[query, text] for text in texts]
            
            scores = self._model.predict(pairs)
            
            # Add scores and sort
            for i, doc in enumerate(documents):
                doc["rerank_score"] = float(scores[i])
            
            documents.sort(key=lambda x: x.get("rerank_score", 0), reverse=True)
            
            return documents[:top_k]
        except Exception as e:
            logger.warning(f"Reranking failed: {e}")
            return documents[:top_k]


# Singleton instance
_reranker = None


def get_reranker() -> CrossEncoderReranker:
    """Get or create reranker singleton."""
    global _reranker
    if _reranker is None:
        _reranker = CrossEncoderReranker()
    return _reranker


def rerank_documents(query: str, documents: List[str], top_k: int = 3) -> List[Dict[str, Any]]:
    """Convenience function to rerank documents."""
    reranker = get_reranker()
    return reranker.rerank(query, documents, top_k)