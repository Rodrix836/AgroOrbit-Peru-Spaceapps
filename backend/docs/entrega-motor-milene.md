# Entrega del motor de Milene para Rodrigo y Elías — auditoría de fase 3

**Fecha de auditoría:** 15/11/2026. **Rama:** `feat/demo-parcela-prueba`. **Versión expuesta:** `motor-1.0`. Esta entrega prepara ejemplos reproducibles, documentación y una auditoría climática independiente. **No activa recomendaciones agronómicas reales**: `EVALUATION_PROVIDER` sigue en `None` y el catálogo conserva sus requisitos pendientes. No hay commit ni publicación.

## Alcance e integración

La rama `HEAD` y la referencia local `origin/main` apuntan al mismo commit `bbdd56f` (comparación local `git rev-list --left-right --count origin/main...HEAD` → `0 0`). Los cambios de las fases 2A–3 están únicamente en el árbol de trabajo. No existe una rama local llamada `main`; **no se consultó GitHub** para comprobar si `origin/main` sigue siendo la versión remota más reciente. Antes del PR habrá que revisar la base remota según el procedimiento del equipo. Además, la referencia local `origin/feat/demo-parcela-prueba` **diverge** de esta rama (`4` commits exclusivos remotos y `45` locales según `git rev-list --left-right --count origin/feat/demo-parcela-prueba...HEAD`). Por ello no se debe asumir que un push normal al mismo nombre funcionará ni usar force push; se recomienda acordar una rama remota nueva para la entrega.

`git diff --stat` solo muestra `backend/tests/test_rotation_engine_api.py` (4 inserciones, 59 eliminaciones): se extrajeron helpers sintéticos compartidos. Los demás entregables son archivos no rastreados y por ello no aparecen en ese diff. No se modificaron migraciones Supabase, modelos de base de datos, contrato API, frontend, firmware, catálogo `crops.py` ni código del recorrido de producción. La auditoría `climate_window_audit.py` no está importada por el adaptador de recomendaciones; sus estados no filtran candidatos ni cambian `missing`.

| Archivo | Uso en la entrega |
|---|---|
| `tests/test_rotation_engine_api.py`, `tests/synthetic_recommendation.py` | Pruebas de integración y fixture ficticio compartido; pesos y puntajes `SYNTHETIC` se mantienen fuera de producción. |
| `scripts/reproducir_recomendaciones.py`, `tests/test_reproduccion_recomendaciones.py` | Generan y contrastan ambos JSON con el servicio y el esquema `RecommendationResponse`; usan SQLite en memoria, sin red ni Supabase. |
| `docs/examples/entrega-milene-ok-demo.json`, `docs/examples/entrega-milene-insufficient-data.json` | Respuestas reproducibles para demostrar el contrato, no datos de campo. |
| `services/climate_window_audit.py`, `tests/test_climate_window_audit.py` | Diagnóstico y pruebas de cobertura por ventana, aislados del motor activo. |
| `docs/entradas-motor-recomendaciones.md`, `docs/reproduccion-recomendaciones.md` | Entradas, bloqueos, versión, datos sintéticos y pasos de reproducción. |
| `docs/evidencia-agronomica.md`, `docs/propuesta-evaluador-agronomico.md`, `docs/diseno-tecnico-evaluador.md` | Fuentes, límites de aplicación, fórmulas candidatas y decisiones antes de puntuar. |
| `docs/formato-persistencia-recomendaciones.md` | Propuesta de intercambio para guardar respuesta e insumos; no crea tabla ni cambia API. |

Cada archivo nuevo cumple una función distinta: fixture, generador, ejemplos, prueba o documentación. Se conservaron los documentos de las fases anteriores y no se encontraron enlaces de referencia Markdown sin definición en los documentos de la entrega.

## Reproducción y verificación

Desde la raíz del repositorio, en PowerShell:

```powershell
& .\backend\.venv\Scripts\python.exe .\backend\scripts\reproducir_recomendaciones.py --case ok-demo
& .\backend\.venv\Scripts\python.exe .\backend\scripts\reproducir_recomendaciones.py --case insufficient-data
Push-Location .\backend
& .\.venv\Scripts\python.exe -m pytest -q
Pop-Location
```

Se ejecutaron ambos generadores con **Python 3.11.9** y después la suite completa: **120 pruebas aprobadas, 0 fallos, 2 advertencias**. Las advertencias proceden de la deprecación `httpx`/Starlette y de que pytest no pudo escribir `.pytest_cache`; ninguna prueba falló. `git diff --check` terminó sin hallazgos. La comparación reproducible excluye solo `created_at`, que cambia en cada ejecución; verifica todo lo demás.

