"""Ingesta del ESP32 con X-Device-Key e historial de la parcela de prueba."""

from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from test_plots import assert_error

from app.database.models import Device

INGEST_URL = "/api/devices/readings"


def reading(sensor_type="soil_moisture", recorded_at="2026-11-10T12:00:00Z", **overrides):
    base = {
        "soil_moisture": {"raw_value": 2100, "calibrated_value": 41.5, "unit": "%"},
        "soil_temperature": {"raw_value": 27.31, "calibrated_value": 27.31, "unit": "°C"},
    }[sensor_type]
    return {"sensor_type": sensor_type, "recorded_at": recorded_at, **base, **overrides}


def send(client, key, *readings):
    return client.post(INGEST_URL, json={"readings": list(readings)}, headers={"X-Device-Key": key})


def history_url(plot):
    return f"/api/plots/{plot['id']}/sensors/readings"


def test_valid_key_stores_readings(client, owner_headers, test_plot, test_device):
    response = send(client, test_device["device_key"],
                    reading("soil_moisture"), reading("soil_temperature"))
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["inserted"] == 2 and body["device_id"] == test_device["id"]

    history = client.get(history_url(test_plot), headers=owner_headers)
    assert history.status_code == 200
    rows = history.json()
    assert {r["sensor_type"] for r in rows} == {"soil_moisture", "soil_temperature"}
    moisture = next(r for r in rows if r["sensor_type"] == "soil_moisture")
    assert moisture["raw_value"] == 2100 and moisture["calibrated_value"] == 41.5
    assert moisture["unit"] == "%"
    assert moisture["recorded_at"].startswith("2026-11-10T12:00:00") and moisture["recorded_at"].endswith(("Z", "+00:00"))


def test_recorded_at_is_normalized_to_utc(client, owner_headers, test_plot, test_device):
    response = send(client, test_device["device_key"], reading(recorded_at="2026-11-10T07:00:00-05:00"))
    assert response.status_code == 201, response.text
    assert response.json()["readings"][0]["recorded_at"].startswith("2026-11-10T12:00:00")


def test_invalid_key_is_rejected(client, test_device):
    assert_error(send(client, "aok_clave-falsa", reading()), 401, "invalid_device_key")


def test_missing_key_is_rejected(client, test_device):
    response = client.post(INGEST_URL, json={"readings": [reading()]})
    assert_error(response, 401, "missing_device_key")


def test_inactive_device_is_forbidden(client, db, test_device):
    device = db.get(Device, UUID(test_device["id"]))
    device.status = "inactive"
    db.commit()
    assert_error(send(client, test_device["device_key"], reading()), 403, "device_inactive")


def test_duplicate_reading_is_rejected(client, owner_headers, test_plot, test_device):
    key = test_device["device_key"]
    assert send(client, key, reading()).status_code == 201
    error = assert_error(send(client, key, reading(), reading("soil_temperature")), 409, "duplicate_reading")
    assert error["details"] == [{"sensor_type": "soil_moisture", "recorded_at": "2026-11-10T12:00:00Z"}]
    # El lote es atómico: la temperatura del lote rechazado tampoco se guardó.
    assert len(client.get(history_url(test_plot), headers=owner_headers).json()) == 1


def test_duplicate_inside_same_batch_is_rejected(client, test_device):
    error = assert_error(send(client, test_device["device_key"], reading(), reading()), 409, "duplicate_reading")
    assert len(error["details"]) == 1


def test_same_time_different_sensor_is_not_duplicate(client, test_device):
    key = test_device["device_key"]
    assert send(client, key, reading("soil_moisture")).status_code == 201
    assert send(client, key, reading("soil_temperature")).status_code == 201


def test_validation_of_reading_fields(client, test_device):
    key = test_device["device_key"]
    future = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    cases = [
        reading(sensor_type="soil_moisture", unit="°C"),          # unidad incorrecta
        reading(raw_value=5000),                                   # fuera del ADC de 12 bits
        reading(calibrated_value=120),                             # % > 100
        reading("soil_temperature", calibrated_value=200),         # fuera del DS18B20
        reading(recorded_at="2026-11-10T12:00:00"),                # sin zona horaria
        reading(recorded_at=future),                               # en el futuro
        {**reading(), "sensor_type": "air_humidity"},              # tipo no soportado
        {k: v for k, v in reading().items() if k != "calibrated_value"},  # falta campo
    ]
    for case in cases:
        response = send(client, key, case)
        assert_error(response, 422, "validation_error")
    assert_error(client.post(INGEST_URL, json={"readings": []}, headers={"X-Device-Key": key}),
                 422, "validation_error")


