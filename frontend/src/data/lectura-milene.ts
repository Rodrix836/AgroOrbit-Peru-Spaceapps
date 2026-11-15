// Textos de Milene para el escenario de demostración que NO vienen en los JSON de Rodrigo.
//
// ORIGEN: backend/docs/entrega-agronomica-valle-chira.md (rama origin/feat/rotaciones-valle-chira): sección 2
// («Lectura comparativa sin puntuaciones») y sección 6 (textos para el agricultor). Se usan tal cual, sin añadir
// afirmaciones agronómicas; se quitó el formato de código y una frase interna sobre `crops.py`.
// Enlaces verificados el 15/11/2026: EcoCrop 238663 = Zea mays, 2153 = Vigna unguiculata, 1265 = Ipomoea batatas.
import type { SourceRef } from '../types/api'

export interface ReadingBlock {
  title: string
  text: string
  sources: SourceRef[]
}

const ECOCROP = 'https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id='
const FUENTE_AGUA: SourceRef = {
  title: 'FAO: necesidades de agua de los cultivos',
  url: 'https://www.fao.org/4/s2022e/s2022e02.htm',
}
const FUENTE_SECUENCIAS: SourceRef = {
  title: 'FAO: sistemas y secuencias de cultivo',
  url: 'https://www.fao.org/4/y5146e/y5146e0a.htm',
}

/** «Lectura comparativa sin puntuaciones» (agua, suelo, rangos generales), con sus fuentes. */
export const LECTURA_COMPARATIVA: ReadingBlock[] = [
  {
    title: 'Agua',
    text: 'No se puede declarar ahorro entre estrategias. El catálogo contiene para maíz una referencia general estacional de 500–800 mm de ETc, pero faltan necesidades comparables para caupí y camote y datos de riego, eficiencia, precipitación efectiva y agua utilizable del suelo. El valor «medium» no sirve para calcular mm por campaña.',
    sources: [FUENTE_AGUA],
  },
  {
    title: 'Suelo',
    text: 'Incorporar una leguminosa puede ser una hipótesis de manejo a estudiar, no una promesa de mejora de fertilidad; depende de residuos, fijación efectiva, manejo y secuencia.',
    sources: [FUENTE_SECUENCIAS],
  },
  {
    title: 'Rangos generales',
    text: 'EcoCrop informa pH óptimo maíz 5–7, caupí 5,5–7,5, camote 5–7. Son valores generales de la literatura y no mediciones de la parcela.',
    sources: [
      { title: 'EcoCrop (FAO): ficha del maíz, Zea mays', url: ECOCROP + '238663' },
      { title: 'EcoCrop (FAO): ficha del frijol caupí, Vigna unguiculata', url: ECOCROP + '2153' },
      { title: 'EcoCrop (FAO): ficha del camote, Ipomoea batatas', url: ECOCROP + '1265' },
    ],
  },
]

/** Sección 6 de Milene: textos para el agricultor (la frase sobre «opciones para comparar» ya va en el aviso). */
export const TEXTOS_AGRICULTOR: string[] = [
  'La fecha de inicio y las duraciones son supuestos del ejemplo. El cultivo de caupí actual no tiene fecha de término registrada.',
  'NASA POWER aporta información histórica de temperatura del aire y precipitación; no predice automáticamente la próxima cosecha.',
  'La disponibilidad de agua indicada como media no equivale a una cantidad de riego calculada.',
  'No se ha registrado análisis de textura, pH o salinidad. Las mediciones del kit de prueba no se usan para recomendar.',
  'Todavía faltan datos para comparar con puntuaciones confiables las alternativas.',
]
