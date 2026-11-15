import type { NasaVariable } from '../types/api'

/**
 * Las 4 variables de NASA POWER que admite la API. Cada petición pide solo UNA, con su rango from/to.
 * No agregar otras: T2M_MAX, T2M_MIN, RH2M, WS2M y ALLSKY_SFC_SW_DWN dan 422 hasta que el backend las admita.
 */
export const NASA_VARIABLES: NasaVariable[] = ['T2M', 'PRECTOTCORR', 'GWETTOP', 'GWETROOT']
