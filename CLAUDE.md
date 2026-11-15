# AgroOrbit — reglas del proyecto

Hackatón NASA Space Apps, 48 horas. Prototipo de apoyo a decisiones para rotación de cultivos (piloto en Piura/Sullana). Equipo: Rodrigo (API), Milene (servicios), Elias (Supabase), Luis (frontend y ESP32).

## Alcance de trabajo

- Solo se trabaja en `frontend/` y `firmware/agroorbit_esp32/`.
- **No tocar `backend/` ni `supabase/`.** Si hace falta un cambio ahí, anotarlo y pedírselo al responsable (Rodrigo para la API, Elias para Supabase).
- Los contratos compartidos (JSON, nombres de campos, unidades, estados) se acuerdan con el equipo antes de cambiarlos. Partir de `backend/docs/api-contract.md` (solo lectura).

## Stack

- React + Vite + TypeScript + Tailwind.
- React Router para navegación.
- Recharts para gráficos.

## Datos y seguridad

- Supabase Auth se usa **solo para identidad**.
- Todos los datos salen de la API FastAPI a través de `src/services/api.ts`. No llamar a la API desde componentes con `fetch` suelto.
- Nunca poner credenciales de PostgreSQL (ni claves de servicio) en el frontend. Las variables de entorno del cliente son solo la URL y la clave pública (anon) de Supabase y la URL de la API.
- El ESP32 envía sus lecturas a FastAPI (`POST /api/devices/readings`) con la cabecera `X-Device-Key`. No incluir claves reales en el repositorio; usar placeholders o archivo de configuración ignorado por git.

## Reglas de presentación de datos

- **Todo dato en pantalla muestra unidad, fecha/hora y fuente.**
- La **medición puntual del sensor ESP32** (humedad del suelo en %, temperatura del suelo en °C) y el **contexto regional NASA POWER** (temperatura del aire, lluvia, etc.) se muestran **siempre separados**, con rótulos claros. Nunca mezclarlos en una misma cifra ni presentar POWER como medición sobre la planta.
- La humedad cruda (`raw_value`) va solo en un detalle técnico de calibración.
- No inferir pH, NPK ni salinidad a partir de humedad y temperatura del suelo.
- Si una lectura es guardada/reproducida, mostrar su fecha real y que es una lectura registrada.
- **Nunca inventar valores faltantes.** Si falta un dato o la API devuelve `insufficient_data`, mostrar el estado de datos insuficientes (y qué falta). Sin valores por defecto fabricados, sin interpolar.
- Estados obligatorios en cada vista con datos: cargando, datos insuficientes, sensor sin actualización, NASA no disponible, error de API.

## Recomendaciones de rotación

- Los puntajes son **criterios del prototipo**: no presentarlos como probabilidad de éxito ni como rendimiento esperado.
- **Sin promesas de porcentaje de ahorro** de agua, aumento de rendimiento ni mejora medida del suelo.
- Cada alternativa muestra: razones, limitaciones, fuentes y calendario de dos campañas.
- Cambiar la prioridad (ahorrar agua / mejorar el suelo) recalcula; el ganador puede no cambiar y eso es válido.
- Los campos nuevos del contrato (`alternatives`, `start_on`) no están implementados hasta que Rodrigo lo confirme; usar respuestas de ejemplo acordadas mientras tanto y marcarlas como tales.

## Interfaz

- Todo el texto de la interfaz en **español**, lenguaje sencillo, pensado para un agricultor de Piura.
- Debe verse bien en **celular** (mobile first) y en **proyector** (alto contraste, tipografía grande, sin depender de hover).
- Fechas en formato local (Perú, UTC-5); recordar que POWER usa tiempo solar local y los sensores UTC.

## Forma de trabajar

- **Prioriza que funcione sobre que quede perfecto.** Primero el recorrido completo (parcela → datos → recomendación → comparación), después el pulido.
- Commits pequeños y frecuentes en la rama `frontend`.
- Si a la hora 16 no hay recomendación visible, todo el esfuerzo va a completar ese flujo. Si a la hora 24 faltan alternativas, recortar mejoras de mapa y segunda fuente NASA (el mapa puede ser un punto con coordenadas).
