// Escenario de demostración «Valle del Chira» para 03 Rotaciones.
//
// ORIGEN: backend/docs/entrega-agronomica-valle-chira.md (Milene), rama origin/feat/rotaciones-valle-chira,
// secciones 2 (tres estrategias y lectura comparativa), 3 (NASA POWER) y 6 (textos para el agricultor).
// Forma del JSON: backend/docs/examples/entrega-milene-ok-demo.json (alternatives[].campaigns, reasons, limitations,
// sources). De ese JSON NO se toma ningún valor: sus indicadores y puntajes son sintéticos.
//
// Los textos son los de Milene tal cual (salvo quitar el formato de código). No se añade ninguna afirmación agronómica,
// ahorro ni ganadora. Las fechas son ILUSTRATIVAS: inicio el 01/12/2026 por convención del escenario, duraciones mínimas
// generales del catálogo (maíz 125 días, frijol caupí 60, camote 80), campañas seguidas sin pausa.
//
// Si Rodrigo entrega este escenario por la API (VITE_SCENARIO_SOURCE=api), las alternativas se leen de allí y de esta
// constante solo se conservan los textos que la API no trae (aviso, supuestos, lectura comparativa, textos al agricultor).
//
// Enlaces (verificados el 15/11/2026): EcoCrop 238663 = Zea mays ssp. mays; 2153 = Vigna unguiculata; 1265 = Ipomoea
// batatas. Para el caupí también existe id=10835 (Vigna unguiculata ssp. unguiculata, la que usa el catálogo del
// backend); las dos fichas son de la misma especie y dan el mismo pH óptimo (5,5–7,5). Se usa 2153, la de la entrega
// de Milene.
import type { SourceRef } from '../types/api'
import type { Scenario } from '../types/scenario'

const ECOCROP = 'https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id='

const FUENTE_MAIZ: SourceRef = { title: 'EcoCrop (FAO): ficha del maíz, Zea mays', url: ECOCROP + '238663' }
const FUENTE_CAUPI: SourceRef = {
  title: 'EcoCrop (FAO): ficha del frijol caupí, Vigna unguiculata',
  url: ECOCROP + '2153',
}
const FUENTE_CAMOTE: SourceRef = { title: 'EcoCrop (FAO): ficha del camote, Ipomoea batatas', url: ECOCROP + '1265' }
const FUENTE_AGUA: SourceRef = {
  title: 'FAO: necesidades de agua de los cultivos',
  url: 'https://www.fao.org/4/s2022e/s2022e02.htm',
}
const FUENTE_SECUENCIAS: SourceRef = {
  title: 'FAO: sistemas y secuencias de cultivo',
  url: 'https://www.fao.org/4/y5146e/y5146e0a.htm',
}

