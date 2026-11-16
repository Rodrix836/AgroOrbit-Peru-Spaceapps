# AgroOrbit Perú

Prototipo de apoyo a decisiones para la rotación de cultivos, hecho para el NASA Space Apps. El piloto es una parcela representativa del Valle del Chira (Sullana, Piura). Combina el histórico climático de **NASA POWER**, un kit de sensores de suelo **ESP32** y un motor de comparación de rotaciones de dos campañas.

> Es un prototipo. Los puntajes son criterios del prototipo, no probabilidades de éxito. No promete porcentajes de ahorro de agua ni de mejora del suelo. Si faltan datos, la API responde `insufficient_data` y dice qué falta.

## Versión presentada: dónde está cada cosa

| Parte | Publicado en | Sale de |
|---|---|---|
| **Aplicación web (incluye el mapa)** | https://agroorbit-three.vercel.app | Carpeta [`frontend/`](frontend/) de la rama **`frontend`** (commit `69df065`, comprobado el 15/11/2026), desplegada en Vercel. La misma versión está integrada en `main`. |
| **API** | https://agroorbit-api.onrender.com (`/health`, `/docs`) | Carpeta [`backend/`](backend/) de la rama **`main`**, desplegada en Render ([`render.yaml`](render.yaml)) |
| **Base de datos y autenticación** | Supabase | Migraciones en [`supabase/migrations/`](supabase/migrations/) |
| **Firmware del sensor** | Kit ESP32 | [`firmware/agroorbit_esp32/`](firmware/agroorbit_esp32/) (guía en [`firmware/README.md`](firmware/README.md)) |

### Mapa (pantalla 01 Parcela)

El mapa publicado sale del **frontend**: [`frontend/src/components/plot/PlotMap.tsx`](frontend/src/components/plot/PlotMap.tsx). Usa Leaflet y OpenStreetMap, y la celda de NASA POWER se calcula en [`frontend/src/utils/powerGrid.ts`](frontend/src/utils/powerGrid.ts). Como opción, añade la imagen satelital de NASA GIBS (MODIS Terra). No lo genera la API. Los detalles están en [`frontend/README.md`](frontend/README.md), sección «01 Parcela: mapa».

### Ejemplo de Rotaciones (pantalla 03 Rotaciones)

El ejemplo de Rotaciones está en el **PR #23** ([Rodrix836/AgroOrbit-Peru-Spaceapps#23](https://github.com/Rodrix836/AgroOrbit-Peru-Spaceapps/pull/23)), rama `feat/rotaciones-valle-chira-demo` (último commit `fb1b817`). También está integrado en `main`. Compara una **referencia proyectada** (maíz → frijol caupí) con dos alternativas: **A** (frijol caupí → camote) y **B** (camote → frijol caupí).

| Archivo | Qué es |
|---|---|
| [`backend/docs/examples/demo-rotaciones-valle-chira-improve_soil.json`](backend/docs/examples/demo-rotaciones-valle-chira-improve_soil.json) | Ejemplo con la prioridad de la ficha, «Mejorar el suelo» |
| [`backend/docs/examples/demo-rotaciones-valle-chira-save_water.json`](backend/docs/examples/demo-rotaciones-valle-chira-save_water.json) | El mismo ejemplo con la prioridad «Ahorrar agua» |
| [`backend/docs/demo-rotaciones-valle-chira.md`](backend/docs/demo-rotaciones-valle-chira.md) | Formato del archivo y tabla de qué es supuesto y qué es sintético |
| [`backend/docs/ficha-comparativa-estrategias-valle-chira.md`](backend/docs/ficha-comparativa-estrategias-valle-chira.md) | Ficha agronómica de las tres estrategias (fechas, fuentes y textos de las tarjetas) |
| [`backend/scripts/generar_demo_rotaciones.py`](backend/scripts/generar_demo_rotaciones.py) | Script que genera los dos JSON |
| [`backend/tests/test_demo_rotaciones_valle_chira.py`](backend/tests/test_demo_rotaciones_valle_chira.py) | Pruebas del ejemplo |

