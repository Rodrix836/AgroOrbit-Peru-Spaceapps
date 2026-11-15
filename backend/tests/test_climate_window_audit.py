"""Auditoría preparatoria: ninguna prueba habilita un evaluador agronómico."""

from datetime import date

import pytest

from app.services.climate_window_audit import audit_climate_windows
from app.services.rotation_engine import window_indicators


def day(when, temperature=27.0, precipitation=1.0):
    return {"fecha": when, "temperatura_c": temperature,
            "precipitacion_mm_dia": precipitation}


def test_counts_complete_incomplete_and_empty_analog_windows():
    records = [day(f"2026-01-0{n}") for n in (1, 2, 3)] + [day("2025-01-01")]
    result = audit_climate_windows(
        records, date(2027, 1, 1), date(2027, 1, 3),
        as_of=date(2026, 12, 31), years_back=3,
    )
    assert [w["status"] for w in result["windows"]] == ["completo", "incompleto", "sin_datos"]
    assert [(w["expected_days"], w["observed_days"], w["valid_t2m_days"])
            for w in result["windows"]] == [(3, 3, 3), (3, 1, 1), (3, 0, 0)]


def test_future_observations_never_count_as_historical():
    result = audit_climate_windows(
        [day("2026-01-01"), day("2026-01-02"), day("2026-01-03")],
        date(2027, 1, 1), date(2027, 1, 3), as_of=date(2026, 1, 2), years_back=1,
    )
    window = result["windows"][0]
    assert (window["status"], window["historical_days"], window["future_days"]) == (
        "incompleto", 1, 2)
    assert (window["observed_days"], result["future_records_excluded"]) == (1, 2)


def test_entire_future_window_and_invalid_records_are_distinct():
    result = audit_climate_windows(
        [day("2026-02-01"), {"fecha": "bad date"}],
        date(2027, 2, 1), date(2027, 2, 2), as_of=date(2026, 1, 1), years_back=1,
    )
    assert result["windows"][0]["status"] == "solo_futuro"
    assert result["invalid_date_records"] == 1
    assert result["future_records_excluded"] == 1


def test_invalid_values_and_duplicate_dates_are_reported():
    result = audit_climate_windows(
        [day("2026-03-01", float("nan"), 1), day("2026-03-02", 25, -1),
         day("2026-03-03"), day("2026-03-03")],
        date(2027, 3, 1), date(2027, 3, 3), as_of=date(2026, 12, 31), years_back=1,
    )
    window = result["windows"][0]
    assert window["status"] == "datos_invalidos"
    assert (window["observed_days"], window["valid_t2m_days"],
            window["valid_precipitation_days"], window["invalid_days"]) == (3, 1, 1, 3)


def test_missing_precipitation_is_incomplete_not_malformed():
    result = audit_climate_windows(
        [day("2026-04-01", 26, None)], date(2027, 4, 1), date(2027, 4, 1),
        as_of=date(2026, 12, 31), years_back=1,
    )
    window = result["windows"][0]
    assert (window["status"], window["valid_t2m_days"],
            window["valid_precipitation_days"], window["invalid_days"]) == (
        "incompleto", 1, 0, 0)


def test_current_candidate_rule_still_accepts_one_valid_temperature():
    """Expone el límite operativo actual; la auditoría aún no cambia el filtro."""
    indicators = window_indicators(
        [day("2026-04-01", 26, None)], date(2027, 4, 1), date(2027, 4, 3),
    )
    assert indicators["temperatura_promedio_c"] == 26
    assert indicators["dias_temperatura_validos"] == 1
    assert indicators["dias_precipitacion_validos"] == 0


def test_window_without_observations_has_no_temperature_indicator():
    assert window_indicators([], date(2027, 4, 1), date(2027, 4, 3)) == {
        "temperatura_promedio_c": None}


def test_invalid_campaign_interval_is_rejected():
    with pytest.raises(ValueError):
        audit_climate_windows([], date(2027, 5, 2), date(2027, 5, 1),
                              as_of=date(2026, 12, 31))
