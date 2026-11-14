# AgroOrbit Perú: backend (FastAPI)

API de usuarios, parcelas, clima de NASA POWER, dispositivos ESP32 y lecturas de suelo. El contrato está en [`docs/api-contract.md`](docs/api-contract.md).

## Requisitos

- Python 3.11 o superior
- Proyecto de Supabase con las migraciones de `supabase/migrations` aplicadas (tablas `app_user`, `plot`, `device` y `sensor_reading`). Las migraciones las gestiona otra parte del equipo; esta API no crea tablas.

## Instalación

```bash
cd backend
python -m venv .venv
# Windows:      .venv\Scripts\activate
# Linux/macOS:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # y completa los valores
```

### Variables de `.env`

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena PostgreSQL de Supabase (Connect → pooler). Se usa psycopg 3 |
| `SUPABASE_URL` | `https://<ref>.supabase.co`. Con claves JWT asimétricas (ES256/RS256) basta esta variable: se usa el JWKS público |
| `SUPABASE_JWT_SECRET` | Solo para proyectos con secreto HS256 (Settings → API → JWT Secret) |
| `SUPABASE_JWT_AUDIENCE` | Por defecto `authenticated` |
| `CORS_ORIGINS` | Orígenes separados por comas. Por defecto `http://localhost:5173` |
| `TEST_DEVICE_EXTERNAL_IDS` | `external_id` de kits de prueba, separados por comas. Sus lecturas se guardan con `quality_flag=test`. Demo: `kit-lote4b-01` |

**Nunca subas `.env`**: está en `.gitignore`.

## Ejecutar

```bash
uvicorn app.main:app --reload --port 8000
```

- Estado: `GET http://localhost:8000/health`
- Documentación interactiva: `http://localhost:8000/docs`

## Pruebas

```bash
pytest
```

Las pruebas usan SQLite en memoria y JWT firmados localmente. **No tocan Supabase.**

## Alta de la parcela demostrativa y del kit

Con la API levantada y `backend/.env` configurado, ejecuta en tu propia terminal:

```bash
python scripts/alta_parcela_piloto.py
```

Pide el correo y la contraseña de la cuenta demo (la contraseña no se muestra) y propone los datos confirmados: *Parcela demostrativa – Valle del Chira (Sullana, Piura)*, -4.97, -80.89. Registra el perfil, la parcela y el kit `kit-lote4b-01`. Puedes repetirlo sin duplicar nada. La clave del kit se guarda en `~/agroorbit-secretos/kit-lote4b-01.key`, fuera del repositorio; nunca se imprime.

## Flujo con la parcela de prueba

```bash
TOKEN="<access_token de Supabase>"
API=http://localhost:8000

curl -X POST $API/api/users/me -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"display_name":"Agricultor Sullana"}'

curl -X POST $API/api/plots -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Parcela piloto Sullana","latitude":-4.90,"longitude":-80.70}'
# -> copia el "id" en PLOT_ID

curl -X POST $API/api/plots/$PLOT_ID/devices -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"external_id":"esp32-sullana-01"}'
# -> guarda "device_key" (solo se muestra una vez) en DEVICE_KEY

curl -X POST $API/api/devices/readings -H "X-Device-Key: $DEVICE_KEY" -H "Content-Type: application/json" \
  -d '{"readings":[{"sensor_type":"soil_moisture","raw_value":2100,"calibrated_value":41.5,"unit":"%","recorded_at":"2026-11-14T12:00:00Z"}]}'

curl "$API/api/plots/$PLOT_ID/sensors/readings?sensor_type=soil_moisture&limit=50" -H "Authorization: Bearer $TOKEN"

curl "$API/api/plots/$PLOT_ID/climate?from=2026-01-01&to=2026-01-31" -H "Authorization: Bearer $TOKEN"
```

La ruta climática usa la latitud y longitud guardadas en la parcela, consulta los valores diarios T2M y PRECTOTCORR de NASA POWER y devuelve registros normalizados e indicadores. El rango es inclusivo y se pide con fechas `AAAA-MM-DD` en UTC. La consulta puede tardar hasta 60 segundos si NASA POWER no responde; no guarda los datos en la base.

Los indicadores pueden alimentar una evaluación posterior de cultivos y rotaciones. El catálogo actual aún no tiene rangos agronómicos respaldados por fuentes, por lo que esta ruta no calcula compatibilidad ni puntuaciones de rotación.

## Estructura

```
app/
  main.py               FastAPI, CORS, manejadores de error, /health
  core/config.py        configuración (.env)
  core/exceptions.py    errores JSON {"error": {code, message, details}}
  api/router.py         rutas bajo /api
  api/deps.py           usuario actual, sesión de BD, parcela propia (404 si es ajena)
  api/routes/           users, plots (incluye clima, devices e historial), devices (ingesta)
  services/auth.py      validación del JWT de Supabase (HS256 o JWKS)
  services/climate_service.py  consulta NASA y cálculo de indicadores para parcelas
  services/nasa/        cliente y normalización de NASA POWER
  services/sensor_service.py  registro de dispositivos, ingesta e historial
  schemas/              modelos Pydantic de entrada y salida
  database/             motor, sesión y modelos ORM (app_user, plot, device, sensor_reading)
tests/                  pytest con SQLite en memoria
docs/                   contrato de API y ejemplos JSON
```
