"""Importación de NASA POWER a nasa_observation y lectura para el frontend (SQLite, sin red)."""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID, uuid4

from sqlalchemy import func, select

from test_plots import assert_error

from app.database.models import NasaObservation, Plot

FILL = -999.0


def power_payload(start: str, end: str, t2m=None, prec=None, fill=FILL):
    """Respuesta mínima de POWER diario. t2m/prec: dict AAAAMMDD -> valor (por defecto 26.0 / 1.5)."""
    days, day = [], datetime.strptime(start, "%Y%m%d").date()
    while day <= datetime.strptime(end, "%Y%m%d").date():
        days.append(day.strftime("%Y%m%d"))
        day += timedelta(days=1)
    t2m, prec = t2m or {}, prec or {}
    return {
        "header": {"fill_value": fill, "sources": ["GEOSIT"]},
        "parameters": {"T2M": {"units": "C"}, "PRECTOTCORR": {"units": "mm/day"}},
        "properties": {"parameter": {
            "T2M": {d: t2m.get(d, 26.0) for d in days},
            "PRECTOTCORR": {d: prec.get(d, 1.5) for d in days},
        }},
    }


def fake_power(monkeypatch, **overrides):
    """Sustituye la llamada a POWER; registra las coordenadas y fechas pedidas."""
    calls = []

    def _fake(latitud, longitud, fecha_inicio, fecha_fin):
        calls.append((latitud, longitud, fecha_inicio, fecha_fin))
        return power_payload(fecha_inicio, fecha_fin, **overrides)

    monkeypatch.setattr("app.services.nasa.persistence.obtener_datos_nasa", _fake)
    return calls


def power_url(plot_id):
    return f"/api/plots/{plot_id}/nasa/power"


def obs_url(plot_id):
    return f"/api/plots/{plot_id}/nasa/observations"


def stored(db, plot_id):
    return db.scalar(select(func.count()).select_from(NasaObservation)
                     .where(NasaObservation.plot_id == UUID(plot_id)))


def test_import_default_last_90_days_and_frontend_shape(client, owner_headers, test_plot, monkeypatch):
    calls = fake_power(monkeypatch)
    response = client.post(power_url(test_plot["id"]), json={}, headers=owner_headers)
    assert response.status_code == 200, response.text
    body = response.json()

    today = datetime.now(timezone.utc).date()
    assert (body["start"], body["end"]) == ((today - timedelta(days=89)).isoformat(), today.isoformat())
    assert calls == [(-4.9, -80.7, (today - timedelta(days=89)).strftime("%Y%m%d"), today.strftime("%Y%m%d"))]
    assert (body["dias"], body["filas_guardadas"], body["valores_faltantes"]) == (90, 180, 0)
    assert body["source"] == "NASA POWER" and body["time_standard"] == "LST"
    assert body["unidades"] == {"T2M": "C", "PRECTOTCORR": "mm/day"}

    rows = client.get(obs_url(test_plot["id"]), headers=owner_headers).json()
    assert len(rows) == 180
    assert set(rows[0]) == {"id", "variable", "observed_on", "value", "unit", "source"}
    assert rows[0]["observed_on"] == body["start"] and rows[-1]["observed_on"] == body["end"]
    assert {(r["variable"], r["unit"]) for r in rows} == {("T2M", "C"), ("PRECTOTCORR", "mm/day")}
    assert {r["source"] for r in rows} == {"NASA POWER"}


def test_import_without_body_also_works(client, owner_headers, test_plot, monkeypatch):
    fake_power(monkeypatch)
    response = client.post(power_url(test_plot["id"]), headers=owner_headers)
    assert response.status_code == 200, response.text
    assert response.json()["dias"] == 90


