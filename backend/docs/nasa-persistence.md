# Persistencia de NASA POWER

La migración `20261114204035_create_nasa_observation.sql` prepara la tabla que usará FastAPI y `20261115161101_allow_nasa_soil_wetness.sql` admite además `GWETTOP` y `GWETROOT`. La importación está en `app/services/nasa/persistence.py` y se expone en `POST /api/plots/{plot_id}/nasa/power` (guardar) y `GET /api/plots/{plot_id}/nasa/observations` (leer); ver `api-contract.md`.

Para la parcela demostrativa del Valle del Chira, usa `-4.97`, `-80.89`, comunidad `AG`, `time-standard=LST` y las 4 variables de la tabla. Persiste una fila por parcela, variable y fecha `AAAA-MM-DD`. Conserva el punto consultado en `latitude` y `longitude`, y la procedencia `NASA POWER` en `source`.

| Variable | Unidad de POWER | Qué es | Rango válido |
| --- | --- | --- | --- |
| `T2M` | `C` | Temperatura media del aire a 2 m | -900 < v < 900 |
| `PRECTOTCORR` | `mm/day` | Precipitación corregida (la **única** que cuenta como lluvia) | ≥ 0 |
| `GWETTOP` | `1` | Humedad del suelo superficial (~5 cm), fracción de saturación | 0–1 |
| `GWETROOT` | `1` | Humedad del suelo en la zona de raíces, fracción de saturación | 0–1 |

Las entradas de ETo FAO-56 (`T2M_MAX`, `T2M_MIN`, `RH2M`, `WS2M`, `ALLSKY_SFC_SW_DWN`) no se guardan hasta que una migración las admita: si la API pidiera una variable que la tabla rechaza, la importación entera fallaría. `GWETTOP`/`GWETROOT` son de MERRA-2 (celda de ~50 km): **no** son comparables en magnitud con el % del sensor HW-390. Un faltante (`header.fill_value`) se guarda como `null` en todas.

Convierte el valor que indica `header.fill_value` en `null`. Conserva el `0` de precipitación como un día válido. En el historial, filtra por las coordenadas actuales de la parcela y devuelve `id`, `variable`, `observed_on`, `value`, `unit` y `source`.

Para reimportar, usa `ON CONFLICT (plot_id, variable, observed_on) DO UPDATE` y actualiza el valor, las coordenadas y `fetched_at`. Una respuesta con un valor faltante no debe reemplazar un dato válido ya guardado para el mismo punto. El conjunto usa días en hora solar local. Si cambia el punto, importa de nuevo la serie para el punto actualizado.

Las observaciones de POWER describen el clima del punto representativo. Las lecturas de prueba del ESP32 se guardan aparte, con `quality_flag = 'test'`.
