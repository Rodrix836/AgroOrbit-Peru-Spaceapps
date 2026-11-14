# Contrato de la API: usuarios, parcelas, dispositivos y lecturas

Base URL en local: `http://localhost:8000`. Swagger: `/docs`. OpenAPI: `/openapi.json`.

Los ejemplos completos (petición y respuesta reales) están en [`examples/`](examples/).

## Autenticación

| Quién | Cabecera | Rutas |
|---|---|---|
| Frontend (usuario) | `Authorization: Bearer <access_token de Supabase Auth>` | `/api/users/*`, `/api/plots/*` |
| ESP32 | `X-Device-Key: <device_key>` | `POST /api/devices/readings` |

- El token es el `session.access_token` de `supabase.auth.getSession()`. La API verifica la firma, la expiración y `aud=authenticated`, y toma el usuario del claim `sub`. Nunca lo lee de un campo enviado por el cliente.
- La `device_key` se entrega **una sola vez**, al registrar el dispositivo. En la base solo se guarda su SHA-256. Si se pierde, hay que registrar el kit de nuevo con otro `external_id`.

## Formato de error (todas las rutas)

```json
{ "error": { "code": "plot_not_found", "message": "Parcela no encontrada.", "details": null } }
```

> **Para Luis:** `frontend/src/services/api.ts` lee hoy `body.detail`. Con esta API el mensaje está en `body.error.message` y el código estable en `body.error.code`.

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `invalid_date_range` | `from` posterior a `to` en el historial |
| 400 | `invalid_body` | El cuerpo no es JSON en UTF-8 (típico: `°C` enviado en latin-1; el ESP32 debe mandar UTF-8) |
| 401 | `missing_token`, `invalid_token`, `token_expired` | Token de usuario ausente, inválido o vencido |
| 401 | `missing_device_key`, `invalid_device_key` | Falta `X-Device-Key` o no coincide |
| 403 | `device_inactive` | Clave válida, pero el dispositivo está desactivado |
| 404 | `profile_not_found` | Se intenta crear una parcela sin perfil (hay que llamar antes a `POST /api/users/me`) |
| 404 | `plot_not_found` | La parcela no existe **o es de otro usuario** (no se distingue a propósito) |
| 404 | `not_found` | Ruta inexistente |
| 409 | `device_already_exists` | `external_id` ya registrado |
| 409 | `duplicate_reading` | Ya existe una lectura con el mismo dispositivo, `sensor_type` y `recorded_at`, o el lote la repite. `details` lista las repetidas |
| 422 | `validation_error` | Cuerpo, query o path inválidos. `details` es una lista de `{field, message, type}` y no incluye el valor enviado |
| 500 | `internal_error` | Error inesperado (sin traza ni datos internos) |
| 502 | `nasa_power_invalid_response` | NASA POWER respondió con datos incompletos, unidades inesperadas o valores inválidos |
| 503 | `database_not_configured`, `auth_not_configured`, `auth_unavailable` | Falta configuración en `.env` o Supabase Auth no responde |
| 503 | `nasa_power_unavailable` | Error de red, timeout o respuesta HTTP fallida de NASA POWER |

Las marcas de tiempo van en **ISO 8601 UTC** (`2026-11-14T12:00:00Z`). El rango climático usa fechas calendario `AAAA-MM-DD` en UTC.

---

## Usuarios

### `POST /api/users/me`

Registra el perfil del usuario autenticado (**201**) o actualiza su nombre si ya existe (**200**).

```json
{ "display_name": "Agricultor Sullana" }
```

Respuesta: `{ "id", "auth_user_id", "display_name", "created_at" }`. Ver [users-me-post-201.json](examples/users-me-post-201.json).

### `GET /api/users/me`

Devuelve el perfil, o **404** `profile_not_found` si aún no existe.

## Parcelas

### `POST /api/plots` → 201

Solo `name`, `latitude` y `longitude` son obligatorios.

```json
{
  "name": "Parcela piloto Sullana",
  "latitude": -4.9,
  "longitude": -80.7,
  "area_ha": 1.5,
  "water_source": null,
  "water_availability": "medium",
  "soil_texture": null,
  "soil_ph": null,
  "soil_salinity_ds_m": null,
  "priority": "save_water",
  "declared_irrigated": null
}
```

- `water_availability`: `low`, `medium` o `high`.
- `priority`: `save_water`, `improve_soil`, `reduce_climate_risk`, `diversify` o `maintain_productivity`.
- Rangos: latitud de -90 a 90, longitud de -180 a 180, `area_ha` > 0, `soil_ph` de 0 a 14.

