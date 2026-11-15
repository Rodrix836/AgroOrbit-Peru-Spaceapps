// Escenario de demostración «Valle del Chira» para 03 Rotaciones: los datos los entrega Rodrigo (API).
//
// ORIGEN: PR #23 de AgroOrbit-Peru-Spaceapps (aún sin fusionar), commit ec192fa
// («Demo de Rotaciones Valle del Chira: referencia proyectada y alternativas A y B»).
//   backend/docs/examples/demo-rotaciones-valle-chira-improve_soil.json  → «Mejorar el suelo»
//   backend/docs/examples/demo-rotaciones-valle-chira-save_water.json    → «Ahorrar agua»
//   backend/docs/demo-rotaciones-valle-chira.md                          → explica la forma y qué es sintético
// Los dos .json de esta carpeta son copias TAL CUAL (no se editan). Para actualizarlos:
//   git fetch origin pull/23/head:pr-23   (o la rama que los tenga ya fusionada)
//   git show pr-23:backend/docs/examples/demo-rotaciones-valle-chira-improve_soil.json > src/data/demo-rotaciones-valle-chira-improve_soil.json
//   git show pr-23:backend/docs/examples/demo-rotaciones-valle-chira-save_water.json   > src/data/demo-rotaciones-valle-chira-save_water.json
//
// Cada archivo trae `demo` (aviso, reference_id, estrategias, supuestos, sintetico) y `response` (la respuesta normal
// de POST /api/recommendations). La pantalla une demo.estrategias con response.alternatives por `id` y muestra las
// tarjetas en el orden de demo.estrategias: NO se ordena por rank ni por score. Los puntajes (score, criteria) y los
// textos «SYNTHETIC …» son de prueba y se muestran siempre identificados como tales.
import type { Priority } from '../types/api'
import type { DemoFile } from '../types/scenario'
import improveSoil from './demo-rotaciones-valle-chira-improve_soil.json'
import saveWater from './demo-rotaciones-valle-chira-save_water.json'

/** El archivo de cada prioridad: «Mejorar el suelo» = improve_soil; «Ahorrar agua» = save_water. */
export const DEMO_FILES: Record<Priority, DemoFile> = {
  improve_soil: improveSoil as unknown as DemoFile,
  save_water: saveWater as unknown as DemoFile,
}
