# AgroOrbit Perú — Parcela demostrativa del Valle del Chira

Verificación del 15 de noviembre de 2026 en Supabase, proyecto AgroOrbit-Peru-Hackathon. La ubicación en Sullana, Piura, es representativa. El historial de cultivos, la próxima siembra, el agua y la prioridad son datos guardados para el escenario de demostración.

| Dato | Registro en Supabase |
| --- | --- |
| `plot_id` | `f544f739-bc06-45c6-9cf9-052c44499ab6` |
| Coordenadas | `-4.97, -80.89` |
| Cultivo anterior (`finished`) | Maíz (`maiz`), sin fechas guardadas |
| Cultivo actual (`active`) | Frijol caupí (`frijol_caupi`), sin fechas guardadas |
| Próxima siembra (`planned`) | `2026-12-01`, con cultivo por elegir |
| Agua | Media (`medium`) |
| Prioridad guardada | Mejorar el suelo (`improve_soil`) |
| Suelo | Textura, pH y salinidad sin registrar |

**NASA POWER.** Del 1 de enero de 2016 al 15 de noviembre de 2026, con 3 972 fechas distintas por variable y 3 969 valores disponibles por variable. El último valor de cada serie es del 12 de noviembre de 2026. El código revisado usa temperatura (`T2M`) y precipitación (`PRECTOTCORR`) para preparar el contexto de rotación. Las dos series de humedad (`GWETTOP` y `GWETROOT`) están disponibles para el diagnóstico.

**ESP32.** La consulta encontró 2 028 lecturas de humedad y 2 028 de temperatura del suelo para `kit-lote4b-01`. Todas tienen `quality_flag: test` y proceden de pruebas fuera del campo. El backend declara que estas mediciones quedan fuera del cálculo.

## Prueba que puede correr Rodrigo

En Swagger o con un cliente HTTP, envía este cuerpo a `POST /api/recommendations` con la cuenta autorizada para la parcela.

```json
{
  "plot_id": "f544f739-bc06-45c6-9cf9-052c44499ab6",
  "priority": "improve_soil",
  "horizon_days": 365
}
```

Al omitir `start_on`, el servicio debe tomar `2026-12-01` del ciclo planificado. Según el código de `main` revisado, el cultivo anterior, el agua y los días de clima cumplen los controles de entrada. El resultado esperado es `insufficient_data` por la textura y los requisitos pendientes del catálogo. La llamada autenticada queda por confirmar. Para probar la segunda prioridad, repite la solicitud con `"priority": "save_water"`.

## Siguiente paso del equipo

- **Elías** comparte esta ficha y mantiene la textura como faltante hasta contar con un dato confirmado. Si se acuerda una textura para el escenario, se rotula como supuesto.
- **Rodrigo** prueba la API con la parcela y comparte la respuesta sin credenciales.
- **Milene** define la rotación de referencia y las alternativas con sus fuentes. Indica si se puede evaluar cada criterio con los datos de la ficha.
- **Luis** conecta los resultados cuando disponga de las respuestas de la API y el ejemplo del escenario.