def test_fill_value_is_null_and_zero_rain_is_valid(client, db, owner_headers, test_plot, monkeypatch):
    fake_power(monkeypatch, t2m={"20261103": FILL}, prec={"20261101": 0.0, "20261103": FILL})
    body = client.post(power_url(test_plot["id"]), json={"start": "2026-11-01", "end": "2026-11-03"},
                       headers=owner_headers).json()
    assert (body["filas_guardadas"], body["valores_faltantes"]) == (6, 2)

    rows = client.get(obs_url(test_plot["id"]), headers=owner_headers).json()
    values = {(r["observed_on"], r["variable"]): r["value"] for r in rows}
    assert values[("2026-11-01", "PRECTOTCORR")] == 0.0
    assert values[("2026-11-03", "T2M")] is None and values[("2026-11-03", "PRECTOTCORR")] is None

    row = db.scalar(select(NasaObservation).where(NasaObservation.variable == "T2M"))
    assert (row.time_standard, row.source) == ("LST", "NASA POWER")
    assert (float(row.latitude), float(row.longitude)) == (-4.9, -80.7)


def test_fill_value_comes_from_header(client, owner_headers, test_plot, monkeypatch):
    fake_power(monkeypatch, fill=-888.0, t2m={"20261101": -888.0})
    client.post(power_url(test_plot["id"]), json={"start": "2026-11-01", "end": "2026-11-01"},
                headers=owner_headers)
    rows = client.get(obs_url(test_plot["id"]), params={"variable": "T2M"}, headers=owner_headers).json()
    assert rows[0]["value"] is None


def test_reimport_updates_without_duplicating(client, db, owner_headers, test_plot, monkeypatch):
    span = {"start": "2026-11-01", "end": "2026-11-05"}
    fake_power(monkeypatch)
    client.post(power_url(test_plot["id"]), json=span, headers=owner_headers)
    fake_power(monkeypatch, t2m={"20261102": 30.5})
    assert client.post(power_url(test_plot["id"]), json=span, headers=owner_headers).status_code == 200

    assert stored(db, test_plot["id"]) == 10
    rows = client.get(obs_url(test_plot["id"]), params={"variable": "T2M"}, headers=owner_headers).json()
    assert [r["value"] for r in rows] == [26.0, 30.5, 26.0, 26.0, 26.0]


def test_missing_value_does_not_overwrite_valid_data(client, owner_headers, test_plot, monkeypatch):
    span = {"start": "2026-11-10", "end": "2026-11-12"}
    fake_power(monkeypatch, t2m={"20261111": 27.4})
    client.post(power_url(test_plot["id"]), json=span, headers=owner_headers)
    # POWER revisa días recientes: ahora devuelve -999 para el 11.
    fake_power(monkeypatch, t2m={"20261111": FILL})
    client.post(power_url(test_plot["id"]), json=span, headers=owner_headers)

    rows = client.get(obs_url(test_plot["id"]), params={"variable": "T2M"}, headers=owner_headers).json()
    assert [r["value"] for r in rows] == [26.0, 27.4, 26.0]


def test_new_point_replaces_values_and_history_uses_current_point(
    client, db, owner_headers, test_plot, monkeypatch,
):
    span = {"start": "2026-11-01", "end": "2026-11-02"}
    fake_power(monkeypatch, t2m={"20261101": 27.0})
    client.post(power_url(test_plot["id"]), json=span, headers=owner_headers)

    plot = db.get(Plot, UUID(test_plot["id"]))
    plot.latitude, plot.longitude = Decimal("-4.970000"), Decimal("-80.890000")
    db.commit()
    # Las filas del punto anterior ya no se muestran.
    assert client.get(obs_url(test_plot["id"]), headers=owner_headers).json() == []

    # En el punto nuevo, un faltante sí reemplaza el valor del punto anterior.
    calls = fake_power(monkeypatch, t2m={"20261101": FILL})
    client.post(power_url(test_plot["id"]), json=span, headers=owner_headers)
    assert calls[0][:2] == (-4.97, -80.89)
    rows = client.get(obs_url(test_plot["id"]), params={"variable": "T2M"}, headers=owner_headers).json()
    assert [r["value"] for r in rows] == [None, 26.0]
    assert stored(db, test_plot["id"]) == 4


