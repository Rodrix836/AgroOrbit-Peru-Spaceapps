"""Contrato HTTP de clima: propietario, NASA POWER y errores controlados."""

from copy import deepcopy
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock
from uuid import uuid4

import requests


def nasa_payload():
    return {
        "parameters": {"T2M": {"units": "C"}, "PRECTOTCORR": {"units": "mm/day"}},
        "properties": {"parameter": {
            "T2M": {"20260101": 26.0, "20260102": 28.0, "20260103": -999.0},
            "PRECTOTCORR": {"20260101": 2.0, "20260102": 4.0, "20260103": -999.0},
        }},
    }


def climate_url(plot_id):
    return f"/api/plots/{plot_id}/climate?from=2026-01-01&to=2026-01-03"


def mock_nasa(monkeypatch, payload):
    response = Mock()
    response.json.return_value = payload
    get = Mock(return_value=response)
    monkeypatch.setattr("app.services.nasa.power_client.requests.get", get)
    return get


def test_climate_uses_plot_coordinates_and_existing_indicators(
    client, owner_headers, test_plot, monkeypatch,
):
    get = mock_nasa(monkeypatch, nasa_payload())
    result = client.get(climate_url(test_plot["id"]), headers=owner_headers)
    assert result.status_code == 200, result.text
    body = result.json()
    assert body["plot_id"] == test_plot["id"]
    assert (body["latitude"], body["longitude"]) == (-4.9, -80.7)
    assert (body["fecha_inicio"], body["fecha_fin"]) == ("2026-01-01", "2026-01-03")
    assert body["fuente"] == "NASA POWER"
    assert body["registros"][2]["temperatura_c"] is None
    assert body["registros"][2]["precipitacion_mm_dia"] is None
    assert body["indicadores"]["temperatura_promedio_c"] == 27.0
    assert body["indicadores"]["precipitacion_total_mm"] == 6.0
    assert body["indicadores"]["cobertura_temperatura_pct"] == 66.67
    get.return_value.raise_for_status.assert_called_once_with()
    assert get.call_args.kwargs["params"] == {
        "parameters": "T2M,PRECTOTCORR", "community": "AG",
        "longitude": -80.7, "latitude": -4.9,
        "start": "20260101", "end": "20260103", "format": "JSON",
    }
    assert get.call_args.kwargs["timeout"] == 60


def test_climate_requires_auth_and_owned_plot(client, auth_headers, owner_headers, test_plot, monkeypatch):
    get = Mock(side_effect=AssertionError("NASA no debe consultarse"))
    monkeypatch.setattr("app.services.nasa.power_client.requests.get", get)
    assert client.get(climate_url(test_plot["id"])).status_code == 401
    foreign = client.get(climate_url(test_plot["id"]), headers=auth_headers(uuid4()))
    assert foreign.status_code == 404
    assert foreign.json()["error"]["code"] == "plot_not_found"
    missing = client.get(climate_url(uuid4()), headers=owner_headers)
    assert missing.status_code == 404
    assert missing.json()["error"]["code"] == "plot_not_found"
    get.assert_not_called()


def test_climate_validates_dates_before_calling_nasa(client, owner_headers, test_plot, monkeypatch):
    get = Mock(side_effect=AssertionError("NASA no debe consultarse"))
    monkeypatch.setattr("app.services.nasa.power_client.requests.get", get)
    base = f"/api/plots/{test_plot['id']}/climate"
    for query in ("?from=2026-01-03&to=2026-01-01",
                  f"?from=2026-01-01&to={(datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()}"):
        result = client.get(base + query, headers=owner_headers)
        assert result.status_code == 400
        assert result.json()["error"]["code"] == "invalid_date_range"
    for query in ("?from=bad&to=2026-01-03", "?from=2026-01-01", ""):
        result = client.get(base + query, headers=owner_headers)
        assert result.status_code == 422
        assert result.json()["error"]["code"] == "validation_error"
    get.assert_not_called()


def test_climate_reports_nasa_outage(client, owner_headers, test_plot, monkeypatch):
    monkeypatch.setattr("app.services.nasa.power_client.requests.get",
                        Mock(side_effect=requests.Timeout("upstream timeout")))
    response = client.get(climate_url(test_plot["id"]), headers=owner_headers)
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "nasa_power_unavailable"
    assert "upstream timeout" not in response.text


def test_climate_indicators_preserve_pending_crop_evaluation(
    client, owner_headers, test_plot, monkeypatch,
):
    from app.data.crops import obtener_cultivo
    from app.services.crop_evaluation import evaluar_temperatura

    mock_nasa(monkeypatch, nasa_payload())
    response = client.get(climate_url(test_plot["id"]), headers=owner_headers)
    assert response.status_code == 200
    evaluation = evaluar_temperatura(response.json()["indicadores"], obtener_cultivo("maiz"))
    assert evaluation["estado"] == "pendiente_datos_agronomicos"
    assert evaluation["compatible"] is None


def test_climate_rejects_invalid_nasa_data(client, owner_headers, test_plot, monkeypatch):
    for bad_payload in ({}, {**nasa_payload(), "parameters": {}},
                        {**nasa_payload(), "properties": {"parameter": {}}}):
        mock_nasa(monkeypatch, bad_payload)
        response = client.get(climate_url(test_plot["id"]), headers=owner_headers)
        assert response.status_code == 502, response.text
        assert response.json()["error"]["code"] == "nasa_power_invalid_response"

    bad = deepcopy(nasa_payload())
    bad["properties"]["parameter"]["T2M"]["20260101"] = float("nan")
    mock_nasa(monkeypatch, bad)
    response = client.get(climate_url(test_plot["id"]), headers=owner_headers)
    assert response.status_code == 502, response.text
    assert response.json()["error"]["code"] == "nasa_power_invalid_response"
