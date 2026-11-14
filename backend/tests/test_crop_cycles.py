"""Cultivo anterior (finished), actual (active) y próxima campaña (planned) por parcela."""

from uuid import uuid4

from test_plots import assert_error


def url(plot, cycle_id=None):
    base = f"/api/plots/{plot['id']}/crop-cycles"
    return f"{base}/{cycle_id}" if cycle_id else base


def create(client, plot, headers, **body):
    return client.post(url(plot), json=body, headers=headers)


def test_empty_summary(client, owner_headers, test_plot):
    response = client.get(url(test_plot), headers=owner_headers)
    assert response.status_code == 200, response.text
    assert response.json() == {"previous": None, "current": None, "planned": None, "cycles": []}


def test_save_and_read_previous_current_and_plan(client, owner_headers, test_plot):
    prev = create(client, test_plot, owner_headers, status="finished", crop_code="maiz",
                  sowing_date="2026-03-01", harvest_date="2026-07-15")
    curr = create(client, test_plot, owner_headers, status="active", crop_code="frijol_caupi")
    plan = create(client, test_plot, owner_headers, status="planned", sowing_date="2026-12-01")
    assert (prev.status_code, curr.status_code, plan.status_code) == (201, 201, 201), plan.text
    assert plan.json()["crop_code"] is None and plan.json()["origin"] == "farmer"

    body = client.get(url(test_plot), headers=owner_headers).json()
    assert body["previous"]["crop_code"] == "maiz"
    assert body["previous"]["harvest_date"] == "2026-07-15"
    assert body["current"]["crop_code"] == "frijol_caupi" and body["current"]["sowing_date"] is None
    assert body["planned"]["sowing_date"] == "2026-12-01" and body["planned"]["crop_code"] is None
    assert len(body["cycles"]) == 3


def test_previous_is_latest_finished(client, owner_headers, test_plot):
    create(client, test_plot, owner_headers, status="finished", crop_code="camote", harvest_date="2025-10-01")
    create(client, test_plot, owner_headers, status="finished", crop_code="maiz", harvest_date="2026-07-15")
    create(client, test_plot, owner_headers, status="finished", crop_code="frijol_caupi")  # sin fechas: al final
    body = client.get(url(test_plot), headers=owner_headers).json()
    assert body["previous"]["crop_code"] == "maiz"
    assert [c["crop_code"] for c in body["cycles"]] == ["maiz", "camote", "frijol_caupi"]


def test_only_one_active_and_one_planned(client, owner_headers, test_plot):
    first = create(client, test_plot, owner_headers, status="active", crop_code="maiz").json()
    error = assert_error(create(client, test_plot, owner_headers, status="active", crop_code="camote"),
                         409, "active_cycle_exists")
    assert error["details"] == {"cycle_id": first["id"]}
    create(client, test_plot, owner_headers, status="planned", sowing_date="2026-12-01")
    assert_error(create(client, test_plot, owner_headers, status="planned", sowing_date="2027-01-01"),
                 409, "planned_cycle_exists")
    # Varios terminados sí se admiten.
    for crop in ("maiz", "camote"):
        assert create(client, test_plot, owner_headers, status="finished", crop_code=crop).status_code == 201


def test_rules_of_the_table(client, owner_headers, test_plot):
    cases = [
        ({"status": "planned"}, "body.sowing_date"),
        ({"status": "active"}, "body.crop_code"),
        ({"status": "finished", "sowing_date": "2026-03-01"}, "body.crop_code"),
        ({"status": "finished", "crop_code": "maiz", "sowing_date": "2026-05-01", "harvest_date": "2026-04-01"},
         "body.harvest_date"),
        ({"status": "active", "crop_code": "quinua"}, "body.crop_code"),
    ]
    for body, field in cases:
        error = assert_error(create(client, test_plot, owner_headers, **body), 422, "validation_error")
        assert error["details"][0]["field"] == field, (body, error)
    for body in ({"status": "harvested", "crop_code": "maiz"}, {"status": "active", "crop_code": "Maíz"},
                 {"status": "active", "crop_code": "maiz", "origin": "ia"},
                 {"status": "active", "crop_code": "maiz", "plot_id": str(uuid4())}):
        assert_error(create(client, test_plot, owner_headers, **body), 422, "validation_error")
    assert client.get(url(test_plot), headers=owner_headers).json()["cycles"] == []


