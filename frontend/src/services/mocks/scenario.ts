// Escenarios de ejemplo para probar cada estado de la interfaz sin API.
// Se elige con VITE_MOCK_SCENARIO (ver frontend/README.md). Solo tiene efecto con VITE_USE_MOCKS=true.

export const SCENARIOS = [
  'normal', // todo al día
  'sensor_stale', // la última lectura del sensor tiene horas
  'sensor_empty', // el sensor aún no envió nada
  'nasa_down', // NASA POWER responde 503; quedan datos guardados antiguos
  'insufficient_data', // la recomendación responde insufficient_data
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

/** Escenario activo. Sin mocks (o valor desconocido) es siempre "normal". */
export const MOCK_SCENARIO: MockScenario =
  useMocks && (SCENARIOS as readonly string[]).includes(requested ?? '')
    ? (requested as MockScenario)
    : 'normal'