**Cómo leer el ejemplo:**
- Es un **escenario de demostración**, no una recomendación validada, y no asigna una estrategia ganadora.
- Son **supuestos**: la textura «franco», el inicio el 01/12/2026 y las fechas de campaña.
- Son **sintéticos**: las puntuaciones y los requisitos de cultivo que no tienen fuente.
- El clima es el **histórico real de NASA POWER** de 2016 a 2026.
- La evaluación real de la parcela sigue devolviendo `insufficient_data`: falta la textura del suelo y faltan requisitos de los cultivos.

**Cómo lo usa el frontend:** carga copias de esos JSON en `frontend/src/data/`. Son las tomadas del commit `ec192fa` del mismo PR: tienen las mismas estrategias y fechas. Después se corrigió en `main` el enlace del artículo de ETc del caupí y se añadió el pH de EcoCrop al catálogo (PR «Fuentes y pH del catálogo»). Hasta que se vuelvan a copiar, las copias del frontend no tienen esos cambios. La pantalla usa sus propios textos de tarjeta (`frontend/src/data/lectura-milene.ts`).

## Limitaciones y trabajo futuro

Esto **no** está en la versión presentada:

- **Sin evaluador agronómico real.** `EVALUATION_PROVIDER` es `None` en `backend/app/services/rotation_engine.py`. La evaluación real nunca da puntajes: responde `insufficient_data`, y los puntajes del ejemplo de Rotaciones son sintéticos.
- **Requisitos de cultivo incompletos** en `backend/app/data/crops.py`:
  - Falta el agua por campaña de frijol caupí y camote. El único dato del caupí (ETc de 288,5 mm en un sitio de Brasil) no sirve como rango general.
  - Faltan la salinidad que tolera cada cultivo y los tipos de suelo que acepta.
  - El pH sí está: es el rango óptimo de FAO EcoCrop (maíz 5–7, caupí 5,5–7,5, camote 5–7).
- **Suelo de la parcela sin medir.** Falta la textura (en el ejemplo, «franco» es un supuesto), y faltan pH y salinidad. El kit ESP32 solo mide humedad y temperatura del suelo, y en la demo es un kit de prueba (`quality_flag: test`) que no se usa como evidencia.
- **Ficha EcoCrop del caupí: `id=10835`** (*V. unguiculata* ssp. *unguiculata*, 20–35 °C y pH 5,5–7,5 óptimos), la que usan el catálogo y la ficha comparativa. Los enlaces del frontend todavía apuntan a `id=2153` (*V. unguiculata*, 25–35 °C) y faltan cambiar.
- **El escenario de demostración no se sirve por la API.** Sale de los JSON estáticos. La ruta que el frontend deja preparada (`POST /api/recommendations/demo`, con `VITE_SCENARIO_SOURCE=api`) no existe en el backend.
- **`backend/app/services/climate_window_audit.py` no está conectado.** Ninguna ruta lo llama.
- **El clima es histórico, no pronóstico.** NASA POWER da temperatura y lluvia de años anteriores en las mismas fechas, con unos 3 días de retraso. No reemplaza las mediciones de suelo.

## Reproducir

API, ejemplo y pruebas, desde `backend/` (Windows; sin credenciales):

```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python.exe -m pytest -q
.venv\Scripts\python.exe scripts\generar_demo_rotaciones.py --priority improve_soil --clima nasa
.venv\Scripts\python.exe scripts\generar_demo_rotaciones.py --priority save_water --clima nasa
```

`--clima nasa` descarga datos públicos de NASA POWER. Para ejecutarlo sin red, usa `--clima sintetico`.

Frontend, desde `frontend/`:

```bash
npm ci
npm run lint
npm run build     # tsc --noEmit + vite build
npm run dev       # http://localhost:5173 (variables en .env.example)
```

## Documentación

- Contrato de la API: [`backend/docs/api-contract.md`](backend/docs/api-contract.md), con ejemplos en [`backend/docs/examples/`](backend/docs/examples/).
- API y despliegue en Render: [`backend/README.md`](backend/README.md).
- Frontend (pantallas, estados y variables): [`frontend/README.md`](frontend/README.md).
- Datos de NASA POWER guardados por parcela: [`backend/docs/nasa-persistence.md`](backend/docs/nasa-persistence.md).
- Entrega agronómica del Valle del Chira: [`backend/docs/entrega-agronomica-valle-chira.md`](backend/docs/entrega-agronomica-valle-chira.md).

## Equipo

Rodrigo (API), Milene (servicios y reglas agronómicas), Elías (Supabase) y Luis (frontend y ESP32).