def test_correct_cycle_by_id(client, owner_headers, test_plot):
    active = create(client, test_plot, owner_headers, status="active", crop_code="maiz").json()
    fixed = client.patch(url(test_plot, active["id"]), json={"crop_code": "camote", "sowing_date": "2026-09-01"},
                         headers=owner_headers)
    assert fixed.status_code == 200, fixed.text
    assert (fixed.json()["crop_code"], fixed.json()["sowing_date"]) == ("camote", "2026-09-01")

    # Cerrar la campaña actual: pasa a ser el cultivo anterior y deja libre el 'active'.
    closed = client.patch(url(test_plot, active["id"]), json={"status": "finished", "harvest_date": "2026-12-20"},
                          headers=owner_headers)
    assert closed.status_code == 200, closed.text
    assert create(client, test_plot, owner_headers, status="active", crop_code="frijol_caupi").status_code == 201
    body = client.get(url(test_plot), headers=owner_headers).json()
    assert body["previous"]["id"] == active["id"] and body["current"]["crop_code"] == "frijol_caupi"


def test_patch_keeps_rules(client, owner_headers, test_plot):
    plan = create(client, test_plot, owner_headers, status="planned", sowing_date="2026-12-01").json()
    other = create(client, test_plot, owner_headers, status="active", crop_code="maiz").json()
    # Plan sin cultivo no puede pasar a 'active'.
    assert_error(client.patch(url(test_plot, plan["id"]), json={"status": "active"}, headers=owner_headers),
                 422, "validation_error")
    # Con cultivo choca con el 'active' existente.
    assert_error(client.patch(url(test_plot, plan["id"]), json={"status": "active", "crop_code": "camote"},
                              headers=owner_headers), 409, "active_cycle_exists")
    assert_error(client.patch(url(test_plot, plan["id"]), json={"sowing_date": None}, headers=owner_headers),
                 422, "validation_error")
    assert_error(client.patch(url(test_plot, plan["id"]), json={"status": None}, headers=owner_headers),
                 422, "validation_error")
    body = client.get(url(test_plot), headers=owner_headers).json()
    assert body["planned"]["id"] == plan["id"] and body["planned"]["sowing_date"] == "2026-12-01"
    assert body["current"]["id"] == other["id"]


def test_delete_cycle(client, owner_headers, test_plot):
    plan = create(client, test_plot, owner_headers, status="planned", sowing_date="2026-12-01").json()
    assert client.delete(url(test_plot, plan["id"]), headers=owner_headers).status_code == 204
    assert client.get(url(test_plot), headers=owner_headers).json()["planned"] is None
    assert_error(client.delete(url(test_plot, plan["id"]), headers=owner_headers), 404, "cycle_not_found")


def test_ownership(client, auth_headers, owner_headers, test_plot):
    cycle = create(client, test_plot, owner_headers, status="active", crop_code="maiz").json()
    intruder = auth_headers(uuid4())
    assert_error(client.get(url(test_plot)), 401, "missing_token")
    assert_error(client.get(url(test_plot), headers=intruder), 404, "plot_not_found")
    assert_error(create(client, test_plot, intruder, status="active", crop_code="camote"), 404, "plot_not_found")
    assert_error(client.patch(url(test_plot, cycle["id"]), json={"crop_code": "camote"}, headers=intruder),
                 404, "plot_not_found")
    assert_error(client.delete(url(test_plot, cycle["id"]), headers=intruder), 404, "plot_not_found")

    # El ID de un ciclo de otra parcela propia tampoco sirve.
    other = client.post("/api/plots", json={"name": "Otra", "latitude": -5.0, "longitude": -80.6},
                        headers=owner_headers).json()
    assert_error(client.patch(url(other, cycle["id"]), json={"crop_code": "camote"}, headers=owner_headers),
                 404, "cycle_not_found")
    assert client.get(url(test_plot), headers=owner_headers).json()["current"]["crop_code"] == "maiz"
