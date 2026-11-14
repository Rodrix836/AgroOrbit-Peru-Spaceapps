"""Contrato HTTP para POST /api/recommendations."""

from uuid import uuid4

from test_plots import assert_error


def request(plot_id, **overrides):
    return {
        "plot_id": plot_id,
        "priority": "save_water",
        "start_on": "2026-11-14",
        "horizon_days": 365,
        **overrides,
    }


def create_cycle(client, plot, owner_headers, crop_id, start_on, end_on, status):
    return client.post(
        f"/api/plots/{plot['id']}/crop-cycles",
        json={
            "crop_id": crop_id,
            "start_on": start_on,
            "end_on": end_on,
            "status": status,
        },
        headers=owner_headers,
    )


def test_recommendation_returns_missing_data_without_scores(client, owner_headers, test_plot):
    response = client.post(
        "/api/recommendations",
        json=request(test_plot["id"]),
        headers=owner_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert set(body) == {"status", "engine_version", "selected_id", "alternatives", "missing"}
    assert body["status"] == "insufficient_data"
    assert body["engine_version"] == "1.0"
    assert body["selected_id"] is None
    assert body["alternatives"] == []
    missing_fields = {item["field"] for item in body["missing"]}
    assert {"current_crop_cycle", "previous_crop_cycle", "soil_texture", "soil_ph"} <= missing_fields
    assert any(field.startswith("crop_requirements.maiz.") for field in missing_fields)
    assert "crop_requirements.frijol_caupi.agua_min_mm_campana" in missing_fields
    assert "crop_requirements.camote.agua_min_mm_campana" in missing_fields
    assert "campaign_climate_reference" in missing_fields


def test_recommendation_uses_recorded_current_and_previous_cycles(
    client, owner_headers, test_plot,
):
    create_cycle(
        client, test_plot, owner_headers, "maiz",
        "2026-06-01", "2026-09-30", "completed",
    )
    create_cycle(
        client, test_plot, owner_headers, "frijol_caupi",
        "2026-10-01", "2027-01-31", "active",
    )
    response = client.post(
        "/api/recommendations",
        json=request(test_plot["id"], priority="improve_soil"),
        headers=owner_headers,
    )
    assert response.status_code == 200, response.text
    missing_fields = {item["field"] for item in response.json()["missing"]}
    assert "current_crop_cycle" not in missing_fields
    assert "previous_crop_cycle" not in missing_fields
    assert response.json()["status"] == "insufficient_data"


def test_recommendation_requires_auth_and_owned_plot(client, owner_headers, test_plot, auth_headers):
    body = request(test_plot["id"])
    assert_error(client.post("/api/recommendations", json=body), 401, "missing_token")
    assert_error(
        client.post(
            "/api/recommendations",
            json=request(str(uuid4())),
            headers=owner_headers,
        ),
        404,
        "plot_not_found",
    )
    assert_error(
        client.post(
            "/api/recommendations",
            json=body,
            headers=auth_headers(uuid4()),
        ),
        404,
        "plot_not_found",
    )


def test_recommendation_validates_priority_dates_and_horizon(client, owner_headers, test_plot):
    url = "/api/recommendations"
    invalid = (
        request(test_plot["id"], priority="diversify"),
        request(test_plot["id"], start_on="not-a-date"),
        request(test_plot["id"], horizon_days=0),
    )
    for body in invalid:
        assert_error(client.post(url, json=body, headers=owner_headers), 422, "validation_error")
