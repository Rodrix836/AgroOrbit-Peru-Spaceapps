# Propuesta de formato de persistencia para Elías

**Propuesta de intercambio, no contrato API ni diseño de tabla.** No se crearon rutas, modelos ni migraciones. El objeto `api_response` debe contener íntegra la respuesta de `POST /api/recommendations` tal como llegó. Los otros campos documentan los insumos necesarios para intentar repetir el cálculo. Conservar datos de una parcela requiere aplicar el mismo control de propietario que la API.

```json
{
  "record_schema_version": "propuesta-1",
  "calculation_id": "<UUID único del registro>",
  "plot_id": "<UUID de la parcela>",
  "captured_at": "<fecha y hora UTC ISO 8601>",
  "engine_version": "motor-1.0",
  "catalog_version": "<hash SHA-256 de la representación canónica de la ficha usada>",
  "request": {"plot_id": "<UUID>", "priority": "save_water", "start_on": null, "horizon_days": 365},
  "resolved_inputs": {
    "start_on": "<AAAA-MM-DD o null>",
    "plot": {"water_availability": "low", "soil_texture": "<texto o null>", "soil_ph": null, "soil_salinity_ds_m": null},
    "crop_cycles": ["<copia de ciclos usados, con IDs, códigos, estados y fechas>"],
    "previous_crop_code": "<código o null>"
  },
  "climate_snapshot": {
    "source": "NASA POWER",
    "time_standard": "LST",
    "latitude": "<coordenada del punto consultado>",
    "longitude": "<coordenada del punto consultado>",
    "start": "<AAAA-MM-DD>", "end": "<AAAA-MM-DD>",
    "variables": {"T2M": "C", "PRECTOTCORR": "mm/day"},
    "daily_rows": ["<fecha, variable, valor o null, unidad, fetched_at de cada fila usada>"],
    "quality": {"valid_t2m_days": 0, "valid_precip_days": 0, "coverage_by_campaign": []}
  },
  "crop_requirements_snapshot": {
    "maiz": {"<campo exacto>": "<valor o null>", "fuentes": ["<título, URL, campos, nota>"]}
  },
  "evaluation_snapshot": {
    "mode": "evaluacion o escenario_demostracion",
    "priority_weights": {"clima": 0, "agua": 0, "suelo": 0, "diversificacion": 0},
    "weights_provenance": ["<fuentes o marca inequívoca SYNTHETIC>"],
    "candidates": [
      {"id": "<id>", "campaigns": [], "criteria": {
        "clima": {"score": 0, "reasons": [], "limitations": [], "sources": []},
        "agua": {"score": 0, "reasons": [], "limitations": [], "sources": []},
        "suelo": {"score": 0, "reasons": [], "limitations": [], "sources": []},
        "diversificacion": {"score": 0, "reasons": [], "limitations": [], "sources": []}
      }}
    ]
  },
  "assumptions": [],
  "limitations": [],
  "api_response": {"<respuesta completa, sin reinterpretar ni omitir campos>": "..."}
}
```

Los `0`, `null` y textos entre `<...>` son **marcadores de estructura**, no valores recomendados para almacenar como si fueran observaciones. Para un `insufficient_data`, `evaluation_snapshot` puede quedar en `null` si el motor no llegó a evaluar candidatos. Para datos de demostración, marcar **cada** entrada sintética, incluso filas que el código inserte en `nasa_observation`; la etiqueta contractual `NASA POWER` de `api_response.context.power.source` no convierte esas filas en observaciones reales.

**Guardar una respuesta histórica** exige conservar `api_response`, identificadores y fecha para mostrar exactamente lo que se entregó entonces, aun cuando el algoritmo o los datos cambien. **Recalcular** exige además las entradas resueltas y las observaciones diarias exactas, fichas y fuentes tal como estaban, evaluaciones por criterio, pesos y su procedencia, supuestos, versiones de código y reglas de redondeo/orden. Un `engine_version` solo no basta: hoy el catálogo y el evaluador no tienen identificadores de versión propios. El hash del catálogo es una propuesta para el registro, no una versión que el motor ya emita.

Elías puede decidir el medio de almacenamiento y la política de acceso cuando se acuerde el contrato de persistencia con Rodrigo. Este documento permite preparar esa decisión sin tocar Supabase ni ampliar la respuesta pública actual.
