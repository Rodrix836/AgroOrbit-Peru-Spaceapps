import type { NasaVariable } from '../types/api'

/** Las 9 variables de NASA POWER que guarda la API. Cada petición pide solo UNA, con su rango from/to. */
export const NASA_VARIABLES: NasaVariable[] = [
  'T2M',
  'PRECTOTCORR',
  'T2M_MAX',
  'T2M_MIN',
  'RH2M',
  'WS2M',
  'ALLSKY_SFC_SW_DWN',
  'GWETTOP',
  'GWETROOT',
]
