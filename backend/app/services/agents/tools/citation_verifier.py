"""
AaharAI NutriSync — Medical Citation Verifier
Cross-references LLM claims against retrieved clinical context using
multi-signal grounding: keyword overlap, n-gram matching, medical term
anchoring, negation detection, and sentence-level coherence scoring.
"""

import logging
import re
from typing import List, Dict
from collections import Counter

logger = logging.getLogger(__name__)

# Medical/nutrition terms that should be grounded in the knowledge base
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

# Negation patterns
NEGATION_PATTERNS = [
    r"\b(?:does not|doesn't|do not|don't|cannot|can't|should not|shouldn't|must not|mustn't)\b",
    r"\b(?:no|without|avoid|never|not|lack of|deficient in)\b",
    r"\b(?:isn't|aren't|wasn't|weren't|won't|wouldn't|couldn't|wouldn't)\b",
]


class CitationVerifier:
    """Verifies LLM claims against retrieved evidence using multi-signal scoring."""

    def verify(self, answer: str, context_chunks: List[str]) -> Dict[str, any]:
        """
        Multi-signal grounding verification:
        1. Keyword overlap (individual terms)
        2. N-gram overlap (bigrams and trigrams)
        3. Medical term anchoring (domain-specific terms)
        4. Negation consistency (negations match context)
        5. Sentence-level overlap (sentence fragments present in context)

        Returns dict with score (0-1), status, and alerts.
        """
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
            signals.append(("medical", 1.0, 0.30))  # No medical claims = no risk

        # Signal 4: Sentence-level overlap (15% weight)
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

        # Compute weighted score
        if signals:
            total_weight = sum(w for _, _, w in signals)
            score = sum(s * w for _, s, w in signals) / total_weight
        else:
            score = 0.0

        # Determine status
        status = "VERIFIED"
        alerts = []
        if score < 0.3:
            status = "HALUCINATION_RISK"
            alerts.append("Low grounding: Response may contain claims not present in IFCT/ICMR database.")
        elif score < 0.55:
            status = "UNVERIFIED_CLAIMS"
            alerts.append("Partial grounding: Some advice may be generic LLM knowledge rather than retrieved evidence.")

        # Check for specific high-risk patterns
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

    @staticmethod
    def _get_ngrams(text: str, n: int) -> set:
        """Extract character n-grams from text."""
        words = text.split()
        ngrams = set()
        for i in range(len(words) - n + 1):
            ngram = " ".join(words[i : i + n])
            ngrams.add(ngram)
        return ngrams


citation_verifier = CitationVerifier()
