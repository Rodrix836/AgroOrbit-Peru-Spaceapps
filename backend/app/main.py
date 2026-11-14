"""Punto de entrada de la API de AgroOrbit Perú."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers

settings = get_settings()
logging.basicConfig(level=logging.DEBUG if settings.debug else logging.INFO)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="API de AgroOrbit Perú: parcelas, dispositivos ESP32 y lecturas de suelo.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Device-Key"],
)

register_exception_handlers(app)
app.include_router(api_router)


@app.get("/health", tags=["Estado"])
def health() -> dict[str, str]:
    return {"status": "ok", "version": settings.app_version}
