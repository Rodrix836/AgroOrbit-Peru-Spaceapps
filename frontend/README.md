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
| `VITE_SCENARIO_SOURCE` | `static` (por defecto) o `api`: de dónde sale el escenario de demostración de Rotaciones (ver abajo) |

## Lo que ya usa la API y lo que falta

- `GET /api/crops` (catálogo público) llena los selectores de cultivo de 01 Parcela.
- `PATCH /api/plots/{id}` guarda **agua y prioridad** al pulsar «Guardar» en 01 Parcela; la cabecera de 02 Diagnóstico lee el agua de la parcela. «Sin indicar» envía `null` y borra el campo.
- **Cultivo anterior, cultivo actual e inicio de la próxima campaña** se guardan como **ciclos de cultivo** (`GET/POST/PATCH/DELETE /api/plots/{id}/crop-cycles`): anterior = ciclo `finished`, actual = `active`, inicio = `sowing_date` del ciclo `planned`. Al pulsar «Guardar» solo se envía lo que cambió (POST si el ciclo no existe, PATCH si existe, DELETE si se elige «No sé» o se borra la fecha; un 409 `active_cycle_exists` / `planned_cycle_exists` se repite como PATCH sobre `details.cycle_id`) y después se vuelven a leer los ciclos y la parcela. Si una parte falla, el mensaje dice cuál se guardó y cuál no. Ya no se guardan en el navegador: los valores viejos de `localStorage` se borran al abrir la app. Con `VITE_USE_MOCKS=true` los ciclos viven en memoria (se pierden al recargar).
- **PENDIENTE BACKEND:** `POST /api/recommendations` todavía no tiene ruta (propuesta del PR #7 en `backend/docs/api-contract.md`, pendiente de que Milene la confirme). Por defecto la recomendación sale de **mocks** y Rotaciones lo rotula **DATOS DE EJEMPLO**. **Cuando exista la ruta**, se conecta sin tocar código: `VITE_USE_MOCKS=false` y `VITE_RECOMMENDATIONS_SOURCE=api` (con `VITE_USE_MOCKS=true` siempre salen mocks). La etiqueta de ejemplo desaparece sola.
- La respuesta sigue el formato del PR: `status`, `mode`, `context` (`notice`, `power`, `sensor`, `assumptions`), `missing: [{ field, reason }]`, `selected_id` y `alternatives`. El `crop` de cada campaña es un id de `GET /api/crops` y la pantalla muestra el nombre. Con `insufficient_data` nunca se muestran alternativas ni puntajes, aunque vengan en la respuesta.
- **Plan B (maqueta de formato):** si una respuesta `ok` trae marcadores (textos que empiezan con `<` y terminan con `>`) o todos los puntajes en 0, no se muestra como alternativas: aparece «Maqueta de formato: aún no hay resultado del motor», sin puntajes ni calendario.
- En Rotaciones, la prioridad parte de la guardada en la parcela; cambiarla ahí solo recalcula, no guarda.
- La fecha de inicio de la petición de Rotaciones sale de `planned.sowing_date`. Sin fecha, se muestra el aviso «Falta un dato» y los calendarios marcan «Fecha de inicio supuesta». La cabecera de Diagnóstico muestra el cultivo actual (`current.crop_code`) con su nombre.

## 03 Rotaciones: evaluación real y escenario de demostración

- **Evaluación real de la parcela:** `POST /api/recommendations` con `plot_id`, `horizon_days` y `priority` (`improve_soil` para «Mejorar el suelo», `save_water` para «Ahorrar agua»). **No se envía `start_on`**: la API toma la fecha del ciclo `planned`. Hoy, con los datos reales, devuelve `insufficient_data`: la pantalla lista lo que falta y, debajo, el botón **«Ver escenario de demostración»**.
- **Escenario de demostración** (`/rotaciones?escenario=demo`, con botón «Volver a la evaluación real»): tres secuencias de dos campañas —«Referencia proyectada» (maíz → frijol caupí), «Alternativa A» (frijol caupí → camote) y «Alternativa B» (camote → frijol caupí)—, cualitativas: sin puntajes, barras ni «mejor puntaje». Cada tarjeta muestra las dos campañas con fechas y días, el calendario, «Qué se puede comparar», «Principal riesgo» y fuentes con enlace. Lleva etiquetas «Textura franca supuesta» y «Fechas ilustrativas», la lista de supuestos, la «Lectura comparativa sin puntuaciones», un bloque «Con qué datos» con el **histórico real de NASA POWER de la parcela** (el contexto de la respuesta real, nunca los indicadores sintéticos de un JSON de ejemplo; el ESP32 sigue como dato de prueba, no usado como evidencia) y los textos para el agricultor.
- **Contenido:** `src/data/escenario-valle-chira.ts`, tomado de `backend/docs/entrega-agronomica-valle-chira.md` (Milene, rama `feat/rotaciones-valle-chira`, secciones 2, 3 y 6), con la forma del contrato (`alternatives[].campaigns`, `reasons`, `limitations`, `sources`) más un `role` opcional (`reference` | `alternative`). Las fechas son ilustrativas: inicio el 01/12/2026 y duraciones mínimas del catálogo (maíz 125 días, caupí 60, camote 80).
- **`VITE_SCENARIO_SOURCE=static|api`** (por defecto `static`). Con `api` se pide el escenario a la API (**ruta supuesta** `POST /api/recommendations/demo`, constante `DEMO_SCENARIO_PATH` en `src/services/api.ts`: PENDIENTE BACKEND hasta que Rodrigo confirme la real) y, si falla o no trae alternativas, se usa el guardado y se avisa. Si la API no trae `role` (ni `reference_id`), todas las secuencias se tratan como alternativas. Si algún día trae `score` o `criteria`, se muestran solo con el rótulo «Puntajes de prueba (sintéticos)».
- **Enlaces verificados (15/11/2026):** EcoCrop `id=238663` (maíz, *Zea mays*), `id=2153` (frijol caupí, *Vigna unguiculata*) e `id=1265` (camote, *Ipomoea batatas*), y las páginas de la FAO sobre necesidades de agua y secuencias de cultivo. Para el caupí existe también `id=10835` (*Vigna unguiculata* ssp. *unguiculata*, la que usa el catálogo del backend): es la misma especie con otros rangos; aquí se usa la `2153` de la entrega de Milene.

## Probar cada estado con datos de ejemplo

Para el sensor y NASA pon `VITE_USE_MOCKS=true`. En cualquier caso cambia `VITE_MOCK_SCENARIO` en `.env`. **Reinicia `npm run dev`** después de cambiarlo (Vite lee el `.env` al arrancar).

| `VITE_MOCK_SCENARIO` | Qué ver | Dónde |
|---|---|---|
| `normal` | (Los escenarios por defecto incluyen las 4 variables de NASA, 10 años de histórico y `criteria`, rotulados «Datos de ejemplo»). Sensor al día (última lectura de hace unos segundos, con «Recibiendo datos»), clima NASA con los últimos 4 días «sin dato» y un hueco suelto, recomendación de ejemplo | Diagnóstico y Rotaciones |
| `sensor_stale` | Aviso **Sensor sin actualización** con la hora de la última lectura «Sensor sin actualización desde las HH:MM» (última lectura de hace 3 h; el umbral es `SENSOR_STALE_MINUTES = 2`, porque el kit envía cada 10 s) y el valor atenuado | Diagnóstico → Suelo |
| `sensor_empty` | Estado vacío **Aún no hay lecturas del sensor** | Diagnóstico → Suelo |
| `nasa_down` | Aviso **NASA no disponible** (503 `nasa_power_unavailable`) y, debajo, los datos guardados antiguos con su fecha | Diagnóstico → Clima |
| `demo_mode` (**por defecto** en Rotaciones) | Plan principal de la demo: `status: ok` + `mode: escenario_demostracion`. Aviso ámbar **Escenario de demostración: no es una recomendación para una parcela real** arriba de todo, con la lista de supuestos (cultivo anterior, disponibilidad de agua) siempre visible; contexto reciente de NASA y sensor de prueba no usado como evidencia | Rotaciones |
| `normal` (Rotaciones) | `status: ok` + `mode: evaluacion`: bloque «Con qué datos se calculó» (NASA como histórico, sensor de prueba no usado como evidencia), dos alternativas de ejemplo con nombres de cultivo | Rotaciones |
| `insufficient_data` | Ejemplo real del PR #7: **Todavía no podemos comparar rotaciones**, sin tarjetas ni puntajes, con lo que falta agrupado en datos de la parcela (con enlace a Parcela), requisitos de cultivos y clima | Rotaciones |
| `format_mockup` | Ejemplo del PR #7 tal cual, con marcadores `<...>` y puntajes 0: **Maqueta de formato: aún no hay resultado del motor** (plan B), sin puntajes ni calendario | Rotaciones |
| `sin_extras` | Solo lo básico: NASA con **solo** `T2M` y `PRECTOTCORR` (sin el bloque de humedad del suelo según NASA, `GWETTOP`/`GWETROOT`) y alternativas con `criteria: {}` (sin desglose por criterio). Sirve para comprobar que la pantalla no falla cuando la API no los trae | Diagnóstico y Rotaciones |
| `historico_corto` | NASA solo guarda ~2 años: en «Riesgo e incertidumbre» cada gráfico dice **Histórico insuficiente para mostrar el rango** (hacen falta 3 años válidos) | Diagnóstico |
| `sensor_test` | Etiqueta ámbar **DATO DE PRUEBA** junto a las lecturas y en el gráfico (`quality_flag = test`) | Diagnóstico → Suelo |
| `sensor_dry` | Humedad en 0 % (`clamped_dry`): la barra queda vacía y una marca fina en el 0 muestra que es un valor, no «sin dato» | Diagnóstico → Suelo |
| `sensor_suspect` | Aviso **Lectura dudosa** en la humedad (`quality_flag = suspect`) | Diagnóstico → Suelo |

Sin `VITE_MOCK_SCENARIO` (o con un valor desconocido, que avisa en la consola del navegador) el sensor y NASA usan `normal` y la recomendación usa `demo_mode`.

En Rotaciones el bloque «Con qué datos se calculó» aparece en todos los escenarios con `context`. Los datos de ejemplo tienen la forma exacta de los JSON de `backend/docs/examples/`. La parcela de ejemplo es «Parcela demostrativa – Valle del Chira (Sullana, Piura)», latitud -4.97, longitud -80.89.

## Notas sobre los datos

- **Sensor ESP32** (ámbar) y **NASA POWER** (azul) se muestran siempre separados. Toda cifra lleva unidad, fecha/hora y fuente.
- El panel pide las lecturas del sensor cada 10 s (la cadencia del kit) y muestra bajo cada una «Última lectura: hace 12 s», que avanza sola cada segundo. Con el sensor al día aparece un punto verde y «Recibiendo datos». Si la última lectura tiene más de 2 minutos (`SENSOR_STALE_MINUTES`), sale el aviso ámbar «Sensor sin actualización desde las HH:MM» y el valor se atenúa. «Dato de prueba» es independiente y se mantiene en ambos casos.
- NASA POWER: al abrir el panel se hace `POST /api/plots/{id}/nasa/power` (últimos 90 días) y luego `GET .../nasa/observations`. Solo se muestran `T2M` y `PRECTOTCORR`. `value: null` es «sin dato»: queda un hueco en el gráfico, no se convierte en 0 ni se interpola. Los últimos 3 o 4 días suelen faltar porque POWER publica con retraso.
- Período de NASA POWER en Diagnóstico: `GET .../nasa/observations?from=&to=` con selector «90 días» (por defecto), «1 año» y «2 años». Cada período termina hoy (hora de Perú) y cuenta hoy: 90 días = el mismo rango que `POST /nasa/power` con `{}`. Con 1 y 2 años la lluvia se suma por mes y la temperatura se promedia por mes (detalle con los días con dato de cada mes); un mes sin ningún dato queda vacío, no en 0. «Actualizar clima» hace `POST` y recarga el período elegido; cambiar de período solo vuelve a pedir las observaciones.
- En Rotaciones, si `context.power.use` es `historico` el texto dice «Histórico de … a …»; la «Lluvia promedio anual» (lluvia total ÷ años del período, solo con períodos de un año o más) es un cálculo del frontend, no un dato de NASA.
- **NASA POWER, 4 variables:** la API solo admite `T2M` (`C`), `PRECTOTCORR` (`mm/day`), `GWETTOP` y `GWETROOT` (`1`, fracción de saturación 0–1). **Cualquier otra variable da 422** (`T2M_MAX`, `T2M_MIN`, `RH2M`, `WS2M` y `ALLSKY_SFC_SW_DWN` quedan pendientes del backend), así que el frontend no las pide: la lista está en `src/utils/nasaVariables.ts`. Cada gráfico o tarjeta pide **solo su variable** con su rango (`GET .../nasa/observations?variable=&from=&to=`): nunca todas juntas ni sin fechas. Las unidades se convierten solo al mostrarlas.
- **Diagnóstico, columna NASA:** temperatura (`T2M`) y lluvia (`PRECTOTCORR`) del período elegido, y el bloque «Humedad del suelo según NASA (modelo)» con `GWETTOP` y `GWETROOT`, que va siempre aparte de la humedad del sensor ESP32 (otra escala, unidad y fuente). Si una variable no llega, su bloque no se muestra.
- **Riesgo e incertidumbre: cómo varía el clima aquí:** pide el histórico de `T2M` y de `PRECTOTCORR` (cada uno con su `variable` y `from` = hoy − 10 años) y calcula **en el navegador** (rotulado «Cálculo del frontend sobre datos de NASA POWER») la banda mínimo–máximo, la mediana y los últimos 12 meses de cada mes del año. Un mes de un año solo cuenta con al menos 80 % de sus días con dato; la lluvia mensual es la suma de sus días con dato y la temperatura, su promedio. Con menos de 3 años válidos muestra «Histórico insuficiente para mostrar el rango» y cuántos años hay guardados («Hay 2 años de datos guardados; se necesitan al menos 3 para mostrar el rango»); con 10 años funciona sin cambios. No es un pronóstico.
- **Desglose por criterio:** `alternatives[].criteria` es un objeto `{ clima, agua, suelo, diversificacion }`, cada uno `{ score, weight, contribution }` (`{}` si no hay desglose). Cada barra muestra el puntaje, «pesa N %» y el aporte al total; la pantalla compara la suma de los cuatro aportes con el puntaje total (el contrato dice que coinciden salvo redondeo) y, si no coinciden, avisa y deja los valores de la API sin corregir. Al cambiar la prioridad se resaltan los criterios cuyo peso cambió. Sin `criteria` (o con `{}`), no se muestra el desglose.
- En «datos insuficientes», los campos `engine.*` y `request.*` salen en el grupo «Sistema» (p. ej. `engine.criteria` → «Puntuaciones por criterio con fuente»).
- La API entrega las unidades de POWER como `C` y `mm/day`; solo se convierten a `°C` y `mm/día` para mostrarlas.
- Horas en hora de Perú (UTC-5). Las fechas de POWER son días en hora solar local (LST); los sensores van en UTC.

## Despliegue en Vercel

El frontend es una app estática (Vite). `vercel.json` envía todas las rutas a `/index.html`, así que recargar `/parcela`, `/panel` o `/rotaciones` no da 404 (React Router resuelve la ruta en el navegador). Los archivos reales de `dist/` (scripts, fuentes, imágenes) se siguen sirviendo tal cual.

| Ajuste en Vercel | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Vite |
| Install Command | `npm install` (por defecto) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### Variables de entorno (Settings → Environment Variables)

Vercel no usa tu `.env` ni tu `.env.local` (están en el `.gitignore`): hay que crearlas allí.

| Variable | Valor | Obligatoria |
|---|---|---|
| `VITE_API_URL` | URL **https** de la API en Render, sin `/` al final (`https://<tu-api>.onrender.com`). Nunca una IP local (`192.168.x.x`) ni `http://`: la página en Vercel es https y el navegador bloquea llamadas http | Sí |
| `VITE_SUPABASE_URL` | URL del proyecto de Supabase | Sí |
| `VITE_SUPABASE_ANON_KEY` | Clave **pública** (anon / publishable) de Supabase. Nunca la `service_role` ni credenciales de PostgreSQL | Sí |
| `VITE_USE_MOCKS` | `false`. Con `true` la app muestra datos de ejemplo y no usa la API | Sí (poner `false`) |
| `VITE_RECOMMENDATIONS_SOURCE` | `api` para pedir las recomendaciones a la API (la ruta ya responde). Por defecto es `mock` | No |
| `VITE_MOCK_SCENARIO` | No definirla en producción: solo sirve para probar estados con datos de ejemplo | No |

- Las variables `VITE_*` se **incrustan en el build**: si cambias una, hay que volver a desplegar (Redeploy).
- Todo lo que lleva `VITE_` queda visible en el navegador de quien abra la página: por eso solo van valores públicos.
- Antes de publicar, `npm run build` se probó sin errores y sin ninguna IP local dentro de `dist/`.

### Lo que hay que pedir fuera del frontend

- **Rodrigo (API):** que el CORS de la API permita el dominio de Vercel (`https://<tu-proyecto>.vercel.app` y el dominio propio, si lo hay).
- **Elias (Supabase):** si hace falta, agregar ese dominio a las URLs permitidas de Supabase Auth (*Site URL* / *Redirect URLs*).
