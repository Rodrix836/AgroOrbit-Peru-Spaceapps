# Persistencia de NASA POWER

La migración `20261114204035_create_nasa_observation.sql` prepara la tabla que usará FastAPI. La ruta de consulta de clima de Milene se integra por separado.

Para la parcela demostrativa del Valle del Chira, usa `-4.97`, `-80.89`, comunidad `AG`, `time-standard=LST` y los parámetros `T2M` y `PRECTOTCORR`. Persiste una fila por parcela, variable y fecha `AAAA-MM-DD`. Conserva el punto consultado en `latitude` y `longitude`, y la procedencia `NASA POWER` en `source`.

| Variable | Unidad de POWER | Valor faltante |
| --- | --- | --- |
| `T2M` | `C` | `null` |
| `PRECTOTCORR` | `mm/day` | `null` |

Convierte el valor que indica `header.fill_value` en `null`. Conserva el `0` de precipitación como un día válido. En el historial, filtra por las coordenadas actuales de la parcela y devuelve `id`, `variable`, `observed_on`, `value`, `unit` y `source`.

Para reimportar, usa `ON CONFLICT (plot_id, variable, observed_on) DO UPDATE` y actualiza el valor, las coordenadas y `fetched_at`. Una respuesta con un valor faltante no debe reemplazar un dato válido ya guardado para el mismo punto. El conjunto usa días en hora solar local. Si cambia el punto, importa de nuevo la serie para el punto actualizado.

Las observaciones de POWER describen el clima del punto representativo. Las lecturas de prueba del ESP32 se guardan aparte, con `quality_flag = 'test'`.
