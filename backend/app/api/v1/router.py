from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.chat import router as chat_router
from app.api.v1.nutrition import router as nutrition_router
from app.api.v1.meal_plan import router as meal_plan_router
from app.api.v1.admin import router as admin_router
from app.api.v1.tracker import router as tracker_router
from app.api.v1.analysis import router as analysis_router
from app.api.v1.recipes import router as recipes_router
from app.api.v1.chat_sessions import router as chat_sessions_router
from app.api.v1.customer_profile import router as customer_profile_router
from app.api.v1.settings import router as settings_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(chat_router)
api_router.include_router(nutrition_router)
api_router.include_router(meal_plan_router)
api_router.include_router(admin_router)
api_router.include_router(tracker_router)
api_router.include_router(analysis_router)
api_router.include_router(recipes_router)
api_router.include_router(chat_sessions_router)
api_router.include_router(customer_profile_router)
api_router.include_router(settings_router)
