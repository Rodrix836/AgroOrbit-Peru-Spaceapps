"""Registro central de rutas bajo /api."""

from fastapi import APIRouter

from app.api.routes import devices, plots, users

api_router = APIRouter(prefix="/api")
api_router.include_router(users.router)
api_router.include_router(plots.router)
api_router.include_router(devices.router)
api_router.include_router(devices.esp32_router)