El JSON `ok-demo` tiene `status=ok`, `mode=escenario_demostracion`, seis supuestos visibles, tres alternativas ordenadas y `selected_id` de rango 1. Cada alternativa tiene dos campañas consecutivas, razones, limitaciones y una fuente `example.invalid` marcada `SYNTHETIC`. Los pesos y contribuciones se explican en `reasons` porque el contrato no tiene campos separados para ellos. La prueba comprueba que la suma de `score × peso` coincide con el puntaje total (por ejemplo, 69,00 para `frijol_caupi__camote`), además del redondeo y orden. `engine_version=motor-1.0`.

El JSON `insufficient-data` tiene seis faltantes concretos, `selected_id=null`, `alternatives=[]` y ningún puntaje. En ambos ejemplos `context.sensor.quality_flag=test` y `used_as_evidence=false`. Los dos pasan la validación del esquema usado para [api-contract.md](api-contract.md). El campo contractual `context.power.source` dice `NASA POWER` porque los datos se guardan en esa tabla durante el fixture, **pero la serie de los ejemplos es sintética**; el ejemplo `ok` lo declara en los supuestos y el insuficiente en `context.notice`.

## Para Rodrigo

Puede integrar y revisar ahora las pruebas, el generador, los dos JSON de esta entrega y la documentación como **demostración técnica del contrato**. El motor de producción sigue dando `insufficient_data` mientras falten fichas completas, reglas de puntuación y pesos sustentados. Antes de conectar la auditoría climática debe acordar un umbral por campaña/año, una fecha de corte `as_of` reproducible y pruebas de regresión: hoy 365 T2M válidos en todo el historial no garantizan cobertura de ambas ventanas, y una ventana con un solo T2M puede pasar el filtro. También debe decidir cómo pasar el cultivo anterior al evaluador.

**Inconsistencia previa del repositorio:** `docs/examples/recommendations-post-ok-controlado-sintetico.json`, enlazado desde el contrato existente, contiene `mode=evaluacion` y un aviso de evaluación aunque sus insumos son sintéticos. Está identificado en el contrato como caso controlado, pero no debe mostrarse como recomendación real. El archivo nuevo `entrega-milene-ok-demo.json` usa `escenario_demostracion`. Corregir el ejemplo previo y cualquier presentación que lo use requiere coordinación con Rodrigo; esta auditoría no alteró el contrato ni ese ejemplo.

## Para Elías

Puede revisar [formato-persistencia-recomendaciones.md](formato-persistencia-recomendaciones.md) como propuesta de intercambio. Para **mostrar** exactamente una respuesta histórica, debe conservar la respuesta API íntegra, identificadores y fecha. Para **recalcular**, necesitará además petición y entradas resueltas, observaciones climáticas diarias y sus unidades, `as_of` y cobertura por campaña, fichas y fuentes versionadas, mediciones de suelo/riego con método, cultivo anterior e historial de manejo, evaluaciones, pesos, supuestos y versión de reglas. El esquema de persistencia, permisos y soporte de base de datos aún requieren acuerdo; no se creó migración.

## Decisiones y riesgos pendientes

1. Validar requisitos de maíz, caupí y camote para variedad y condiciones de Piura. La [matriz de evidencia](evidencia-agronomica.md) separa óptimos generales, ETc, lluvia anual y ensayos puntuales. Los folletos antiguos INIA cuyos PDF no pudieron recuperarse no cuentan como comprobación completa de sus cifras.
2. Aprobar mediciones y fórmulas para clima, agua, suelo y diversificación; `low` no equivale a un volumen de riego y un cultivo leguminoso no acredita por sí solo mejora medida del suelo. Las fórmulas de 0–100 son **propuestas**, no funciones validadas.
3. Obtener y revisar pesos reales con especialistas y agricultores. Los pesos `save_water` e `improve_soil` de esta entrega existen **solo en el fixture sintético**.
4. Revisar el uso de la etiqueta `NASA POWER` en cualquier interfaz que muestre fixtures, así como el ejemplo estático previo con `mode=evaluacion`. Mantener avisos de demostración visibles.
5. Comprobar la referencia remota de `main` antes del PR y acordar una rama remota nueva para esta entrega: las comparaciones efectuadas aquí usan solo referencias `origin/*` almacenadas localmente; la rama remota homónima diverge.
