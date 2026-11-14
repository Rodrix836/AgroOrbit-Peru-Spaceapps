"""Errores de la API con formato JSON uniforme.

Toda respuesta de error tiene la forma:

    {"error": {"code": "not_found", "message": "...", "details": null}}

Nunca se devuelven trazas, cadenas de conexión ni los valores recibidos.
"""

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("agroorbit.api")

DEFAULT_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    422: "validation_error",
    500: "internal_error",
    502: "bad_gateway",
    503: "service_unavailable",
}

DEFAULT_MESSAGES = {
    400: "Solicitud inválida.",
    401: "No autenticado.",
    403: "Acceso denegado.",
    404: "Recurso no encontrado.",
    405: "Método no permitido.",
    409: "Conflicto con el estado actual del recurso.",
    422: "La solicitud no es válida.",
    500: "Error interno del servidor.",
    502: "Respuesta inválida del servicio externo.",
    503: "Servicio no disponible.",
}


class ApiError(Exception):
    """Error controlado con código estable para el frontend y el ESP32."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: Any = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details
        self.headers = headers


class NotFoundError(ApiError):
    def __init__(self, message: str = "Recurso no encontrado.", code: str = "not_found") -> None:
        super().__init__(404, code, message)


class UnauthorizedError(ApiError):
    def __init__(self, message: str = "No autenticado.", code: str = "unauthorized") -> None:
        super().__init__(401, code, message, headers={"WWW-Authenticate": "Bearer"})


class ForbiddenError(ApiError):
    def __init__(self, message: str = "Acceso denegado.", code: str = "forbidden") -> None:
        super().__init__(403, code, message)


class ConflictError(ApiError):
    def __init__(self, message: str, code: str = "conflict", details: Any = None) -> None:
        super().__init__(409, code, message, details)


class BadRequestError(ApiError):
    def __init__(self, message: str, code: str = "bad_request", details: Any = None) -> None:
        super().__init__(400, code, message, details)


class ServiceUnavailableError(ApiError):
    def __init__(self, message: str, code: str = "service_unavailable") -> None:
        super().__init__(503, code, message)


def error_body(status_code: int, message: str, code: str | None = None, details: Any = None) -> dict:
    return {"error": {
        "code": code or DEFAULT_CODES.get(status_code, "error"),
        "message": message,
        "details": details,
    }}


def _validation_details(exc: RequestValidationError) -> list[dict[str, str]]:
    # Se omite "input" para no reflejar valores enviados (por ejemplo claves).
    details = []
    for item in exc.errors():
        loc = [str(part) for part in item.get("loc", ())]
        details.append({
            "field": ".".join(loc),
            "message": str(item.get("msg", "")),
            "type": str(item.get("type", "")),
        })
    return details


async def _handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
    if exc.status_code >= 500:
        logger.error("%s %s -> %s", request.method, request.url.path, exc.code)
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(exc.status_code, exc.message, exc.code, exc.details),
        headers=exc.headers,
    )


async def _handle_http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    # Solo llegan aquí errores del framework (404 de ruta, 405...): mensaje genérico en español.
    code, message = None, DEFAULT_MESSAGES.get(exc.status_code, "Error.")
    if exc.status_code == 400:
        # FastAPI responde 400 cuando no puede decodificar el cuerpo (p. ej. "°C" no enviado en UTF-8).
        code, message = "invalid_body", "No se pudo leer el cuerpo: debe ser JSON codificado en UTF-8."
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(exc.status_code, message, code),
        headers=getattr(exc, "headers", None),
    )


async def _handle_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content=error_body(422, DEFAULT_MESSAGES[422], "validation_error", _validation_details(exc)),
    )


async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Error no controlado en %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content=error_body(500, DEFAULT_MESSAGES[500]))


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, _handle_api_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_error)
    app.add_exception_handler(RequestValidationError, _handle_validation_error)
    app.add_exception_handler(Exception, _handle_unexpected_error)
