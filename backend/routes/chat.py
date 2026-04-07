"""
AaharAI NutriSync — API Routes: Chat (RAG)
"""
from fastapi import APIRouter, Depends
from database.models import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["Chat"])


@router.post("", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """RAG-powered chat with nutrition knowledge base."""
    from main import get_rag_service
    rag_service = get_rag_service()

    user_profile = request.user_profile.model_dump() if request.user_profile else None
    result = await rag_service.chat(request.message, user_profile)

    return ChatResponse(
        answer=result["answer"],
        sources=result["sources"],
        llm_provider=result["llm_provider"],
    )