def test_validation_does_not_echo_device_key(client, test_device):
    key = test_device["device_key"]
    response = client.post(INGEST_URL, json={"readings": [{"sensor_type": key}]}, headers={"X-Device-Key": key})
    assert response.status_code == 422
    assert key not in response.text


def test_history_filters_and_order(client, owner_headers, test_plot, test_device):
    key = test_device["device_key"]
    for hour in (9, 10, 11, 12):
        stamp = f"2026-11-10T{hour:02d}:00:00Z"
        assert send(client, key, reading("soil_moisture", stamp),
                    reading("soil_temperature", stamp)).status_code == 201

    url = history_url(test_plot)
    rows = client.get(url, headers=owner_headers).json()
    assert len(rows) == 8
    stamps = [r["recorded_at"] for r in rows]
    assert stamps == sorted(stamps)

    only_temp = client.get(url, params={"sensor_type": "soil_temperature"}, headers=owner_headers).json()
    assert len(only_temp) == 4 and {r["sensor_type"] for r in only_temp} == {"soil_temperature"}

    window = client.get(url, params={"from": "2026-11-10T10:00:00Z", "to": "2026-11-10T11:00:00Z",
                                     "sensor_type": "soil_moisture"}, headers=owner_headers).json()
    assert [r["recorded_at"][:19] for r in window] == ["2026-11-10T10:00:00", "2026-11-10T11:00:00"]

    latest = client.get(url, params={"limit": 3}, headers=owner_headers).json()
    assert len(latest) == 3
    assert latest[-1]["recorded_at"][:19] == "2026-11-10T12:00:00"
    assert [r["recorded_at"] for r in latest] == sorted(r["recorded_at"] for r in latest)


def test_history_invalid_filters(client, owner_headers, test_plot):
    url = history_url(test_plot)
    assert_error(client.get(url, params={"from": "2026-11-11T00:00:00Z", "to": "2026-11-10T00:00:00Z"},
                            headers=owner_headers), 400, "invalid_date_range")
    assert_error(client.get(url, params={"sensor_type": "ph"}, headers=owner_headers), 422, "validation_error")
    assert_error(client.get(url, params={"limit": 0}, headers=owner_headers), 422, "validation_error")


def test_history_isolated_between_plots(client, owner_headers, test_plot, test_device):
    send(client, test_device["device_key"], reading())
    other = client.post("/api/plots", json={"name": "Otra", "latitude": -5.1, "longitude": -80.6},
                        headers=owner_headers).json()
    assert client.get(history_url(other), headers=owner_headers).json() == []


def test_history_of_foreign_plot(client, auth_headers, test_plot, test_device):
    send(client, test_device["device_key"], reading())
    intruder = auth_headers(uuid4())
    assert_error(client.get(history_url(test_plot), headers=intruder), 404, "plot_not_found")


def test_non_utf8_body_gives_clear_error(client, test_device):
    # "°C" enviado en latin-1 (como hace curl en Windows con argumentos de consola).
    raw = '{"readings":[{"sensor_type":"soil_temperature","unit":"°C"}]}'.encode("latin-1")
    response = client.post(INGEST_URL, content=raw, headers={
        "X-Device-Key": test_device["device_key"], "Content-Type": "application/json"})
    assert_error(response, 400, "invalid_body")
def test_flat_esp32_payload(client, test_plot, owner_headers):
    kit = client.post(
        f"/api/plots/{test_plot['id']}/devices",
        json={"external_id": "kit-lote4b-01"}, headers=owner_headers,
    ).json()
    payload = {
        "device_id": "kit-lote4b-01", "soil_moisture_pct": 0.0,
        "soil_moisture_raw": 2926, "soil_temp_c": 30.12,
    }
    url = "/api/sensors/readings"
    key = {"X-Device-Key": kit["device_key"]}

    assert_error(client.post(url, json=payload), 401, "missing_device_key")
    assert_error(client.post(url, json={**payload, "device_id": "otro-kit"}, headers=key),
                 403, "device_id_mismatch")

    response = client.post(url, json=payload, headers=key)
    assert response.status_code == 201, response.text
    assert response.json()["inserted"] == 2
    history = client.get(history_url(test_plot), headers=owner_headers)
    assert history.status_code == 200, history.text
    rows = {row["sensor_type"]: row for row in history.json()}
    moisture = rows["soil_moisture"]
    temperature = rows["soil_temperature"]
    assert (moisture["raw_value"], moisture["calibrated_value"]) == (2926, 0.0)
    assert temperature["raw_value"] == 30.12
    assert moisture["recorded_at"] == moisture["received_at"] == temperature["recorded_at"]
