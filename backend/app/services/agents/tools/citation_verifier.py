"""
AaharAI NutriSync — Medical Citation Verifier
Cross-references LLM claims against retrieved clinical context using
multi-signal grounding: keyword overlap, n-gram matching, medical term
anchoring, semantic NLI (cross-encoder), negation detection, and
sentence-level coherence scoring.
"""

import logging
import re
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

MEDICAL_ANCHORS = {
    "diabetes",
    "insulin",
    "glucose",
    "glycemic",
    "hba1c",
    "hypoglycemia",
    "pcos",
    "polycystic",
    "anaemia",
    "anemia",
    "iron",
    "ferritin",
    "haemoglobin",
    "b12",
    "cobalamin",
    "folate",
    "folic acid",
    "vitamin d",
    "calcium",
    "protein",
    "calorie",
    "calories",
    "bmi",
    "bmr",
    "tdee",
    "rda",
    "glp-1",
    "semaglutide",
    "liraglutide",
    "obesity",
    "cholesterol",
    "triglyceride",
    "hdl",
    "ldl",
    "hypertension",
    "pregnancy",
    "pregnant",
    "lactation",
    "trimester",
    "ifct",
    "icmr",
    "nin",
    "millet",
    "ragi",
    "jowar",
    "bajra",
    "quinoa",
    "dal",
    "lentil",
    "chickpea",
    "paneer",
    "ghee",
    "katori",
    "roti",
    "chapati",
    "idli",
    "dosa",
}

NEGATION_PATTERNS = [
    r"\b(?:does not|doesn't|do not|don't|cannot|can't|should not|shouldn't|must not|mustn't)\b",
    r"\b(?:no|without|avoid|never|not|lack of|deficient in)\b",
    r"\b(?:isn't|aren't|wasn't|weren't|won't|wouldn't|couldn't|wouldn't)\b",
]

_CROSS_ENCODER = None


def _get_cross_encoder():
    """Lazy-load cross-encoder for NLI scoring."""
    global _CROSS_ENCODER
    if _CROSS_ENCODER is None:
        try:
            from sentence_transformers import CrossEncoder

            _CROSS_ENCODER = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
            logger.info("Citation verifier: cross-encoder loaded")
        except Exception as e:
            logger.warning(f"Citation verifier: cross-encoder unavailable ({e})")
    return _CROSS_ENCODER


