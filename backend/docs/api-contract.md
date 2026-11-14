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

Las marcas de tiempo van en **ISO 8601 UTC** (`2026-11-14T12:00:00Z`). Las fechas de NASA POWER son días `AAAA-MM-DD` en **hora solar local (LST)** de POWER.

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

### `PATCH /api/plots/{plot_id}` → 200

Actualiza **solo los campos enviados** y devuelve el `PlotRead` completo. Acepta los mismos campos y rangos que `POST /api/plots`. Por ejemplo, para guardar lo que hoy el frontend deja en el navegador:

```json
{ "water_availability": "low", "priority": "save_water" }
```

- `null` borra un campo opcional (`{"water_availability": null}`). `name`, `latitude` y `longitude` no admiten `null`.
- `{}` no cambia nada. Campos desconocidos, `id` o `user_id` → **422** `validation_error`.
- Parcela ajena o inexistente → **404** `plot_not_found`.
- Si cambian `latitude`/`longitude`, el historial NASA del punto anterior deja de mostrarse: vuelve a importar con `POST /api/plots/{plot_id}/nasa/power`.
- El historial de cultivos y la fecha de la próxima campaña se guardan en `crop_cycle`. La migración `20261114222638_create_crop_cycles.sql` prepara las tablas. Las rutas están en [Ciclos de cultivo](#ciclos-de-cultivo-cultivo-anterior-actual-y-próxima-campaña).

#### Persistencia para las rutas de campañas

| Campo del formulario | Registro en `crop_cycle` |
| --- | --- |
| Cultivo anterior | Último ciclo `finished`, con `crop_code`. Orden sugerido: `coalesce(harvest_date, sowing_date) DESC NULLS LAST, created_at DESC, id DESC`. |
| Cultivo actual | Único ciclo `active` de la parcela, con `crop_code`. |
| Inicio previsto de la próxima campaña | `sowing_date` del único ciclo `planned` de la parcela. El cultivo puede quedar pendiente (`crop_code = null`). |

Las fechas de ciclos activos y terminados pueden quedar en `null` si el usuario no las conoce. Si se informan ambas fechas, la cosecha debe ser igual o posterior a la siembra. Usa `origin: "farmer"` para datos declarados y `"recommendation"` para una campaña que se registra a partir de una recomendación.

Usa la dependencia `OwnedPlot` para limitar las lecturas y escrituras al propietario. Al corregir los datos del formulario, actualiza el ciclo seleccionado por su ID. La base admite varios ciclos terminados y limita los ciclos activos y planificados a uno de cada tipo por parcela.

Los códigos del catálogo inicial son `maiz`, `frijol_caupi` y `camote`, iguales a los IDs de `GET /api/crops`. Esa ruta sigue leyendo el catálogo de Python. Al añadir un código allí, inclúyelo también en el catálogo SQL antes de registrarlo en `crop_cycle`.

## Ciclos de cultivo: cultivo anterior, actual y próxima campaña

Todas requieren el token del propietario (`OwnedPlot`): parcela ajena o inexistente → **404** `plot_not_found`.

### `GET /api/plots/{plot_id}/crop-cycles` → 200

Lo que necesita el formulario, más el historial (del más reciente al más antiguo):

```json
{
  "previous": { "id": "…", "plot_id": "…", "crop_code": "maiz", "sowing_date": "2026-03-01", "harvest_date": "2026-07-15", "status": "finished", "origin": "farmer", "created_at": "2026-11-14T22:40:00Z" },
  "current":  { "id": "…", "plot_id": "…", "crop_code": "frijol_caupi", "sowing_date": null, "harvest_date": null, "status": "active", "origin": "farmer", "created_at": "…" },
  "planned":  { "id": "…", "plot_id": "…", "crop_code": null, "sowing_date": "2026-12-01", "harvest_date": null, "status": "planned", "origin": "farmer", "created_at": "…" },
  "cycles":   [ "…los tres anteriores y cualquier otro finished…" ]
}
```

`previous` es el último `finished` (orden: `coalesce(harvest_date, sowing_date)` descendente con nulos al final, luego `created_at` e `id`). Si no hay, cada campo es `null` y `cycles` es `[]`.

### `POST /api/plots/{plot_id}/crop-cycles` → 201

```json
{ "status": "finished", "crop_code": "maiz", "sowing_date": "2026-03-01", "harvest_date": "2026-07-15" }
{ "status": "active", "crop_code": "frijol_caupi" }
{ "status": "planned", "sowing_date": "2026-12-01" }
```

| Campo | Obligatorio | Notas |
|---|---|---|
| `status` | sí | `active`, `finished` o `planned` |
| `crop_code` | en `active` y `finished` | ID de `GET /api/crops`; opcional en `planned` |
| `sowing_date` | en `planned` | `AAAA-MM-DD`; opcional en los demás |
| `harvest_date` | no | ≥ `sowing_date` si ambas existen |
| `origin` | no | `farmer` (por defecto) o `recommendation` |

Devuelve el ciclo (`CropCycleRead`). Errores:
- **422** `validation_error`: falta `crop_code` o `sowing_date` según el estado, cosecha antes de la siembra, cultivo desconocido o campos extra. `details[].field` indica el campo.
- **409** `active_cycle_exists` / `planned_cycle_exists`: la parcela ya tiene uno; `details.cycle_id` es su ID para corregirlo con PATCH.

### `PATCH /api/plots/{plot_id}/crop-cycles/{cycle_id}` → 200

Corrige un ciclo **por su ID**: solo los campos enviados, con las mismas reglas sobre el resultado. Ejemplos:
- Cambiar el cultivo actual: `{ "crop_code": "camote" }` sobre el ciclo `active`.
- Cerrar la campaña actual: `{ "status": "finished", "harvest_date": "2026-12-20" }`. Pasa a ser el cultivo anterior y deja libre el `active`.
- Mover la próxima siembra: `{ "sowing_date": "2027-01-10" }` sobre el ciclo `planned`.

Un ID que no es de esta parcela → **404** `cycle_not_found`.

### `DELETE /api/plots/{plot_id}/crop-cycles/{cycle_id}` → 204

Borra el ciclo (por ejemplo, para quitar la próxima campaña). ID ajeno o ya borrado → **404** `cycle_not_found`.

> **Para Luis, cómo guardar el formulario:** lee `GET …/crop-cycles`.
> - **`currentCropId`:** si `current` existe, `PATCH` su `crop_code`; si no, `POST` con `status: "active"`.
> - **`previousCropId`:** igual sobre `previous`, con `status: "finished"`.
> - **`startOn`:** igual sobre `planned`, con `status: "planned"` y `sowing_date`.
> - **`waterAvailability` y `priority`:** van con `PATCH /api/plots/{plot_id}`.

## Cultivos

### `GET /api/crops` → 200

Catálogo de `app/data/crops.py` para los selectores. No requiere token. Coincide con `Crop` de `frontend/src/types/api.ts`:

```json
[
  { "id": "maiz", "name": "Maíz" },
  { "id": "frijol_caupi", "name": "Frijol caupí" },
  { "id": "camote", "name": "Camote" }
]
```

Los requisitos agronómicos no se exponen aquí. Mientras no tengan fuente, el motor no puede recomendar.

## Recomendaciones de rotación

> **PROPUESTA: aún no implementada.** Formato acordado con Luis (frontend), **pendiente de que Milene (motor) lo confirme**. Mientras no exista la ruta, el frontend sigue con sus datos de ejemplo.

### `POST /api/recommendations` → 200

Requiere el token del propietario. Parcela ajena o inexistente → **404** `plot_not_found`; cuerpo inválido → **422** `validation_error`.

```json
{ "plot_id": "f544f739-bc06-45c6-9cf9-052c44499ab6", "priority": "save_water", "start_on": "2026-12-01", "horizon_days": 365 }
```

| Campo | Tipo | Notas |
|---|---|---|
| `plot_id` | UUID | Parcela propia |
| `priority` | `save_water` o `improve_soil` | Las dos que ofrece la interfaz |
| `start_on` | `AAAA-MM-DD` | Inicio de la primera campaña |
| `horizon_days` | entero | Por defecto 365 |

**Respuesta** (siempre HTTP 200; el resultado del motor va en `status` y `mode`):

| Campo | Tipo | Notas |
|---|---|---|
| `status` | `ok` o `insufficient_data` | |
| `mode` | `evaluacion` o `escenario_demostracion` | `escenario_demostracion` = hay datos supuestos; mostrarlo **claramente** como demo |
| `engine_version` | texto | |
| `plot_id` | UUID | |
| `context.notice` | texto | Aviso para mostrar (p. ej. «parcela representativa, no una chacra real») |
| `context.power` | objeto | `source`, `time_standard`, `start`, `end`, `use` (`contexto_del_periodo` o `historico`) e `indicators` |
| `context.sensor` | objeto | `quality_flag`, `used_as_evidence` y `reason`. Las lecturas `test` no se usan como evidencia |
| `context.assumptions` | `[{ field, value, reason }]` | Solo con `escenario_demostracion`; vacío en otro caso |
| `missing` | `[{ field, reason }]` | Con `insufficient_data` lista lo que falta; `[]` en otro caso |
| `selected_id` | texto o `null` | `null` con `insufficient_data` |
| `alternatives` | lista | **Vacía con `insufficient_data`** (sin `score`) |
| `alternatives[].id`, `rank`, `score` | texto, entero, 0–100 | `score` según el criterio del motor |
| `alternatives[].campaigns` | `[{ crop, starts_on, ends_on }]` | `crop` = id de `GET /api/crops` |
| `alternatives[].reasons`, `limitations` | texto[] | |
| `alternatives[].sources` | `[{ title, url }]` | Fuente de cada requisito usado |

**Tres casos de ejemplo** (los de `ok` y escenario solo muestran la **forma**; sus textos `<...>` y puntuaciones no son recomendaciones):

- [recommendations-post-insufficient-data.json](examples/recommendations-post-insufficient-data.json): `insufficient_data` con lo que hoy le falta de verdad a la parcela demostrativa.
- [recommendations-post-escenario.json](examples/recommendations-post-escenario.json): `ok` + `escenario_demostracion`, con `assumptions`.
- [recommendations-post-ok.json](examples/recommendations-post-ok.json): `ok` + `evaluacion`, con datos declarados y fuentes.

```json
{
  "status": "insufficient_data",
  "mode": "evaluacion",
  "engine_version": "<versión>",
  "plot_id": "f544f739-bc06-45c6-9cf9-052c44499ab6",
  "context": { "notice": "…", "power": { "start": "2026-11-01", "end": "2026-11-14", "use": "contexto_del_periodo", "…": "…" }, "sensor": { "quality_flag": "test", "used_as_evidence": false, "reason": "…" }, "assumptions": [] },
  "missing": [
    { "field": "plot.previous_crop", "reason": "La regla de rotación necesita el cultivo anterior; la parcela aún no tiene un ciclo finished." },
    { "field": "crops.maiz.requirements", "reason": "Rangos de temperatura y agua sin fuente verificable en el catálogo." }
  ],
  "selected_id": null,
  "alternatives": []
}
```

### `GET /api/plots/{plot_id}/climate` → 200

Requiere el token del propietario. `OwnedPlot` devuelve **404** `plot_not_found` si la parcela no existe o es ajena, antes de consultar NASA POWER. Las coordenadas proceden de la parcela guardada, no de parámetros del cliente.

| Query | Tipo | Descripción |
|---|---|---|
| `from` | fecha `AAAA-MM-DD` | Primer día (LST) del rango, inclusivo; obligatorio |
| `to` | fecha `AAAA-MM-DD` | Último día (LST) del rango, inclusivo; obligatorio; no puede ser futuro |

`from` posterior a `to` o `to` futuro devuelve **400** `invalid_date_range`; fechas ausentes o mal formadas devuelven **422** `validation_error`. Se consultan T2M (`C`) y PRECTOTCORR (`mm/day`) con `community=AG` y `time-standard=LST`. El valor de relleno que declara POWER en `header.fill_value` (`-999`) se presenta como `null`. Esta ruta **no** guarda nada; para guardar usa `POST /api/plots/{plot_id}/nasa/power`. La respuesta trae también `time_standard: "LST"` y `unidades: {"temperatura_c": "C", "precipitacion_mm_dia": "mm/day"}`.

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

## NASA POWER guardado (`nasa_observation`)

Son las rutas que ya llama el frontend (`refreshNasaPower` y `getNasaObservations` en `frontend/src/services/api.ts`). Las dos requieren el token del propietario y devuelven **404** `plot_not_found` si la parcela es ajena, sin consultar NASA.

### `POST /api/plots/{plot_id}/nasa/power` → 200

Consulta POWER diario (`T2M`, `PRECTOTCORR`, `community=AG`, `time-standard=LST`) en las coordenadas guardadas de la parcela y lo guarda en `public.nasa_observation`. Se puede repetir: actualiza sin duplicar.

Cuerpo opcional (`{}` o sin cuerpo = **últimos 90 días hasta hoy**):

```json
{ "start": "2026-08-17", "end": "2026-11-14" }
```

- Máximo 731 días por petición. `start` > `end`, `end` futuro o rango mayor → **400** `invalid_date_range`.
- Una fila por parcela, variable y día. `header.fill_value` (-999) se guarda como `null`; 0 mm de lluvia es un día válido.
- Al reimportar: si POWER devuelve un faltante para un día que ya tenía un valor válido **en el mismo punto**, se conserva el valor. Si cambiaron las coordenadas de la parcela, se reemplaza.
- Los últimos 3–4 días suelen llegar como faltantes porque POWER publica con retraso: vuelve a importar más tarde para completarlos.
- Errores: **503** `nasa_power_unavailable`, **502** `nasa_power_invalid_response` (unidades inesperadas, valores imposibles). Si falla, no se guarda nada.

```json
{
  "plot_id": "f544f739-bc06-45c6-9cf9-052c44499ab6",
  "latitude": -4.97,
  "longitude": -80.89,
  "start": "2026-08-17",
  "end": "2026-11-14",
  "source": "NASA POWER",
  "time_standard": "LST",
  "variables": ["T2M", "PRECTOTCORR"],
  "unidades": { "T2M": "C", "PRECTOTCORR": "mm/day" },
  "dias": 90,
  "filas_guardadas": 180,
  "valores_faltantes": 6,
  "fetched_at": "2026-11-14T21:10:00Z"
}
```

### `GET /api/plots/{plot_id}/nasa/observations` → 200

| Query | Tipo | Por defecto |
|---|---|---|
| `from` | fecha `AAAA-MM-DD` (LST) | sin límite |
| `to` | fecha `AAAA-MM-DD` (LST) | sin límite |
| `variable` | `T2M` o `PRECTOTCORR` | ambas |

Devuelve las observaciones guardadas **del punto actual** de la parcela, ordenadas por `observed_on` y `variable`. Coincide con `NasaObservation` de `frontend/src/types/api.ts`:

```json
[
  { "id": "…", "variable": "PRECTOTCORR", "observed_on": "2026-11-01", "value": 17.6, "unit": "mm/day", "source": "NASA POWER" },
  { "id": "…", "variable": "T2M", "observed_on": "2026-11-01", "value": 26.55, "unit": "C", "source": "NASA POWER" },
  { "id": "…", "variable": "T2M", "observed_on": "2026-11-14", "value": null, "unit": "C", "source": "NASA POWER" }
]
```

> **Para Luis:** las unidades llegan como las da POWER (`C`, `mm/day`), no como en los mocks (`°C`, `mm/día`). Conviértelas solo para mostrarlas. Por ahora solo se guardan `T2M` y `PRECTOTCORR`; `T2M_MIN`, `T2M_MAX`, `RH2M` y `ALLSKY_SFC_SW_DWN` de los mocks todavía no están en la tabla. `from` > `to` → **400** `invalid_date_range`.

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
| NASA `variable`, `observed_on`, `value`, `unit`, `source` | `nasa_observation.*` (además `time_standard`, `latitude`, `longitude`, `fetched_at`) |
