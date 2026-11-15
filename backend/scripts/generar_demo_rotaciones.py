"""Genera el archivo de demo de Rotaciones para Luis: referencia proyectada + alternativas A y B.

Desde backend/ (sin credenciales; --clima nasa descarga NASA POWER público, sin token):
  .venv/Scripts/python.exe scripts/generar_demo_rotaciones.py --priority improve_soil --clima nasa
  .venv/Scripts/python.exe scripts/generar_demo_rotaciones.py --priority save_water --clima nasa

Escribe docs/examples/demo-rotaciones-valle-chira-<priority>.json (o --out RUTA).
"""

import argparse
import json
import logging
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))


def main() -> None:
    logging.getLogger("httpx").setLevel(logging.WARNING)
    from scripts.escenario_demostracion import valle_chira_demo

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--priority", choices=["improve_soil", "save_water"], default="improve_soil")
    parser.add_argument("--clima", choices=["nasa", "sintetico"], default="nasa")
    parser.add_argument("--out")
    args = parser.parse_args()

    data = valle_chira_demo(args.priority, args.clima)
    out = Path(args.out) if args.out else BACKEND / f"docs/examples/demo-rotaciones-valle-chira-{args.priority}.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    roles = {s["id"]: s["nombre"] for s in data["demo"]["estrategias"]}
    body = data["response"]
    print(f"HTTP {data['http_status']} status={body['status']} mode={body['mode']} start_on={body['context']['start_on']}")
    for a in body["alternatives"]:
        camps = " → ".join(f"{c['crop']} {c['starts_on']}..{c['ends_on']}" for c in a["campaigns"])
        print(f"  {roles[a['id']]:22} #{a['rank']} {a['id']:22} score {a['score']:6}  {camps}")
    print(f"JSON: {out}")


if __name__ == "__main__":
    main()
