# Persistencia de NASA POWER

La migración `20261114204035_create_nasa_observation.sql` prepara la tabla que usará FastAPI y `20261115160000_nasa_observation_more_variables.sql` amplía sus restricciones a 9 variables. La importación está en `app/services/nasa/persistence.py` y se expone en `POST /api/plots/{plot_id}/nasa/power` (guardar) y `GET /api/plots/{plot_id}/nasa/observations` (leer); ver `api-contract.md`.

Para la parcela demostrativa del Valle del Chira, usa `-4.97`, `-80.89`, comunidad `AG`, `time-standard=LST` y las 9 variables de la tabla. Persiste una fila por parcela, variable y fecha `AAAA-MM-DD`. Conserva el punto consultado en `latitude` y `longitude`, y la procedencia `NASA POWER` en `source`.

| Variable | Unidad de POWER | Qué es | Rango válido |
| --- | --- | --- | --- |
| `T2M` | `C` | Temperatura media del aire a 2 m | -900 < v < 900 |
| `T2M_MAX`, `T2M_MIN` | `C` | Temperatura máxima / mínima diaria a 2 m | -900 < v < 900 |
| `PRECTOTCORR` | `mm/day` | Precipitación corregida | ≥ 0 |
| `RH2M` | `%` | Humedad relativa a 2 m | 0–100 |
| `WS2M` | `m/s` | Viento a 2 m | ≥ 0 |
| `ALLSKY_SFC_SW_DWN` | `MJ/m^2/day` | Radiación solar en superficie | ≥ 0 |
| `GWETTOP` | `1` | Humedad del suelo superficial (~5 cm), fracción de saturación | 0–1 |
| `GWETROOT` | `1` | Humedad del suelo en la zona de raíces, fracción de saturación | 0–1 |

`T2M`, `T2M_MAX`, `T2M_MIN`, `RH2M`, `WS2M` y `ALLSKY_SFC_SW_DWN` son las entradas de ETo FAO-56 (Penman-Monteith). `GWETTOP`/`GWETROOT` son de MERRA-2 (celda de ~50 km): **no** son comparables en magnitud con el % del sensor HW-390. Un faltante (`header.fill_value`) se guarda como `null` en todas.

Convierte el valor que indica `header.fill_value` en `null`. Conserva el `0` de precipitación como un día válido. En el historial, filtra por las coordenadas actuales de la parcela y devuelve `id`, `variable`, `observed_on`, `value`, `unit` y `source`.

Para reimportar, usa `ON CONFLICT (plot_id, variable, observed_on) DO UPDATE` y actualiza el valor, las coordenadas y `fetched_at`. Una respuesta con un valor faltante no debe reemplazar un dato válido ya guardado para el mismo punto. El conjunto usa días en hora solar local. Si cambia el punto, importa de nuevo la serie para el punto actualizado.

Las observaciones de POWER describen el clima del punto representativo. Las lecturas de prueba del ESP32 se guardan aparte, con `quality_flag = 'test'`.
