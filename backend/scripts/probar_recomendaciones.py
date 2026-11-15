"""Prueba POST /api/recommendations sin frontend. Imprime y guarda solicitud, estado HTTP y respuesta, sin tokens.

Desde backend/:

  # Caso real: Valle del Chira con la cuenta demo (pide la contraseña sin mostrarla; lee SUPABASE_URL y
  # SUPABASE_ANON_KEY de backend/.env). Por defecto contra Render; --api local = http://localhost:8000.
  .venv/Scripts/python.exe scripts/probar_recomendaciones.py real
  .venv/Scripts/python.exe scripts/probar_recomendaciones.py real --api local --priority improve_soil
  # Cuerpo de la ficha de Valle del Chira: {"plot_id": ..., "priority": "improve_soil", "horizon_days": 365}
  .venv/Scripts/python.exe scripts/probar_recomendaciones.py real --priority improve_soil --horizon-days 365

  # Escenario de demostración (datos SINTÉTICOS, en memoria, sin credenciales ni red):
  .venv/Scripts/python.exe scripts/probar_recomendaciones.py demo
  .venv/Scripts/python.exe scripts/probar_recomendaciones.py demo --priority improve_soil --clima nasa

Correo y contraseña también por AGRO_EMAIL / AGRO_PASSWORD. El token nunca se imprime ni se guarda.
"""

import argparse
import getpass
import json
import os
import logging
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))

PLOT = "f544f739-bc06-45c6-9cf9-052c44499ab6"
APIS = {"render": "https://agroorbit-api.onrender.com", "local": "http://localhost:8000"}


def _env() -> dict:
    lines = (BACKEND / ".env").read_text(encoding="utf-8").splitlines()
    return {k.strip(): v.strip() for k, v in (line.split("=", 1) for line in lines
                                              if "=" in line and not line.lstrip().startswith("#"))}


def real(args) -> dict:
    import requests

    api = APIS.get(args.api, args.api).rstrip("/")
    env = _env()
    email = os.getenv("AGRO_EMAIL") or input("Correo de la cuenta demo: ")
    password = os.getenv("AGRO_PASSWORD") or getpass.getpass("Contraseña (oculta): ")
    login = requests.post(f"{env['SUPABASE_URL']}/auth/v1/token?grant_type=password",
                          json={"email": email, "password": password},
                          headers={"apikey": env["SUPABASE_ANON_KEY"]}, timeout=30)
    del password
    if login.status_code != 200:
        sys.exit(f"Login falló: HTTP {login.status_code}")
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    requests.get(f"{api}/health", timeout=120)  # despierta Render
    request = {"plot_id": PLOT, "priority": args.priority}
    if args.start_on:
        request["start_on"] = args.start_on
    if args.horizon_days is not None:
        request["horizon_days"] = args.horizon_days
    response = requests.post(f"{api}/api/recommendations", json=request, headers=headers, timeout=120)
    return {"api": api, "request": request, "http_status": response.status_code, "response": response.json()}


def demo(args) -> dict:
    from scripts.escenario_demostracion import run

    return {"api": "en memoria (TestClient + SQLite)",
            **run(args.priority, args.start_on, args.clima, args.horizon_days)}


def main() -> None:
    logging.getLogger("httpx").setLevel(logging.WARNING)
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="caso", required=True)
    for name in ("real", "demo"):
        p = sub.add_parser(name)
        p.add_argument("--priority", choices=["save_water", "improve_soil"], default="save_water")
        p.add_argument("--start-on", help="AAAA-MM-DD; si no se da, se usa el ciclo planned")
        p.add_argument("--horizon-days", type=int, help="90-730; si no se da, la API usa 365")
        p.add_argument("--out", help="Archivo JSON de salida (por defecto, uno junto a este script)")
        if name == "real":
            p.add_argument("--api", default="render", help="render, local o una URL")
        else:
            p.add_argument("--clima", choices=["sintetico", "nasa"], default="sintetico")
    args = parser.parse_args()

    result = real(args) if args.caso == "real" else demo(args)
    body = result["response"]
    print(f"API: {result['api']}")
    print("Solicitud: POST /api/recommendations", json.dumps(result["request"], ensure_ascii=False))
    print(f"HTTP {result['http_status']}")
    print(f"status={body.get('status')} mode={body.get('mode')} engine_version={body.get('engine_version')} "
          f"selected_id={body.get('selected_id')} start_on={body.get('context', {}).get('start_on')}")
    for m in body.get("missing", []):
        print(f"  falta {m['field']}: {m['reason']}")
    for a in body.get("alternatives", []):
        crops = " → ".join(c["crop"] for c in a["campaigns"])
        weights = ", ".join(f"{k} {v['score']}×{v['weight']}" for k, v in a.get("criteria", {}).items())
        print(f"  #{a['rank']} {a['id']} ({crops}) score {a['score']}  [{weights}]")
    for s in body.get("context", {}).get("assumptions", []):
        print(f"  supuesto {s['field']} = {s['value']}: {s['reason']}")
    out = Path(args.out) if args.out else Path(__file__).with_name(f"resultado-{args.caso}-{args.priority}.json")
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"JSON (sin token): {out}")


if __name__ == "__main__":
    main()