class CitationVerifier:
    """Verifies LLM claims against retrieved evidence using multi-signal scoring."""

    def verify(self, answer: str, context_chunks: List[str]) -> Dict[str, any]:
        if not context_chunks:
            return {"score": 0.0, "status": "NO_CONTEXT", "alerts": ["No clinical evidence found."]}

        context_blob = " ".join(context_chunks).lower()
        context_words = set(context_blob.split())
        answer_lower = answer.lower()
        signals = []

        # Signal 1: Keyword overlap (30% weight)
        answer_words = set(answer_lower.split())
        important_words = {w for w in answer_words if len(w) > 4 and w.isalpha()}
        if important_words:
            kw_hits = sum(1 for w in important_words if w in context_words)
            kw_score = kw_hits / len(important_words)
            signals.append(("keyword", kw_score, 0.30))

        # Signal 2: N-gram overlap (25% weight)
        answer_ngrams = self._get_ngrams(answer_lower, 2) | self._get_ngrams(answer_lower, 3)
        context_ngrams = self._get_ngrams(context_blob, 2) | self._get_ngrams(context_blob, 3)
        if answer_ngrams:
            ng_hits = len(answer_ngrams & context_ngrams)
            ng_score = ng_hits / len(answer_ngrams)
            signals.append(("ngram", ng_score, 0.25))

        # Signal 3: Medical term anchoring (30% weight)
        answer_medical = {t for t in MEDICAL_ANCHORS if t in answer_lower}
        context_medical = {t for t in MEDICAL_ANCHORS if t in context_blob}
        if answer_medical:
            med_hits = len(answer_medical & context_medical)
            med_score = med_hits / len(answer_medical)
            signals.append(("medical", med_score, 0.30))
        else:
            signals.append(("medical", 1.0, 0.30))

        # Signal 4: Cross-encoder semantic NLI (bonus/penalty modifier)
        ce_score = self._compute_cross_encoder_score(answer, context_chunks)
        # Cross-encoder acts as a confidence modifier rather than fixed weight
        ce_modifier = (ce_score - 0.5) * 0.2  # Range: -0.1 to +0.1

        # Signal 5: Sentence-level overlap (15% weight)
        answer_sentences = [s.strip() for s in re.split(r"[.!?]", answer) if len(s.strip()) > 15]
        if answer_sentences:
            sent_hits = 0
            for sent in answer_sentences:
                sent_words = set(sent.lower().split())
                if len(sent_words) >= 3:
                    overlap = len(sent_words & context_words) / len(sent_words)
                    if overlap > 0.4:
                        sent_hits += 1
            sent_score = sent_hits / len(answer_sentences) if answer_sentences else 0
            signals.append(("sentence", sent_score, 0.15))

        # Apply cross-encoder modifier
        if signals:
            total_weight = sum(w for _, _, w in signals)
            score = sum(s * w for _, s, w in signals) / total_weight
            score = max(0.0, min(1.0, score + ce_modifier))  # Clamp to [0,1]
        else:
            score = 0.0

        status = "VERIFIED"
        alerts = []
        if score < 0.3:
            status = "HALUCINATION_RISK"
            alerts.append("Low grounding: Response may contain claims not present in IFCT/ICMR database.")
        elif score < 0.55:
            status = "UNVERIFIED_CLAIMS"
            alerts.append("Partial grounding: Some advice may be generic LLM knowledge rather than retrieved evidence.")

        # Negation check — bonus/penalty modifier
        answer_has_negation = any(re.search(p, answer_lower) for p in NEGATION_PATTERNS)
        context_has_negation = any(re.search(p, context_blob) for p in NEGATION_PATTERNS)
        if answer_has_negation and not context_has_negation:
            score -= 0.1  # Penalty for negation in answer not supported by context
        elif answer_has_negation and context_has_negation:
            score += 0.05  # Bonus for consistent negation
        score = max(0.0, min(1.0, score))

        if answer_medical and not context_medical:
            status = "HALUCINATION_RISK"
            alerts.append(
                f"Medical terms ({', '.join(list(answer_medical)[:3])}) mentioned but not found in retrieved context."
            )
        elif answer_medical - context_medical:
            ungrounded = answer_medical - context_medical
            if len(ungrounded) >= 2:
                alerts.append(f"Terms {', '.join(list(ungrounded)[:3])} mentioned without direct context support.")

        return {
            "score": round(score, 3),
            "status": status,
            "alerts": alerts,
            "signals": {name: round(s, 3) for name, s, _ in signals},
        }

    def _compute_cross_encoder_score(self, answer: str, context_chunks: List[str]) -> float:
        """Use cross-encoder to score semantic relevance between answer and context."""
        ce = _get_cross_encoder()
        if ce is None:
            return 0.5  # neutral fallback
        try:
            pairs = [[answer[:512], c[:512]] for c in context_chunks if c.strip()]
            if not pairs:
                return 0.0
            scores = ce.predict(pairs)
            return float(max(scores)) if len(scores) > 0 else 0.0
        except Exception as e:
            logger.debug(f"Cross-encoder scoring failed: {e}")
            return 0.5

    @staticmethod
    def _get_ngrams(text: str, n: int) -> set:
        words = text.split()
        ngrams = set()
        for i in range(len(words) - n + 1):
            ngrams.add(" ".join(words[i : i + n]))
        return ngrams


citation_verifier = CitationVerifier()
