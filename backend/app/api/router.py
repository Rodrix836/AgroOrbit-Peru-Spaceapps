"""Registro central de rutas bajo /api."""

from fastapi import APIRouter

from app.api.routes import crop_cycles, crops, devices, nasa, plots, recommendations, users

api_router = APIRouter(prefix="/api")
api_router.include_router(users.router)
api_router.include_router(crops.router)
api_router.include_router(plots.router)
api_router.include_router(nasa.router)
api_router.include_router(crop_cycles.router)
api_router.include_router(recommendations.router)
api_router.include_router(devices.router)
api_router.include_router(devices.esp32_router)