La respuesta (`PlotRead`) es el mismo objeto más `id`, `user_id` y `created_at`. Ver [plots-post-201.json](examples/plots-post-201.json).

### `GET /api/plots` → 200

Lista de las parcelas del usuario (las más recientes primero): `PlotRead[]`. Ver [plots-get-200.json](examples/plots-get-200.json).

### `GET /api/plots/{plot_id}` → 200

Devuelve `PlotRead`, o **404** `plot_not_found` si no existe o no es tuya. Ver [plot-get-200.json](examples/plot-get-200.json) y [error-404-plot-not-found.json](examples/error-404-plot-not-found.json).

### `GET /api/plots/{plot_id}/climate` → 200

Requiere el token del propietario. `OwnedPlot` devuelve **404** `plot_not_found` si la parcela no existe o es ajena, antes de consultar NASA POWER. Las coordenadas proceden de la parcela guardada, no de parámetros del cliente.

| Query | Tipo | Descripción |
|---|---|---|
| `from` | fecha `AAAA-MM-DD` | Primer día UTC del rango, inclusivo; obligatorio |
| `to` | fecha `AAAA-MM-DD` | Último día UTC del rango, inclusivo; obligatorio; no puede ser futuro |

`from` posterior a `to` o `to` futuro devuelve **400** `invalid_date_range`; fechas ausentes o mal formadas devuelven **422** `validation_error`. Se consultan T2M (°C) y PRECTOTCORR (mm/día) con `community=AG`. Los valores faltantes de NASA (`-999`) se presentan como `null`. La respuesta no se persiste y puede incluir días sin mediciones válidas.

```json
{
  "plot_id": "<UUID de la parcela>",
  "latitude": -4.9,
  "longitude": -80.7,
  "fecha_inicio": "2026-01-01",
  "fecha_fin": "2026-01-03",
  "fuente": "NASA POWER",
  "registros": [
    {"fecha": "2026-01-01", "temperatura_c": 26.0, "precipitacion_mm_dia": 2.0, "fuente": "NASA POWER"},
    {"fecha": "2026-01-02", "temperatura_c": 28.0, "precipitacion_mm_dia": 4.0, "fuente": "NASA POWER"},
    {"fecha": "2026-01-03", "temperatura_c": null, "precipitacion_mm_dia": null, "fuente": "NASA POWER"}
  ],
  "indicadores": {
    "temperatura_promedio_c": 27.0,
    "temperatura_maxima_diaria_c": 28.0,
    "temperatura_minima_diaria_c": 26.0,
    "precipitacion_total_mm": 6.0,
    "dias_analizados": 3,
    "dias_temperatura_validos": 2,
    "dias_precipitacion_validos": 2,
    "cobertura_temperatura_pct": 66.67,
    "cobertura_precipitacion_pct": 66.67
  }
}
```

El cálculo reutiliza `normalizar_datos` y `calcular_indicadores`. El motor de rotaciones y `evaluar_temperatura` pueden consumir los indicadores, pero el catálogo actual tiene límites agronómicos sin completar; la API no infiere compatibilidad ni genera puntuaciones sin esos datos.

## Dispositivos

### `POST /api/plots/{plot_id}/devices` → 201

```json
{ "external_id": "esp32-sullana-01", "model": "ESP32 + HW-390 + DS18B20", "installed_at": null }
```

`external_id` admite de 1 a 64 caracteres entre `A-Z a-z 0-9 _ . : -` y es único en todo el sistema.

Respuesta: `{ id, plot_id, external_id, model, status, installed_at, created_at, device_key }`. **`device_key` solo aparece en esta respuesta.** Ver [devices-post-201.json](examples/devices-post-201.json).

### `GET /api/plots/{plot_id}/devices` → 200

Lista los dispositivos de la parcela (sin `device_key`).

## Lecturas

### `POST /api/devices/readings` → 201 (ESP32)

Cabecera: `X-Device-Key: <device_key>`. El dispositivo, y con él la parcela, se identifica por la clave. El lote de 1 a 50 lecturas se guarda **completo o nada**.

```json
{
  "readings": [
    { "sensor_type": "soil_moisture",    "raw_value": 2100,  "calibrated_value": 41.5,  "unit": "%",  "recorded_at": "2026-11-14T12:00:00Z" },
    { "sensor_type": "soil_temperature", "raw_value": 27.31, "calibrated_value": 27.31, "unit": "°C", "recorded_at": "2026-11-14T12:00:00Z" }
  ]
}
```

| `sensor_type` | `unit` | `raw_value` | `calibrated_value` |
|---|---|---|---|
| `soil_moisture` (HW-390) | `%` | 0 a 4095 (ADC de 12 bits) | 0 a 100 |
| `soil_temperature` (DS18B20) | `°C` | -55 a 125 | -55 a 125 |