def test_observation_filters(client, owner_headers, test_plot, monkeypatch):
    fake_power(monkeypatch)
    client.post(power_url(test_plot["id"]), json={"start": "2026-11-01", "end": "2026-11-10"},
                headers=owner_headers)
    url = obs_url(test_plot["id"])
    window = client.get(url, params={"from": "2026-11-03", "to": "2026-11-04", "variable": "PRECTOTCORR"},
                        headers=owner_headers).json()
    assert [(r["observed_on"], r["variable"]) for r in window] == [
        ("2026-11-03", "PRECTOTCORR"), ("2026-11-04", "PRECTOTCORR")]
    assert_error(client.get(url, params={"from": "2026-11-05", "to": "2026-11-01"}, headers=owner_headers),
                 400, "invalid_date_range")
    assert_error(client.get(url, params={"variable": "RH2M"}, headers=owner_headers), 422, "validation_error")


def test_import_validates_range_before_calling_nasa(client, owner_headers, test_plot, monkeypatch):
    calls = fake_power(monkeypatch)
    url = power_url(test_plot["id"])
    tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
    for body in ({"start": "2026-11-05", "end": "2026-11-01"}, {"end": tomorrow},
                 {"start": "2023-01-01", "end": "2026-01-01"}):
        assert_error(client.post(url, json=body, headers=owner_headers), 400, "invalid_date_range")
    assert_error(client.post(url, json={"start": "ayer"}, headers=owner_headers), 422, "validation_error")
    assert_error(client.post(url, json={"lat": -5}, headers=owner_headers), 422, "validation_error")
    assert calls == []


def test_auth_and_ownership(client, auth_headers, owner_headers, test_plot, monkeypatch):
    calls = fake_power(monkeypatch)
    for method, url in (("post", power_url(test_plot["id"])), ("get", obs_url(test_plot["id"]))):
        assert_error(getattr(client, method)(url), 401, "missing_token")
        assert_error(getattr(client, method)(url, headers=auth_headers(uuid4())), 404, "plot_not_found")
    assert_error(client.post(power_url(uuid4()), headers=owner_headers), 404, "plot_not_found")
    assert calls == []


def test_nasa_outage_saves_nothing(client, db, owner_headers, test_plot, monkeypatch):
    monkeypatch.setattr("app.services.nasa.persistence.obtener_datos_nasa", lambda *a: None)
    assert_error(client.post(power_url(test_plot["id"]), headers=owner_headers), 503, "nasa_power_unavailable")
    assert stored(db, test_plot["id"]) == 0


def test_invalid_nasa_data_saves_nothing(client, db, owner_headers, test_plot, monkeypatch):
    span = {"start": "2026-11-01", "end": "2026-11-03"}
    fake_power(monkeypatch, prec={"20261102": -3.0})
    assert_error(client.post(power_url(test_plot["id"]), json=span, headers=owner_headers),
                 502, "nasa_power_invalid_response")

    def wrong_units(*args):
        payload = power_payload("20261101", "20261103")
        payload["parameters"]["T2M"]["units"] = "K"
        return payload
    monkeypatch.setattr("app.services.nasa.persistence.obtener_datos_nasa", wrong_units)
    assert_error(client.post(power_url(test_plot["id"]), json=span, headers=owner_headers),
                 502, "nasa_power_invalid_response")
    assert stored(db, test_plot["id"]) == 0


def test_climate_response_declares_units(client, owner_headers, test_plot, monkeypatch):
    monkeypatch.setattr("app.services.climate_service.obtener_datos_nasa",
                        lambda *a: power_payload("20261101", "20261102"))
    body = client.get(f"/api/plots/{test_plot['id']}/climate?from=2026-11-01&to=2026-11-02",
                      headers=owner_headers).json()
    assert body["unidades"] == {"temperatura_c": "C", "precipitacion_mm_dia": "mm/day"}
    assert body["time_standard"] == "LST"
