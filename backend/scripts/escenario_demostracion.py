"""ESCENARIO DE DEMOSTRACIÓN reproducible de POST /api/recommendations, con datos SINTÉTICOS.

No es una recomendación agronómica. Ejecuta la ruta real de la API (TestClient), el servicio y el motor
reales sobre una base SQLite en memoria, con un JWT de prueba firmado localmente: no toca Supabase ni Render.

Como en la parcela real de Valle del Chira: coordenadas (-4.97, -80.89), agua `medium`, maíz como cultivo
anterior, frijol caupí como actual y siembra prevista el 2026-12-01 (ciclo planned).

SINTÉTICO (todo va declarado en `context.assumptions`, y la respuesta sale como `escenario_demostracion`):
- textura del suelo `franco`;
- requisitos de los tres cultivos que aún no tienen fuente, con fuentes `example.invalid`;
- puntuaciones por criterio y pesos por prioridad (las reglas de Milene aún no están);
- con `clima="sintetico"` (por defecto), el clima diario 2016-2026. Con `clima="nasa"` se descarga
  T2M y PRECTOTCORR reales de NASA POWER para el punto (necesita red) y el clima deja de ser supuesto.
"""

import math
from contextlib import contextmanager
from copy import deepcopy
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import Settings, get_settings
from app.data import crops as crops_module
from app.database.models import Base, Crop, NasaObservation
from app.database.session import get_db_session
from app.main import app
from app.schemas.recommendation import Assumption
from app.services import rotation_engine

CHIRA = {"name": "Parcela demostrativa – Valle del Chira (Sullana, Piura)", "latitude": -4.97, "longitude": -80.89}
JWT_SECRET = "escenario-demostracion-solo-local-0123456789"
HISTORY_START, HISTORY_END = date(2016, 1, 1), date(2026, 11, 15)

SYNTHETIC_SOURCE = {"title": "SYNTHETIC fuente de demostración (no agronómica)",
                    "url": "https://example.invalid/fuente-demostracion"}
SYNTHETIC_WEIGHTS = {
    "save_water": {"clima": 0.2, "agua": 0.5, "suelo": 0.15, "diversificacion": 0.15},
    "improve_soil": {"clima": 0.2, "agua": 0.15, "suelo": 0.5, "diversificacion": 0.15},
}
# Necesidad de agua relativa (más alta = necesita más) y aporte al suelo, por cultivo: SINTÉTICOS.
SYNTHETIC_WATER_NEED = {"maiz": 80, "frijol_caupi": 35, "camote": 50}
SYNTHETIC_SOIL_GAIN = {"maiz": 20, "frijol_caupi": 85, "camote": 45}
WATER_AVAILABLE = {"low": 30, "medium": 60, "high": 90}

ASSUMPTIONS = [
    Assumption(field="plot.soil_texture", value="franco",
               reason="Textura supuesta para la demostración: la parcela aún no la tiene registrada."),
    Assumption(field="crops.requirements", value="sintético",
               reason="Los requisitos de pH, salinidad, suelos y agua de los cultivos son de prueba, sin fuente real."),
    Assumption(field="engine.criteria", value="sintético",
               reason="Las puntuaciones por criterio y los pesos por prioridad son de prueba, no agronómicos."),
]
CLIMATE_ASSUMPTION = Assumption(
    field="climate.history", value="sintético",
    reason="El clima diario 2016-2026 es de prueba (estacional), no de NASA POWER.")


def synthetic_catalog() -> dict:
    """Catálogo real + requisitos SINTÉTICOS donde falta fuente, citados por una fuente de prueba."""
    catalog = deepcopy(crops_module.CULTIVOS)
    fill = {"agua_min_mm_campana": 250, "agua_max_mm_campana": 900, "soil_ph_min": 5.5, "soil_ph_max": 8.0,
            "soil_salinity_max_ds_m": 4.0, "soil_texture_accepted": ["franco", "franco arenoso"]}
    for crop in catalog.values():
        missing = [f for f in rotation_engine.REQUIRED_CROP_FIELDS
                   if not rotation_engine._sourced(crop, f)]
        crop.update({f: fill[f] for f in missing if f in fill})
        crop["fuentes"] = list(crop.get("fuentes", [])) + [
            {"titulo": SYNTHETIC_SOURCE["title"], "url": SYNTHETIC_SOURCE["url"], "campos": missing}]
    return catalog


