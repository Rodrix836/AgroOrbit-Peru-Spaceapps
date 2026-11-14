// Escenarios de ejemplo para probar cada estado de la interfaz sin API.
// Se elige con VITE_MOCK_SCENARIO (ver frontend/README.md). Solo tiene efecto con VITE_USE_MOCKS=true.

export const SCENARIOS = [
  'normal', // todo al día
  'sensor_stale', // la última lectura del sensor tiene horas
  'sensor_empty', // el sensor aún no envió nada
  'nasa_down', // NASA POWER responde 503; quedan datos guardados antiguos
  'insufficient_data', // la recomendación responde insufficient_data (missing con motivos, sin alternativas)
  'demo_mode', // la recomendación llega con mode = escenario_demostracion (por defecto en las recomendaciones)
  'format_mockup', // la recomendación llega con marcadores <...> y puntajes 0 (maqueta de formato)
  'sensor_test', // lecturas con quality_flag = test (kit de prueba)
  'sensor_suspect', // última humedad con quality_flag = suspect
  'sensor_dry', // última humedad en 0 % (clamped_dry): la barra queda vacía pero con marca
] as const

export type MockScenario = (typeof SCENARIOS)[number]

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true'
const requested = import.meta.env.VITE_MOCK_SCENARIO

if (useMocks && requested && !(SCENARIOS as readonly string[]).includes(requested)) {
  console.warn(
    `VITE_MOCK_SCENARIO="${requested}" no existe. Opciones: ${SCENARIOS.join(', ')}. Se usa "normal".`,
  )
}

/** Escenario del sensor y de NASA. Sin mocks (o valor desconocido) es siempre "normal". */
export const MOCK_SCENARIO: MockScenario =
  useMocks && (SCENARIOS as readonly string[]).includes(requested ?? '')
    ? (requested as MockScenario)
    : 'normal'

export type RecommendationScenario = 'demo_mode' | 'normal' | 'insufficient_data' | 'format_mockup'

/**
 * Escenario de la recomendación de ejemplo. Por defecto es demo_mode (ok + escenario_demostracion),
 * el plan principal de la demo. "normal" (ok + evaluacion), "insufficient_data" y "format_mockup"
 * se piden con VITE_MOCK_SCENARIO; cualquier otro valor deja demo_mode.
 * Se respeta aunque VITE_USE_MOCKS sea false, porque la recomendación puede seguir saliendo de mocks.
 */
export const RECOMMENDATION_SCENARIO: RecommendationScenario =
  requested === 'normal' || requested === 'insufficient_data' || requested === 'format_mockup'
    ? requested
    : 'demo_mode'
