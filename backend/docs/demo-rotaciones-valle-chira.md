# Demo de Rotaciones — Valle del Chira (para el frontend)

**Archivos:** [`examples/demo-rotaciones-valle-chira-improve_soil.json`](examples/demo-rotaciones-valle-chira-improve_soil.json) (prioridad de la ficha) y [`examples/demo-rotaciones-valle-chira-save_water.json`](examples/demo-rotaciones-valle-chira-save_water.json) (para el cambio de prioridad).

Es un **escenario de demostración**, no una recomendación validada. La evaluación real de la parcela sigue devolviendo `insufficient_data` (ver [`api-contract.md`](api-contract.md)).

## Tres estrategias

Son las de [`ficha-comparativa-estrategias-valle-chira.md`](ficha-comparativa-estrategias-valle-chira.md) (Milene), con las mismas fechas y los textos de sus tarjetas:

| Rol | `id` | Campaña 1 | Campaña 2 |
|---|---|---|---|
| Referencia proyectada | `maiz__frijol_caupi` | Maíz 2026-12-01 → 2027-04-04 | Frijol caupí 2027-04-05 → 2027-06-03 |
| Alternativa A | `frijol_caupi__camote` | Frijol caupí 2026-12-01 → 2027-01-29 | Camote 2027-01-30 → 2027-04-19 |
| Alternativa B | `camote__frijol_caupi` | Camote 2026-12-01 → 2027-02-18 | Frijol caupí 2027-02-19 → 2027-04-19 |

## Forma del archivo

```json
{
  "demo": {
    "tipo": "escenario_demostracion",
    "aviso": "Opciones ilustrativas de comparación. No constituyen recomendaciones agronómicas validadas.",
    "sin_ganadora": "No se asigna estrategia ganadora: rank, score y selected_id …",
    "reference_id": "maiz__frijol_caupi",
    "estrategias": [{
      "id": "maiz__frijol_caupi", "rol": "referencia", "nombre": "Referencia proyectada",
      "titulo": "Maíz → Frijol caupí", "duracion_dias": 185, "periodo": "01/12/2026 al 03/06/2027",
      "descripcion": "Proyección del orden de cultivos…", "advertencia": "Fechas ilustrativas; …",
      "fuentes": [{ "titulo": "FAO — Necesidades de agua de los cultivos", "url": "https://…" }, "…"]
    }, "…A", "…B"],
    "supuestos": { "textura": "…«franco» es un supuesto…",
                   "textura_etiqueta": "Textura del suelo: franco (valor supuesto para demostración; pendiente de medición).",
                   "fechas": "…2026-12-01 y duraciones mínimas…" },
    "sintetico": { "puntuaciones": "SINTÉTICAS…", "requisitos_cultivo": "SINTÉTICOS…", "clima": "NASA POWER real…" },
    "comando": "python scripts/generar_demo_rotaciones.py --priority improve_soil --clima nasa"
  },
  "request":  { "plot_id": "f544f739-…", "priority": "improve_soil", "horizon_days": 365 },
  "http_status": 200,
  "response": { "…": "RecommendationResponse: el mismo contrato de POST /api/recommendations, sin campos nuevos" }
}
```

- **`response`** es la salida de la ruta real de la API (servicio y motor reales, en memoria): se lee con los tipos actuales (`RecommendationResponse`, `criteria` como objeto).
- **La referencia se identifica solo en este archivo**: `demo.reference_id` y `demo.estrategias[].rol` / `nombre`, enlazados por `alternatives[].id`. **La API no tiene un campo de referencia.** Si se quiere en la API, hay que acordar antes nombre y compatibilidad; la propuesta es `reference_id: string | null` opcional en la respuesta, con el mismo significado que aquí.
- **Tarjetas:** `titulo`, `duracion_dias`, `periodo`, `descripcion`, `advertencia` y `fuentes` son los textos de la sección 5 de la ficha comparativa. El generador comprueba que la duración y el periodo coincidan con `alternatives[].campaigns`; si no coinciden, falla. `demo.aviso` es el aviso común de las tres tarjetas, y la textura se muestra con `demo.supuestos.textura_etiqueta`.
- **Sin ganadora** (ficha, sección 7): `rank`, `score` y `selected_id` salen de puntuaciones **sintéticas**. En la demo no se resaltan como resultado: se ordena por `demo.estrategias` (referencia, A, B) y, si se muestra `score`, va como «criterio de prueba». Tampoco se afirman porcentajes de ahorro de agua, mejora del suelo ni productividad.

## Qué es supuesto y qué es sintético

| Dato | Estado | Dónde se declara |
|---|---|---|
| Textura «franco» | Supuesto (la parcela no la tiene) | `response.context.assumptions` (`plot.soil_texture`) y `demo.supuestos.textura` |
| Inicio 2026-12-01 y fechas de campaña (duración mínima del catálogo, sin pausas) | Supuesto | `assumptions` (`plot.next_sowing_date`, `campaigns.dates`) y `demo.supuestos.fechas` |
| Fin del frijol caupí activo antes del 2026-12-01 | Supuesto (sin fecha registrada) | `assumptions` (`plot.current_crop_end`) |
| `score`, `criteria`, pesos por prioridad | **Sintéticos** | `assumptions` (`engine.criteria`), `demo.sintetico.puntuaciones`, textos `SYNTHETIC …` en `reasons`/`limitations` |
| Requisitos de cultivo sin fuente (agua de frijol caupí y camote; pH, salinidad y suelos) | **Sintéticos** (`example.invalid`) | `assumptions` (`crops.requirements`), `demo.sintetico.requisitos_cultivo` |
| Clima | **NASA POWER real**, T2M y PRECTOTCORR diarios 2016-01-01 a 2026-11-15 en (-4.97, -80.89). Con `--clima sintetico` es una serie de prueba y se declara como supuesto (`climate.history`) | `demo.sintetico.clima` |
| Rangos de temperatura y duraciones de cultivo | Del catálogo, con fuente (FAO GAEZ, EcoCrop, FAO) | `alternatives[].sources` |
| Sensor `kit-lote4b-01` | `quality_flag: test`, no se usa como evidencia | `response.context.sensor` |

## Reproducir

Desde `backend/` (sin credenciales; `--clima nasa` descarga NASA POWER público):

```powershell
.venv\Scripts\python.exe scripts\generar_demo_rotaciones.py --priority improve_soil --clima nasa
.venv\Scripts\python.exe scripts\generar_demo_rotaciones.py --priority save_water --clima nasa
.venv\Scripts\python.exe -m pytest -q tests\test_demo_rotaciones_valle_chira.py
```

`created_at` cambia en cada ejecución. El resto no cambia mientras no cambien el motor, el catálogo o el histórico de POWER.

`examples/entrega-milene-ok-demo.json` es otro ejemplo: un fixture del contrato (duraciones de prueba de 100 días, sin las tres estrategias). Para la pantalla de Rotaciones, usar los archivos de este documento.
