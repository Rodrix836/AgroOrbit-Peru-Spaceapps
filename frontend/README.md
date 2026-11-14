# AgroOrbit — frontend

React + Vite + TypeScript + Tailwind, React Router y Recharts. Todos los datos salen de la API FastAPI a través de `src/services/api.ts`; Supabase Auth se usa solo para identidad.

El contrato de la API es `backend/docs/api-contract.md` (solo lectura, con ejemplos en `backend/docs/examples/`). Si algo de aquí lo contradice, gana el contrato.

## Cómo correrlo

```bash
cd frontend
npm install
cp .env.example .env   # y ajusta las variables
npm run dev            # http://localhost:5173
npm run lint
npm run build
```

Variables (`.env`, no se sube a git):

| Variable | Para qué |
|---|---|
| `VITE_API_URL` | URL de la API FastAPI (p. ej. `http://localhost:8000`) |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Solo identidad. Clave pública (anon), nunca la `service_role` |
| `VITE_USE_MOCKS` | `true` = datos de ejemplo, sin API ni login |
| `VITE_MOCK_SCENARIO` | Escenario de ejemplo (ver abajo). Solo tiene efecto con `VITE_USE_MOCKS=true` |

## Lo que todavía no existe en la API (PENDIENTE BACKEND)

`GET /api/crops` y `POST /api/recommendations` no existen. Esas dos funciones de `api.ts` usan **siempre** datos de ejemplo, aunque `VITE_USE_MOCKS` sea `false`, y la pantalla lo avisa con la etiqueta **DATOS DE EJEMPLO** (lista de cultivos en Parcela y todas las alternativas en Rotaciones).

Tampoco hay `PATCH` de parcelas ni ciclos de cultivo: cultivos, inicio de campaña y las opciones del bloque C (agua y prioridad) se guardan solo en este navegador.

## Probar cada estado con datos de ejemplo

Pon `VITE_USE_MOCKS=true` y cambia `VITE_MOCK_SCENARIO` en `.env`. **Reinicia `npm run dev`** después de cambiarlo (Vite lee el `.env` al arrancar).

| `VITE_MOCK_SCENARIO` | Qué ver | Dónde |
|---|---|---|
| `normal` (por defecto) | Sensor al día (última lectura de hace 2 min), clima NASA con los últimos 4 días «sin dato» y un hueco suelto, recomendación de ejemplo | Diagnóstico y Rotaciones |
| `sensor_stale` | Aviso **Sensor sin actualización** con la hora de la última lectura (hace 3 h; el umbral es `SENSOR_STALE_MINUTES = 15`) | Diagnóstico → Suelo |
| `sensor_empty` | Estado vacío **Aún no hay lecturas del sensor** | Diagnóstico → Suelo |
| `nasa_down` | Aviso **NASA no disponible** (503 `nasa_power_unavailable`) y, debajo, los datos guardados antiguos con su fecha | Diagnóstico → Clima |
| `insufficient_data` | Estado **Datos insuficientes** con lo que falta y el botón «Completar datos» | Rotaciones |
| `sensor_test` | Etiqueta ámbar **DATO DE PRUEBA** junto a las lecturas y en el gráfico (`quality_flag = test`) | Diagnóstico → Suelo |
| `sensor_suspect` | Aviso **Lectura dudosa** en la humedad (`quality_flag = suspect`) | Diagnóstico → Suelo |

Un valor desconocido se ignora (se usa `normal`) y avisa en la consola del navegador.

Los datos de ejemplo tienen la forma exacta de los JSON de `backend/docs/examples/`. La parcela de ejemplo es «Parcela demostrativa – Valle del Chira (Sullana, Piura)», latitud -4.97, longitud -80.89.

## Notas sobre los datos

- **Sensor ESP32** (ámbar) y **NASA POWER** (azul) se muestran siempre separados. Toda cifra lleva unidad, fecha/hora y fuente.
- El panel refresca las lecturas del sensor cada 30 s. Si la última lectura tiene más de 15 min, avisa.
- NASA POWER: al abrir el panel se hace `POST /api/plots/{id}/nasa/power` (últimos 90 días) y luego `GET .../nasa/observations`. Solo se muestran `T2M` y `PRECTOTCORR`. `value: null` es «sin dato»: queda un hueco en el gráfico, no se convierte en 0 ni se interpola. Los últimos 3 o 4 días suelen faltar porque POWER publica con retraso.
- La API entrega las unidades de POWER como `C` y `mm/day`; solo se convierten a `°C` y `mm/día` para mostrarlas.
- Horas en hora de Perú (UTC-5). Las fechas de POWER son días en hora solar local (LST); los sensores van en UTC.
