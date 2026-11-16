import { getLang } from './active'
import { DATA_PATTERNS, DATA_TEXT_EN } from './dataTexts'

// Textos que NO son de la interfaz sino de los datos: respuestas de la API, archivos de demostración de Rodrigo y
// contenido de Milene. Llegan escritos en español. Si el idioma activo es inglés se traducen con el diccionario
// (`dataTexts.ts`: coincidencia exacta y patrones para frases con números); si un texto no está, se muestra tal cual
// llegó (en español) en vez de inventar una traducción. En español nunca se toca el texto.

const exact = new Map(Object.entries(DATA_TEXT_EN))

/** Traduce un texto de datos al idioma activo (solo hay traducciones al inglés). */
export function td(text: string): string {
  if (getLang() !== 'en') return text
  const hit = exact.get(text)
  if (hit !== undefined) return hit
  for (const [re, make] of DATA_PATTERNS) {
    const m = re.exec(text)
    if (m) return make(m)
  }
  return text
}
