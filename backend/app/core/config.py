"""Configuración del backend leída desde variables de entorno o backend/.env."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    app_name: str = "AgroOrbit Perú API"
    app_version: str = "0.1.0"
    app_env: str = "development"
    debug: bool = False

    # Lista separada por comas; se lee como texto para no exigir JSON en .env.
    cors_origins: str = "http://localhost:5173"

    database_url: str | None = Field(default=None, repr=False)

    supabase_url: str | None = None
    supabase_jwt_secret: str | None = Field(default=None, repr=False)
    supabase_jwt_audience: str = "authenticated"

    model_config = SettingsConfigDict(
        env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
