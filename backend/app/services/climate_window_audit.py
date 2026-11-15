"""Auditoría preparatoria de ventanas históricas de NASA POWER.

No decide si una campaña es agronómicamente evaluable ni modifica el motor.
Cuenta cobertura y separa faltantes, valores inválidos y fechas futuras para que
un umbral de suficiencia pueda acordarse y probarse antes de integrarlo.
"""

from collections.abc import Mapping
from datetime import date, timedelta
from math import isfinite
from numbers import Real


def _shift_years(day: date, years: int) -> date:
    try:
        return day.replace(year=day.year + years)
    except ValueError:  # 29 de febrero
        return day.replace(year=day.year + years, day=28)


def _finite(value: object, *, nonnegative: bool = False) -> bool:
    return (isinstance(value, Real) and not isinstance(value, bool)
            and isfinite(value) and (not nonnegative or value >= 0))


def audit_climate_windows(
    climate_days: list[dict], starts_on: date, ends_on: date, *,
    as_of: date, years_back: int = 5,
) -> dict:
    """Cuenta datos por año análogo; `as_of` es el primer día aún no histórico.

    `complete` significa cobertura íntegra de T2M y precipitación, no suficiencia
    agronómica. Los registros desde `as_of` se excluyen del conteo histórico.
    El resultado es diagnóstico interno y no forma parte del contrato API.
    """
    if ends_on < starts_on or years_back < 1:
        raise ValueError("La campaña y los años anteriores deben ser válidos.")

    by_day: dict[date, list[Mapping]] = {}
    invalid_dates = 0
    future_records = 0
    for record in climate_days:
        if not isinstance(record, Mapping):
            invalid_dates += 1
            continue
        try:
            day = date.fromisoformat(record["fecha"])
        except (KeyError, TypeError, ValueError):
            invalid_dates += 1
            continue
        if day >= as_of:
            future_records += 1
            continue
        by_day.setdefault(day, []).append(record)

    windows = []
    for years in range(1, years_back + 1):
        start = _shift_years(starts_on, -years)
        end = _shift_years(ends_on, -years)
        expected = (end - start).days + 1
        historical_end = min(end, as_of - timedelta(days=1))
        historical = max(0, (historical_end - start).days + 1)
        observed = valid_t2m = valid_precip = invalid = 0
        for day, records in by_day.items():
            if not start <= day <= historical_end:
                continue
            observed += 1
            if len(records) != 1:
                invalid += 1  # mediciones duplicadas: procedencia ambigua
                continue
            record = records[0]
            t2m = record.get("temperatura_c")
            precip = record.get("precipitacion_mm_dia")
            t2m_valid = _finite(t2m)
            precip_valid = _finite(precip, nonnegative=True)
            valid_t2m += t2m_valid
            valid_precip += precip_valid
            invalid += ((t2m is not None and not t2m_valid)
                        or (precip is not None and not precip_valid))

        if not historical:
            status = "solo_futuro"
        elif invalid:
            status = "datos_invalidos"
        elif not observed:
            status = "sin_datos"
        elif (historical == expected == valid_t2m == valid_precip):
            status = "completo"
        else:
            status = "incompleto"

        windows.append({
            "years_back": years, "start": start.isoformat(), "end": end.isoformat(),
            "status": status, "expected_days": expected,
            "historical_days": historical, "future_days": expected - historical,
            "observed_days": observed, "valid_t2m_days": valid_t2m,
            "valid_precipitation_days": valid_precip, "invalid_days": invalid,
        })

    return {"windows": windows, "invalid_date_records": invalid_dates,
            "future_records_excluded": future_records}
