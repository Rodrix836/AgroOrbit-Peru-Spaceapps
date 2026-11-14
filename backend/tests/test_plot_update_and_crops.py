"""PATCH /api/plots/{plot_id} y GET /api/crops."""

from uuid import uuid4

from test_plots import assert_error


def patch(client, plot, body, headers):
    return client.patch(f"/api/plots/{plot['id']}", json=body, headers=headers)


def test_patch_updates_only_sent_fields(client, owner_headers, test_plot):
    response = patch(client, test_plot, {"water_availability": "low", "priority": "save_water"}, owner_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert (body["water_availability"], body["priority"]) == ("low", "save_water")
    assert (body["name"], body["latitude"], body["longitude"]) == (
        test_plot["name"], test_plot["latitude"], test_plot["longitude"])
    assert body["created_at"] == test_plot["created_at"]

    again = client.get(f"/api/plots/{test_plot['id']}", headers=owner_headers).json()
    assert again["water_availability"] == "low" and again["priority"] == "save_water"


def test_patch_null_clears_optional_field(client, owner_headers, test_plot):
    patch(client, test_plot, {"water_availability": "high", "area_ha": 2.5}, owner_headers)
    body = patch(client, test_plot, {"water_availability": None}, owner_headers).json()
    assert body["water_availability"] is None and body["area_ha"] == 2.5


def test_patch_empty_body_changes_nothing(client, owner_headers, test_plot):
    response = patch(client, test_plot, {}, owner_headers)
    assert response.status_code == 200
    assert response.json() == {**test_plot, **{k: response.json()[k] for k in ("created_at",)}}


def test_patch_validation(client, owner_headers, test_plot):
    for body in ({"water_availability": "mucha"}, {"priority": "otra"}, {"latitude": 95},
                 {"name": None}, {"latitude": None}, {"name": "  "}, {"soil_ph": 15},
                 {"user_id": str(uuid4())}, {"id": str(uuid4())}):
        assert_error(patch(client, test_plot, body, owner_headers), 422, "validation_error")


def test_patch_requires_owner(client, auth_headers, test_plot):
    assert_error(client.patch(f"/api/plots/{test_plot['id']}", json={"priority": "diversify"}),
                 401, "missing_token")
    assert_error(patch(client, test_plot, {"priority": "diversify"}, auth_headers(uuid4())),
                 404, "plot_not_found")


def test_crops_catalog(client):
    response = client.get("/api/crops")
    assert response.status_code == 200
    crops = response.json()
    assert {"id": "maiz", "name": "Maíz"} in crops
    assert {c["id"] for c in crops} >= {"maiz", "frijol_caupi", "camote"}
    assert all(set(c) == {"id", "name"} for c in crops)
