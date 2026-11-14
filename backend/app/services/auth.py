"""Validación del JWT de acceso emitido por Supabase Auth.

- Proyectos con secreto compartido (HS256): se usa SUPABASE_JWT_SECRET.
- Proyectos con claves asimétricas (ES256/RS256): se usa el JWKS público de
  SUPABASE_URL/auth/v1/.well-known/jwks.json (con caché).

El identificador del usuario sale siempre del token verificado (claim "sub"),
nunca de un campo enviado por el cliente.
"""

from dataclasses import dataclass
from functools import lru_cache
from uuid import UUID

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import Settings, get_settings
from app.core.exceptions import ServiceUnavailableError, UnauthorizedError

ASYMMETRIC_ALGORITHMS = ("ES256", "RS256")

bearer_scheme = HTTPBearer(auto_error=False, description="JWT de acceso de Supabase Auth")


@dataclass(frozen=True)
class AuthUser:
    id: UUID
    email: str | None = None


@lru_cache(maxsize=4)
def _jwks_client(supabase_url: str) -> jwt.PyJWKClient:
    url = supabase_url.rstrip("/") + "/auth/v1/.well-known/jwks.json"
    return jwt.PyJWKClient(url, cache_keys=True, lifespan=600, timeout=10)


def decode_access_token(token: str, settings: Settings) -> dict:
    """Verifica firma, expiración y audiencia; devuelve los claims."""
    try:
        algorithm = jwt.get_unverified_header(token).get("alg")
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Token de acceso inválido.", code="invalid_token") from exc

    if algorithm == "HS256":
        if not settings.supabase_jwt_secret:
            raise ServiceUnavailableError(
                "La validación de tokens no está configurada.", code="auth_not_configured",
            )
        key = settings.supabase_jwt_secret
    elif algorithm in ASYMMETRIC_ALGORITHMS:
        if not settings.supabase_url:
            raise ServiceUnavailableError(
                "La validación de tokens no está configurada.", code="auth_not_configured",
            )
        try:
            key = _jwks_client(settings.supabase_url).get_signing_key_from_jwt(token).key
        except jwt.PyJWKClientConnectionError as exc:
            raise ServiceUnavailableError(
                "No se pudo contactar con Supabase Auth.", code="auth_unavailable",
            ) from exc
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("Token de acceso inválido.", code="invalid_token") from exc
    else:
        raise UnauthorizedError("Token de acceso inválido.", code="invalid_token")

    try:
        return jwt.decode(
            token,
            key,
            algorithms=[algorithm],
            audience=settings.supabase_jwt_audience,
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise UnauthorizedError("El token de acceso expiró.", code="token_expired") from exc
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Token de acceso inválido.", code="invalid_token") from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthUser:
    """Dependencia FastAPI: exige Authorization: Bearer <token>."""
    if credentials is None or not credentials.credentials:
        raise UnauthorizedError("Se requiere un token de acceso.", code="missing_token")
    claims = decode_access_token(credentials.credentials, settings)
    try:
        user_id = UUID(str(claims["sub"]))
    except (KeyError, ValueError) as exc:
        raise UnauthorizedError("Token de acceso inválido.", code="invalid_token") from exc
    email = claims.get("email")
    return AuthUser(id=user_id, email=email if isinstance(email, str) else None)
