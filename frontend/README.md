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

## Lo que ya usa la API y lo que falta

- `GET /api/crops` (catálogo público) llena los selectores de cultivo de 01 Parcela.
- `PATCH /api/plots/{id}` guarda **agua y prioridad** al pulsar «Guardar» en 01 Parcela; la cabecera de 02 Diagnóstico lee el agua de la parcela. «Sin indicar» envía `null` y borra el campo.
- **Cultivo anterior, cultivo actual y fecha de inicio** todavía no tienen dónde guardarse en la API (falta la tabla `crop_cycle`): se guardan solo en este navegador, y la pantalla lo dice.
- **PENDIENTE BACKEND:** `POST /api/recommendations` no tiene ruta todavía. `createRecommendation` usa **siempre** datos de ejemplo, aunque `VITE_USE_MOCKS` sea `false`, y Rotaciones lo avisa con la etiqueta **DATOS DE EJEMPLO**. Los tipos siguen la **propuesta del PR #7** (`backend/docs/api-contract.md`, pendiente de que Milene la confirme): `status`, `mode`, `context` (`notice`, `power`, `sensor`, `assumptions`), `missing: [{ field, reason }]`, `selected_id` y `alternatives`. El `crop` de cada campaña es un id de `GET /api/crops` y la pantalla muestra el nombre. Con `insufficient_data` nunca se muestran alternativas ni puntajes, aunque vengan en la respuesta.
- En Rotaciones, la prioridad parte de la guardada en la parcela; cambiarla ahí solo recalcula, no guarda.

## Probar cada estado con datos de ejemplo

Pon `VITE_USE_MOCKS=true` y cambia `VITE_MOCK_SCENARIO` en `.env`. **Reinicia `npm run dev`** después de cambiarlo (Vite lee el `.env` al arrancar).

| `VITE_MOCK_SCENARIO` | Qué ver | Dónde |
|---|---|---|
| `normal` (por defecto) | Sensor al día (última lectura de hace 2 min), clima NASA con los últimos 4 días «sin dato» y un hueco suelto, recomendación de ejemplo | Diagnóstico y Rotaciones |
| `sensor_stale` | Aviso **Sensor sin actualización** con la hora de la última lectura (hace 3 h; el umbral es `SENSOR_STALE_MINUTES = 15`) | Diagnóstico → Suelo |
| `sensor_empty` | Estado vacío **Aún no hay lecturas del sensor** | Diagnóstico → Suelo |
| `nasa_down` | Aviso **NASA no disponible** (503 `nasa_power_unavailable`) y, debajo, los datos guardados antiguos con su fecha | Diagnóstico → Clima |
| `normal` (Rotaciones) | `status: ok` + `mode: evaluacion`: bloque «Con qué datos se calculó» (NASA como histórico, sensor usado como evidencia), dos alternativas de ejemplo con nombres de cultivo | Rotaciones |
| `demo_mode` | `status: ok` + `mode: escenario_demostracion`: aviso ámbar **Escenario de demostración: no es una recomendación para una parcela real** con la lista de supuestos (cultivo anterior, disponibilidad de agua), contexto reciente de NASA y sensor de prueba no usado como evidencia | Rotaciones |
| `insufficient_data` | Ejemplo real del PR #7: **Todavía no podemos comparar rotaciones**, sin tarjetas ni puntajes, con lo que falta agrupado en datos de la parcela (con enlace a Parcela), requisitos de cultivos y clima | Rotaciones |
| `sensor_test` | Etiqueta ámbar **DATO DE PRUEBA** junto a las lecturas y en el gráfico (`quality_flag = test`) | Diagnóstico → Suelo |
| `sensor_dry` | Humedad en 0 % (`clamped_dry`): la barra queda vacía y una marca fina en el 0 muestra que es un valor, no «sin dato» | Diagnóstico → Suelo |
| `sensor_suspect` | Aviso **Lectura dudosa** en la humedad (`quality_flag = suspect`) | Diagnóstico → Suelo |

Un valor desconocido se ignora (se usa `normal`) y avisa en la consola del navegador.

En Rotaciones el bloque «Con qué datos se calculó» aparece en todos los escenarios con `context`. Los datos de ejemplo tienen la forma exacta de los JSON de `backend/docs/examples/`. La parcela de ejemplo es «Parcela demostrativa – Valle del Chira (Sullana, Piura)», latitud -4.97, longitud -80.89.

## Notas sobre los datos

- **Sensor ESP32** (ámbar) y **NASA POWER** (azul) se muestran siempre separados. Toda cifra lleva unidad, fecha/hora y fuente.
- El panel refresca las lecturas del sensor cada 30 s. Si la última lectura tiene más de 15 min, avisa.
- NASA POWER: al abrir el panel se hace `POST /api/plots/{id}/nasa/power` (últimos 90 días) y luego `GET .../nasa/observations`. Solo se muestran `T2M` y `PRECTOTCORR`. `value: null` es «sin dato»: queda un hueco en el gráfico, no se convierte en 0 ni se interpola. Los últimos 3 o 4 días suelen faltar porque POWER publica con retraso.
- La API entrega las unidades de POWER como `C` y `mm/day`; solo se convierten a `°C` y `mm/día` para mostrarlas.
- Horas en hora de Perú (UTC-5). Las fechas de POWER son días en hora solar local (LST); los sensores van en UTC.