def synthetic_evaluator(plot, request, candidates):
    """Puntuaciones SINTÉTICAS. Usan los datos reales que recibe el motor: clima de las fechas de cada
    campaña, agua y textura de la parcela, y cultivo actual del historial."""
    evaluations = {}
    for c in candidates:
        first, second = c["crops"]
        catalog = crops_module.obtener_cultivos()
        temps = [i["temperatura_promedio_c"] for i in c["climate_indicators"]]
        inside = [catalog[crop]["temperatura_min_c"] <= t <= catalog[crop]["temperatura_max_c"]
                  for crop, t in zip(c["crops"], temps)]
        clima = 50 + 25 * sum(inside)
        need = (SYNTHETIC_WATER_NEED[first] + SYNTHETIC_WATER_NEED[second]) / 2
        agua = max(0, min(100, 100 - need + WATER_AVAILABLE.get(c["water_availability"], 0) / 2))
        suelo = (SYNTHETIC_SOIL_GAIN[first] + SYNTHETIC_SOIL_GAIN[second]) / 2
        repeats = first == c["current_crop"]
        diversificacion = 40 if repeats else 80
        campaigns = "; ".join(
            f"{catalog[crop]['nombre']} {camp['starts_on']}–{camp['ends_on']}: {t} °C"
            for crop, camp, t in zip(c["crops"], c["campaigns"], temps))
        texts = {
            "clima": f"SYNTHETIC clima: temperatura media de las fechas de cada campaña en años anteriores ({campaigns}).",
            "agua": f"SYNTHETIC agua: necesidad de prueba frente al agua declarada en la parcela «{c['water_availability']}».",
            "suelo": f"SYNTHETIC suelo: aporte de prueba con textura «{c['soil_texture']}».",
            "diversificacion": (f"SYNTHETIC diversificación: la primera campaña {'repite' if repeats else 'no repite'} "
                                f"el cultivo actual ({c['current_crop']})."),
        }
        scores = {"clima": clima, "agua": round(agua, 1), "suelo": suelo, "diversificacion": diversificacion}
        evaluations[c["id"]] = {k: {"score": v, "reasons": [texts[k]],
                                    "limitations": [f"SYNTHETIC {k}: puntuación de demostración, no agronómica."],
                                    "sources": [SYNTHETIC_SOURCE]} for k, v in scores.items()}
    return {"mode": "escenario_demostracion", "assumptions": _active_assumptions,
            "priority_weights": SYNTHETIC_WEIGHTS, "evaluations": evaluations}


_active_assumptions: list[Assumption] = []


def synthetic_climate(day: date) -> tuple[float, float]:
    """Clima SINTÉTICO estacional (más cálido y lluvioso en febrero-marzo, como la costa norte)."""
    phase = 2 * math.pi * (day.timetuple().tm_yday - 70) / 365.25
    t2m = round(25.6 + 2.2 * math.cos(phase), 2)
    rain = round(max(0.0, 6.0 * math.cos(phase) - 3.0), 2)
    return t2m, rain


def _nasa_climate() -> dict[date, tuple[float | None, float | None]]:
    from app.services.nasa.normalization import normalizar_datos
    from app.services.nasa.power_client import obtener_datos_nasa

    data = obtener_datos_nasa(CHIRA["latitude"], CHIRA["longitude"],
                              HISTORY_START.strftime("%Y%m%d"), HISTORY_END.strftime("%Y%m%d"))
    if data is None:
        raise RuntimeError("NASA POWER no respondió.")
    return {date.fromisoformat(r["fecha"]): (r["temperatura_c"], r["precipitacion_mm_dia"])
            for r in normalizar_datos(data)}


@contextmanager
def _patched(catalog: dict):
    saved = (crops_module.CULTIVOS, rotation_engine.EVALUATION_PROVIDER)
    crops_module.CULTIVOS, rotation_engine.EVALUATION_PROVIDER = catalog, synthetic_evaluator
    try:
        yield
    finally:
        crops_module.CULTIVOS, rotation_engine.EVALUATION_PROVIDER = saved
        app.dependency_overrides.clear()


def run(priority: str = "save_water", start_on: str | None = None, clima: str = "sintetico") -> dict:
    """Ejecuta el escenario y devuelve {"request", "http_status", "response"} (sin token)."""
    global _active_assumptions
    climate = _nasa_climate() if clima == "nasa" else None
    _active_assumptions = ASSUMPTIONS + ([] if climate else [CLIMATE_ASSUMPTION])

    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    event.listen(engine, "connect", lambda conn, _: conn.execute("PRAGMA foreign_keys=ON"))
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        conn.execute(Crop.__table__.insert(), [{"code": c, "name": v["nombre"]} for c, v in crops_module.CULTIVOS.items()])
    sessions = sessionmaker(engine, expire_on_commit=False)

    def session_override():
        with sessions() as session:
            yield session

    app.dependency_overrides[get_db_session] = session_override
    app.dependency_overrides[get_settings] = lambda: Settings(
        _env_file=None, supabase_jwt_secret=JWT_SECRET, supabase_url=None)
    now = datetime.now(timezone.utc)
    token = jwt.encode({"sub": str(uuid4()), "aud": "authenticated", "role": "authenticated",
                        "iat": now, "exp": now + timedelta(minutes=10)}, JWT_SECRET, algorithm="HS256")
    headers = {"Authorization": f"Bearer {token}"}

    with _patched(synthetic_catalog()), TestClient(app) as client:
        client.post("/api/users/me", json={"display_name": "Escenario de demostración"}, headers=headers)
        plot = client.post("/api/plots", json={**CHIRA, "water_availability": "medium", "soil_texture": "franco"},
                           headers=headers).json()
        url = f"/api/plots/{plot['id']}/crop-cycles"
        for cycle in ({"status": "finished", "crop_code": "maiz"}, {"status": "active", "crop_code": "frijol_caupi"},
                      {"status": "planned", "sowing_date": "2026-12-01"}):
            client.post(url, json=cycle, headers=headers)
        with sessions() as session:
            day = HISTORY_START
            while day <= HISTORY_END:
                t2m, rain = climate.get(day, (None, None)) if climate else synthetic_climate(day)
                for variable, value, unit in (("T2M", t2m, "C"), ("PRECTOTCORR", rain, "mm/day")):
                    session.add(NasaObservation(plot_id=UUID(plot["id"]), variable=variable, observed_on=day,
                                                value=value, unit=unit, latitude=Decimal("-4.970000"),
                                                longitude=Decimal("-80.890000")))
                day += timedelta(days=1)
            session.commit()
        request = {"plot_id": plot["id"], "priority": priority}
        if start_on:
            request["start_on"] = start_on
        response = client.post("/api/recommendations", json=request, headers=headers)
        return {"request": request, "http_status": response.status_code, "response": response.json()}
