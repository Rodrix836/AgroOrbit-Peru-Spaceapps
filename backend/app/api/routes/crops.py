"""Catálogo de cultivos (app/data/crops.py, de Milene) para los selectores del frontend."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.data.crops import obtener_cultivos

router = APIRouter(prefix="/crops", tags=["Cultivos"])


class CropRead(BaseModel):
    """Igual que Crop de frontend/src/types/api.ts."""

    id: str
    name: str


@router.get("", response_model=list[CropRead])
def list_crops() -> list[CropRead]:
    """Lista pública (sin token): solo id y nombre. Los requisitos agronómicos no se exponen aquí."""
    return [CropRead(id=crop_id, name=data["nombre"]) for crop_id, data in obtener_cultivos().items()]