export const ESCENARIO_VALLE_CHIRA: Scenario = {
  notice:
    'Escenario de demostración. Estas tres secuencias son opciones para comparar, no recomendaciones validadas para tu parcela.',

  tags: ['Textura franca supuesta', 'Fechas ilustrativas'],

  assumptions: [
    'El inicio es el 01/12/2026 por convención del escenario; no es una fecha agronómica certificada.',
    'Las duraciones son las mínimas generales del catálogo: maíz 125 días, frijol caupí 60 y camote 80.',
    'Las campañas van seguidas, sin pausa: la segunda empieza al día siguiente de la primera. Preparar el suelo puede requerir días adicionales.',
    'El frijol caupí actual no tiene fecha de término registrada, así que no se sabe cuándo termina.',
    'Todas las secuencias caben aritméticamente en 365 días. Eso no implica que sean viables por temporada, variedad, disponibilidad de agua, ventana comercial o descanso del terreno.',
  ],

  alternatives: [
    {
      id: 'maiz__frijol_caupi',
      role: 'reference',
      label: 'Referencia proyectada',
      note: 'Es una proyección futura hipotética del orden registrado (maíz y luego caupí), no una reconstrucción histórica: no se conoce el calendario de esos cultivos.',
      campaigns: [
        { crop: 'maiz', starts_on: '2026-12-01', ends_on: '2027-04-04' },
        { crop: 'frijol_caupi', starts_on: '2027-04-05', ends_on: '2027-06-03' },
      ],
      reasons: ['Secuencia de cultivos distintos; estudiar diversificación y demanda hídrica de maíz'],
      limitations: [
        'Sin datos de riego ni variedad; el mínimo de maíz puede no corresponder al cultivo real; el caupí está activo y su fin es desconocido',
      ],
      sources: [FUENTE_MAIZ, FUENTE_CAUPI, FUENTE_AGUA, FUENTE_SECUENCIAS],
    },
    {
      id: 'frijol_caupi__camote',
      role: 'alternative',
      label: 'Alternativa A',
      campaigns: [
        { crop: 'frijol_caupi', starts_on: '2026-12-01', ends_on: '2027-01-29' },
        { crop: 'camote', starts_on: '2027-01-30', ends_on: '2027-04-19' },
      ],
      reasons: [
        'Comparar compatibilidad entre cultivos y requerimientos por estación, sin presuponer ahorro',
      ],
      limitations: [
        'Podría repetirse caupí inmediatamente tras el cultivo activo; sin registros de plagas, manejo ni fin de ciclo',
      ],
      sources: [FUENTE_CAUPI, FUENTE_CAMOTE, FUENTE_SECUENCIAS],
    },
    {
      id: 'camote__frijol_caupi',
      role: 'alternative',
      label: 'Alternativa B',
      campaigns: [
        { crop: 'camote', starts_on: '2026-12-01', ends_on: '2027-02-18' },
        { crop: 'frijol_caupi', starts_on: '2027-02-19', ends_on: '2027-04-19' },
      ],
      reasons: ['Cambiar el primer cultivo proyectado respecto del caupí activo; comparar agua y manejo'],
      limitations: [
        'No hay análisis de suelo ni disponibilidad hídrica cuantificada; selección varietal y fechas de cosecha desconocidas',
      ],
      sources: [FUENTE_CAMOTE, FUENTE_CAUPI, FUENTE_SECUENCIAS],
    },
  ],

  comparativeReading: [
    {
      title: 'Agua',
      text:
        'No se puede declarar ahorro entre estrategias. El catálogo contiene para maíz una referencia general estacional de 500–800 mm de ETc, pero faltan necesidades comparables para caupí y camote y datos de riego, eficiencia, precipitación efectiva y agua utilizable del suelo. El valor «medium» no sirve para calcular mm por campaña.',
      sources: [FUENTE_AGUA],
    },
    {
      title: 'Suelo',
      text:
        'Incorporar una leguminosa puede ser una hipótesis de manejo a estudiar, no una promesa de mejora de fertilidad; depende de residuos, fijación efectiva, manejo y secuencia.',
      sources: [FUENTE_SECUENCIAS],
    },
    {
      title: 'Rangos generales',
      text:
        'EcoCrop informa pH óptimo maíz 5–7, caupí 5,5–7,5, camote 5–7. Son valores generales de la literatura y no mediciones de la parcela.',
      sources: [FUENTE_MAIZ, FUENTE_CAUPI, FUENTE_CAMOTE],
    },
  ],

  // Sección 6 de Milene («Para Luis»). La primera frase («Estas tres secuencias son opciones para comparar, no
  // recomendaciones validadas para tu parcela.») ya va en el aviso ámbar de arriba y no se repite aquí.
  farmerTexts: [
    'La fecha de inicio y las duraciones son supuestos del ejemplo. El cultivo de caupí actual no tiene fecha de término registrada.',
    'NASA POWER aporta información histórica de temperatura del aire y precipitación; no predice automáticamente la próxima cosecha.',
    'La disponibilidad de agua indicada como media no equivale a una cantidad de riego calculada.',
    'No se ha registrado análisis de textura, pH o salinidad. Las mediciones del kit de prueba no se usan para recomendar.',
    'Todavía faltan datos para comparar con puntuaciones confiables las alternativas.',
  ],
}