- `recorded_at` **debe incluir zona horaria** (`Z` u offset). Se guarda en UTC y no puede adelantarse más de 5 minutos a la hora del servidor.
- `quality_flag` es opcional: `ok` (por defecto), `clamped_dry`, `clamped_wet` o `suspect`. Si el kit es de prueba (ver más abajo), la API lo sustituye por `test`.
- Duplicado: mismo dispositivo, `sensor_type` y `recorded_at` → **409** `duplicate_reading`.

Respuesta: `{ "device_id", "inserted", "readings": SensorReading[] }`. Ver [readings-post-201.json](examples/readings-post-201.json), [error-401-invalid-device-key.json](examples/error-401-invalid-device-key.json), [error-403-device-inactive.json](examples/error-403-device-inactive.json), [error-409-duplicate-reading.json](examples/error-409-duplicate-reading.json) y [error-422-validation.json](examples/error-422-validation.json).

### `POST /api/sensors/readings` → 201 (ESP32 sin reloj)

Registra el kit en la parcela con `external_id` igual al identificador del firmware. Envía la clave devuelta al registrar el kit como `X-Device-Key` en el POST. La clave debe corresponder al `device_id` del cuerpo.

```json
{"device_id":"kit-lote4b-01","soil_moisture_pct":0.0,"soil_moisture_raw":2926,"soil_temp_c":30.12}
```

Cada muestra guarda dos lecturas con la misma hora UTC de recepción. En la respuesta, `recorded_at` representa esa hora para este formato. Se conserva `0.0` como porcentaje válido de la calibración seco/húmedo. La cadencia del firmware es de 10 segundos.

La ruta devuelve el mismo formato de respuesta que `/api/devices/readings`, con `inserted: 2`. Si falta la clave devuelve `401`. Si la clave pertenece a otro kit devuelve `403` con `device_id_mismatch`.

Sin ID de muestra ni fecha del dispositivo, cada recepción válida se guarda como una muestra nueva. Dos valores idénticos pueden corresponder a muestras legítimas consecutivas. El firmware necesitará un identificador estable por muestra si se agrega deduplicación de reintentos.

### Kits de prueba: `quality_flag = "test"`

Los kits cuyo `external_id` figura en `TEST_DEVICE_EXTERNAL_IDS` (`backend/.env`, separados por comas) guardan **todas** sus lecturas con `quality_flag: "test"`, en las dos rutas de ingesta. Para la demo: `TEST_DEVICE_EXTERNAL_IDS=kit-lote4b-01`, porque sus lecturas se toman fuera del campo.

La parcela demostrativa *Parcela demostrativa – Valle del Chira (Sullana, Piura)* (-4.97, -80.89) es una ubicación representativa, no una chacra real.

> **Para Luis:** muestra las lecturas con `quality_flag === "test"` como «dato de prueba» y no las mezcles con datos de campo en indicadores o recomendaciones.

### `GET /api/plots/{plot_id}/sensors/readings` → 200 (frontend)

| Query | Tipo | Por defecto |
|---|---|---|
| `from` | ISO 8601 (UTC si no trae zona) | sin límite |
| `to` | ISO 8601 (UTC si no trae zona) | sin límite |
| `sensor_type` | `soil_moisture` o `soil_temperature` | ambos |
| `limit` | 1 a 1000 | 500 |

Devuelve las `limit` lecturas **más recientes** del rango, **ordenadas por `recorded_at` ascendente**, listas para graficar.

```json
[
  {
    "id": "…",
    "device_id": "…",
    "sensor_type": "soil_moisture",
    "raw_value": 2100.0,
    "calibrated_value": 41.5,
    "unit": "%",
    "quality_flag": "ok",
    "recorded_at": "2026-11-14T12:00:00Z",
    "received_at": "2026-11-14T17:33:17.167439Z"
  }
]
```

Coincide con `SensorReading` de `frontend/src/types/api.ts` y además trae `device_id`, `quality_flag` y `received_at`. Ver [readings-history-get-200.json](examples/readings-history-get-200.json) y [error-400-invalid-date-range.json](examples/error-400-invalid-date-range.json).

## Correspondencia con la base (`supabase/migrations`)

| API | Tabla.columna |
|---|---|
| `sensor_type` | `sensor_reading.variable` |
| `recorded_at` | `sensor_reading.observed_at` |
| `device_key` (solo en la respuesta) | `device.secret_hash` = SHA-256 de la clave |
| usuario del token (`sub`) | `app_user.auth_user_id` |
