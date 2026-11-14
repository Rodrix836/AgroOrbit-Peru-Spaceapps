import json
import subprocess
import sys
from pathlib import Path
from unittest.mock import Mock

from scripts.ejemplo_motor_valle_chira import procesar_entrada

BACKEND = Path(__file__).resolve().parents[1]
EXAMPLES = BACKEND / "docs" / "examples"
FIXTURE = json.loads((EXAMPLES / "nasa-power-valle-chira-resumen.json").read_text(encoding="utf-8"))


def example(name):
    return json.loads((EXAMPLES / name).read_text(encoding="utf-8"))


def test_real_plot_returns_insufficient_data_and_never_scores(monkeypatch):
    import scripts.ejemplo_motor_valle_chira as demo

    compare = Mock(side_effect=AssertionError("No debe puntuar datos insuficientes."))
    monkeypatch.setattr(demo, "comparar_rotaciones", compare)
    result = procesar_entrada(example("valle-chira-insufficient-input.json"), FIXTURE)

    assert result["estado"] == "insufficient_data"
    assert result["puntuaciones_generadas"] is False
    assert result["comparacion"] is None
    assert result["contexto_nasa_power"]["temperatura_media_c"] == 27.15
    assert result["contexto_nasa_power"]["precipitacion_total_mm"] == 107.57
    assert result["contexto_nasa_power"]["datos_diarios_disponibles"] is False
    assert result["lecturas_esp32"] == {
        "recibidas": 1,
        "test_ignoradas": 1,
        "no_test_no_utilizadas": 0,
        "utilizadas_como_evidencia_agronomica": 0,
    }
    assert any(blocker["categoria"] == "datos_esenciales_parcela" for blocker in result["bloqueos"])
    assert any(blocker["categoria"] == "requisito_agronomico" for blocker in result["bloqueos"])
    compare.assert_not_called()


def test_scenario_assumptions_keep_real_values_null_and_unscored():
    result = procesar_entrada(example("valle-chira-escenario-demostracion-input.json"), FIXTURE)

    assert result["modo"] == "escenario_demostracion"
    assert result["estado"] == "insufficient_data"
    assert result["datos_reales_parcela"]["soil_ph"] is None
    assert result["datos_para_escenario"]["soil_ph"] == 6.5
    assert result["procedencia_campos"]["soil_ph"] == "supuesto_demostracion"
    assert result["supuestos_demostracion_aplicados"] == [
        "area_ha",
        "water_source",
        "water_availability",
        "soil_texture",
        "soil_ph",
        "soil_salinity_ds_m",
        "declared_irrigated",
    ]
    assert result["puntuaciones_generadas"] is False
    assert result["comparacion"] is None


def test_script_reads_local_json_and_writes_json_without_external_services(tmp_path):
    input_path = EXAMPLES / "valle-chira-insufficient-input.json"
    output_path = tmp_path / "demo-output.json"
    completed = subprocess.run(
        [
            sys.executable,
            str(BACKEND / "scripts" / "ejemplo_motor_valle_chira.py"),
            "--input",
            str(input_path),
            "--output",
            str(output_path),
        ],
        cwd=BACKEND,
        capture_output=True,
        text=True,
        check=False,
    )

    assert completed.returncode == 0, completed.stderr
    assert completed.stdout == ""
    assert json.loads(output_path.read_text(encoding="utf-8"))["estado"] == "insufficient_data"
