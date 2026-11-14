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
| `VITE_MOCK_SCENARIO` | Escenario de ejemplo (ver abajo). Los de sensor y NASA solo tienen efecto con `VITE_USE_MOCKS=true`; los de recomendación, mientras la recomendación salga de mocks |
| `VITE_RECOMMENDATIONS_SOURCE` | `mock` (por defecto) o `api`: de dónde sale `POST /api/recommendations` |

## Lo que ya usa la API y lo que falta

- `GET /api/crops` (catálogo público) llena los selectores de cultivo de 01 Parcela.
- `PATCH /api/plots/{id}` guarda **agua y prioridad** al pulsar «Guardar» en 01 Parcela; la cabecera de 02 Diagnóstico lee el agua de la parcela. «Sin indicar» envía `null` y borra el campo.
- **Cultivo anterior, cultivo actual e inicio de la próxima campaña** se guardan como **ciclos de cultivo** (`GET/POST/PATCH/DELETE /api/plots/{id}/crop-cycles`): anterior = ciclo `finished`, actual = `active`, inicio = `sowing_date` del ciclo `planned`. Al pulsar «Guardar» solo se envía lo que cambió (POST si el ciclo no existe, PATCH si existe, DELETE si se elige «No sé» o se borra la fecha; un 409 `active_cycle_exists` / `planned_cycle_exists` se repite como PATCH sobre `details.cycle_id`) y después se vuelven a leer los ciclos y la parcela. Si una parte falla, el mensaje dice cuál se guardó y cuál no. Ya no se guardan en el navegador: los valores viejos de `localStorage` se borran al abrir la app. Con `VITE_USE_MOCKS=true` los ciclos viven en memoria (se pierden al recargar).
- **PENDIENTE BACKEND:** `POST /api/recommendations` todavía no tiene ruta (propuesta del PR #7 en `backend/docs/api-contract.md`, pendiente de que Milene la confirme). Por defecto la recomendación sale de **mocks** y Rotaciones lo rotula **DATOS DE EJEMPLO**. **Cuando exista la ruta**, se conecta sin tocar código: `VITE_USE_MOCKS=false` y `VITE_RECOMMENDATIONS_SOURCE=api` (con `VITE_USE_MOCKS=true` siempre salen mocks). La etiqueta de ejemplo desaparece sola.
- La respuesta sigue el formato del PR: `status`, `mode`, `context` (`notice`, `power`, `sensor`, `assumptions`), `missing: [{ field, reason }]`, `selected_id` y `alternatives`. El `crop` de cada campaña es un id de `GET /api/crops` y la pantalla muestra el nombre. Con `insufficient_data` nunca se muestran alternativas ni puntajes, aunque vengan en la respuesta.
- **Plan B (maqueta de formato):** si una respuesta `ok` trae marcadores (textos que empiezan con `<` y terminan con `>`) o todos los puntajes en 0, no se muestra como alternativas: aparece «Maqueta de formato: aún no hay resultado del motor», sin puntajes ni calendario.
- En Rotaciones, la prioridad parte de la guardada en la parcela; cambiarla ahí solo recalcula, no guarda.
- La fecha de inicio de la petición de Rotaciones sale de `planned.sowing_date`. Sin fecha, se muestra el aviso «Falta un dato» y los calendarios marcan «Fecha de inicio supuesta». La cabecera de Diagnóstico muestra el cultivo actual (`current.crop_code`) con su nombre.

## Probar cada estado con datos de ejemplo

Para el sensor y NASA pon `VITE_USE_MOCKS=true`. En cualquier caso cambia `VITE_MOCK_SCENARIO` en `.env`. **Reinicia `npm run dev`** después de cambiarlo (Vite lee el `.env` al arrancar).

| `VITE_MOCK_SCENARIO` | Qué ver | Dónde |
|---|---|---|
| `normal` | Sensor al día (última lectura de hace 2 min), clima NASA con los últimos 4 días «sin dato» y un hueco suelto, recomendación de ejemplo | Diagnóstico y Rotaciones |
| `sensor_stale` | Aviso **Sensor sin actualización** con la hora de la última lectura (hace 3 h; el umbral es `SENSOR_STALE_MINUTES = 15`) | Diagnóstico → Suelo |
| `sensor_empty` | Estado vacío **Aún no hay lecturas del sensor** | Diagnóstico → Suelo |
| `nasa_down` | Aviso **NASA no disponible** (503 `nasa_power_unavailable`) y, debajo, los datos guardados antiguos con su fecha | Diagnóstico → Clima |
| `demo_mode` (**por defecto** en Rotaciones) | Plan principal de la demo: `status: ok` + `mode: escenario_demostracion`. Aviso ámbar **Escenario de demostración: no es una recomendación para una parcela real** arriba de todo, con la lista de supuestos (cultivo anterior, disponibilidad de agua) siempre visible; contexto reciente de NASA y sensor de prueba no usado como evidencia | Rotaciones |
| `normal` (Rotaciones) | `status: ok` + `mode: evaluacion`: bloque «Con qué datos se calculó» (NASA como histórico, sensor de prueba no usado como evidencia), dos alternativas de ejemplo con nombres de cultivo | Rotaciones |
| `insufficient_data` | Ejemplo real del PR #7: **Todavía no podemos comparar rotaciones**, sin tarjetas ni puntajes, con lo que falta agrupado en datos de la parcela (con enlace a Parcela), requisitos de cultivos y clima | Rotaciones |
| `format_mockup` | Ejemplo del PR #7 tal cual, con marcadores `<...>` y puntajes 0: **Maqueta de formato: aún no hay resultado del motor** (plan B), sin puntajes ni calendario | Rotaciones |
| `sensor_test` | Etiqueta ámbar **DATO DE PRUEBA** junto a las lecturas y en el gráfico (`quality_flag = test`) | Diagnóstico → Suelo |
| `sensor_dry` | Humedad en 0 % (`clamped_dry`): la barra queda vacía y una marca fina en el 0 muestra que es un valor, no «sin dato» | Diagnóstico → Suelo |
| `sensor_suspect` | Aviso **Lectura dudosa** en la humedad (`quality_flag = suspect`) | Diagnóstico → Suelo |

Sin `VITE_MOCK_SCENARIO` (o con un valor desconocido, que avisa en la consola del navegador) el sensor y NASA usan `normal` y la recomendación usa `demo_mode`.

En Rotaciones el bloque «Con qué datos se calculó» aparece en todos los escenarios con `context`. Los datos de ejemplo tienen la forma exacta de los JSON de `backend/docs/examples/`. La parcela de ejemplo es «Parcela demostrativa – Valle del Chira (Sullana, Piura)», latitud -4.97, longitud -80.89.

## Notas sobre los datos

- **Sensor ESP32** (ámbar) y **NASA POWER** (azul) se muestran siempre separados. Toda cifra lleva unidad, fecha/hora y fuente.
- El panel refresca las lecturas del sensor cada 30 s. Si la última lectura tiene más de 15 min, avisa.
- NASA POWER: al abrir el panel se hace `POST /api/plots/{id}/nasa/power` (últimos 90 días) y luego `GET .../nasa/observations`. Solo se muestran `T2M` y `PRECTOTCORR`. `value: null` es «sin dato»: queda un hueco en el gráfico, no se convierte en 0 ni se interpola. Los últimos 3 o 4 días suelen faltar porque POWER publica con retraso.
- Período de NASA POWER en Diagnóstico: `GET .../nasa/observations?from=&to=` con selector «90 días» (por defecto), «1 año» y «2 años». Cada período termina hoy (hora de Perú) y cuenta hoy: 90 días = el mismo rango que `POST /nasa/power` con `{}`. Con 1 y 2 años la lluvia se suma por mes y la temperatura se promedia por mes (detalle con los días con dato de cada mes); un mes sin ningún dato queda vacío, no en 0. «Actualizar clima» hace `POST` y recarga el período elegido; cambiar de período solo vuelve a pedir las observaciones.
- En Rotaciones, si `context.power.use` es `historico` el texto dice «Histórico de … a …»; la «Lluvia promedio anual» (lluvia total ÷ años del período, solo con períodos de un año o más) es un cálculo del frontend, no un dato de NASA.
- La API entrega las unidades de POWER como `C` y `mm/day`; solo se convierten a `°C` y `mm/día` para mostrarlas.
- Horas en hora de Perú (UTC-5). Las fechas de POWER son días en hora solar local (LST); los sensores van en UTC.
