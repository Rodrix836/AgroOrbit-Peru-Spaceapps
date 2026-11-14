# Ejemplo local del motor de rotaciones

El ejemplo usa los módulos existentes `app.engine.rotation`, `app.engine.scoring` y `app.data.crops`. No crea un motor alternativo, no accede a una API ni a la base de datos y no necesita modificar la parcela.

## Ejecutar

Desde `backend`:

```powershell
python scripts\ejemplo_motor_valle_chira.py --input docs\examples\valle-chira-insufficient-input.json
```

El JSON se escribe en stdout. Para guardar el resultado:

```powershell
python scripts\ejemplo_motor_valle_chira.py `
  --input docs\examples\valle-chira-insufficient-input.json `
  --output docs\examples\valle-chira-insufficient-output.json
```

Hay dos pares de entrada/salida:

- `valle-chira-insufficient-input.json` y `valle-chira-insufficient-output.json`: datos actuales incompletos.
- `valle-chira-escenario-demostracion-input.json` y `valle-chira-escenario-demostracion-output.json`: supuestos hipotéticos separados de los datos reales.

Ambos resultados son `insufficient_data`; ninguno contiene puntuaciones ni compara rotaciones. El segundo ejemplo demuestra que los supuestos se identifican como tales, pero no los presenta como mediciones ni resuelve la falta de requisitos de cultivo documentados.

## Datos y límites

- La ubicación es representativa: `plot_id=f544f739-bc06-45c6-9cf9-052c44499ab6`, latitud `-4.97`, longitud `-80.89`; no identifica una parcela real.
- Se consideran esenciales para el ejemplo el área, fuente y disponibilidad de agua, textura, pH, salinidad y condición de riego. En la entrada operativa están en `null`.
- El fixture `nasa-power-valle-chira-resumen.json` conserva solo los agregados recibidos: 27.15 °C, 107.57 mm, 11 días válidos de 14 y `-999` como código de faltante. No se proporcionó la serie diaria; por eso no se reconstruyen valores ni se invocan la normalización diaria y los indicadores de NASA POWER. Este periodo es contexto, no climatología de campaña.
- Las lecturas ESP32 con `quality_flag="test"` se cuentan como ignoradas y nunca se usan como evidencia agronómica. El ejemplo tampoco utiliza otras lecturas para puntuar.
- `app.data.crops.CULTIVOS` mantiene los requisitos de temperatura y agua en `null` y `fuentes` vacías. No se añadieron umbrales ni referencias bibliográficas sin sustento. Los bloqueos de salida enumeran requisitos y referencias faltantes para cada cultivo utilizado.
- Para sustentar un requisito, el catálogo debe contener el valor y una entrada en `fuentes` con `titulo`, `url` HTTP(S) y `campos` que identifique qué requisitos respalda. El script comprueba la estructura y asociación local; no consulta ni certifica el contenido de la fuente. Esa verificación debe hacerse antes de incorporar cada referencia.
- El scorer existente solo calcula una suma ponderada de puntuaciones ya provistas; no deriva puntuaciones agronómicas ni justifica ponderaciones. El ejemplo no reutiliza los valores demostrativos arbitrarios de `probar_scoring.py`. Una comparación requiere datos esenciales completos, requisitos de todos los cultivos con referencias asociadas y puntuaciones/ponderaciones con referencias por criterio.

## Pruebas

Desde `backend`:

```powershell
pytest tests\test_rotation_demo.py
pytest
```
