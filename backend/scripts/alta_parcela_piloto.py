"""Alta de la parcela piloto y del kit ESP32 en la API de AgroOrbit (solo biblioteca estándar).

Ejecútalo en tu propia terminal, con la API ya levantada y backend/.env configurado:

    cd backend
    .venv\\Scripts\\python scripts\\alta_parcela_piloto.py      # Windows
    .venv/bin/python scripts/alta_parcela_piloto.py           # Linux/macOS

No contiene credenciales: correo, contraseña y clave anon se piden al ejecutarlo.

Pide por teclado: URL de la API, URL de Supabase, clave anon pública, correo y contraseña
(oculta), y los datos confirmados de la parcela. Nunca imprime el token ni la clave del kit:
la clave se guarda en un archivo FUERA del repositorio para que se la pases a Luis por un
canal privado. Al final imprime solo el plot_id y el device_id.
"""

import getpass
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

EXTERNAL_ID = "kit-lote4b-01"
DEVICE_MODEL = "ESP32 + HW-390 + DS18B20 (prueba fuera de campo)"

# Parcela demostrativa confirmada por el equipo: ubicación representativa, no una chacra real.
DEFAULT_PLOT_NAME = "Parcela demostrativa – Valle del Chira (Sullana, Piura)"
DEFAULT_LATITUDE = "-4.97"
DEFAULT_LONGITUDE = "-80.89"


ENV_FILE = Path(__file__).resolve().parents[1] / ".env"
KEY_FILE = Path.home() / "agroorbit-secretos" / f"{EXTERNAL_ID}.key"


def env_value(name: str) -> str | None:
    """Lee una variable del entorno o, si no está, de backend/.env (sin imprimirla)."""
    if os.getenv(name):
        return os.getenv(name)
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            key, sep, value = line.strip().partition("=")
            if sep and key.strip() == name and not line.lstrip().startswith("#"):
                return value.strip().strip('"').strip("'") or None
    return None


def ask(label: str, default: str | None = None) -> str:
    suffix = f" [{default}]" if default else ""
    value = input(f"{label}{suffix}: ").strip()
    return value or (default or "")


def call(method: str, url: str, *, body=None, headers=None, ok=(200, 201)):
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        "Content-Type": "application/json; charset=utf-8", **(headers or {})})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read() or b"null")
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode("utf-8", "replace")
        if exc.code in ok:
            return exc.code, json.loads(payload)
        try:
            err = json.loads(payload).get("error") or json.loads(payload)
        except ValueError:
            err = payload[:200]
        sys.exit(f"ERROR {method} {url.split('?')[0]} -> {exc.code}: {err}")


def main() -> None:
    api = ask("URL de la API FastAPI", env_value("API_URL") or "http://localhost:8000").rstrip("/")
    supabase_url = ask("SUPABASE_URL (https://<ref>.supabase.co)", env_value("SUPABASE_URL")).rstrip("/")
    anon_key = env_value("SUPABASE_ANON_KEY") or getpass.getpass("Clave publicable (anon) de Supabase: ")
    email = ask("Correo de la cuenta propietaria de la parcela")
    password = getpass.getpass("Contraseña (oculta): ")

    print("\nDatos de la parcela (Enter acepta los confirmados por el equipo):")
    name = ask("Nombre", DEFAULT_PLOT_NAME)
    latitude = float(ask("Latitud (decimal, sur negativo)", DEFAULT_LATITUDE))
    longitude = float(ask("Longitud (decimal, oeste negativo)", DEFAULT_LONGITUDE))
    display_name = ask("Nombre visible del perfil", "Equipo AgroOrbit (demo)")
    if not name:
        sys.exit("Falta el nombre de la parcela.")

    status, health = call("GET", f"{api}/health")
    print(f"API OK ({health.get('version')})")

    _, session = call("POST", f"{supabase_url}/auth/v1/token?grant_type=password",
                      body={"email": email, "password": password}, headers={"apikey": anon_key})
    del password
    auth = {"Authorization": f"Bearer {session['access_token']}"}
    print("Sesión de Supabase iniciada.")

    status, profile = call("POST", f"{api}/api/users/me", body={"display_name": display_name}, headers=auth)
    print(f"Perfil {'creado' if status == 201 else 'actualizado'}.")

    _, plots = call("GET", f"{api}/api/plots", headers=auth)
    plot = next((p for p in plots if p["name"] == name
                 and abs(p["latitude"] - latitude) < 1e-6 and abs(p["longitude"] - longitude) < 1e-6), None)
    if plot:
        print("La parcela ya existía; se reutiliza.")
    else:
        _, plot = call("POST", f"{api}/api/plots", headers=auth,
                       body={"name": name, "latitude": latitude, "longitude": longitude})
        _, plots = call("GET", f"{api}/api/plots", headers=auth)
        if not any(p["id"] == plot["id"] for p in plots):
            sys.exit("La parcela no aparece en GET /api/plots.")
        print("Parcela creada y visible en GET /api/plots.")

    _, devices = call("GET", f"{api}/api/plots/{plot['id']}/devices", headers=auth)
    device = next((d for d in devices if d["external_id"] == EXTERNAL_ID), None)
    if device:
        print(f"El kit {EXTERNAL_ID} ya estaba registrado; su clave no se puede volver a mostrar.")
    else:
        status, device = call("POST", f"{api}/api/plots/{plot['id']}/devices", headers=auth, ok=(201,),
                              body={"external_id": EXTERNAL_ID, "model": DEVICE_MODEL})
        KEY_FILE.parent.mkdir(exist_ok=True)
        KEY_FILE.write_text(device.pop("device_key") + "\n", encoding="utf-8")
        print(f"Kit registrado. Clave guardada en {KEY_FILE} (fuera del repositorio).")

    if KEY_FILE.exists() and ask("¿Enviar una lectura de prueba del kit? (s/n)", "s").lower().startswith("s"):
        device_key = KEY_FILE.read_text(encoding="utf-8").strip()
        _, sent = call("POST", f"{api}/api/sensors/readings", headers={"X-Device-Key": device_key}, body={
            "device_id": EXTERNAL_ID, "soil_moisture_pct": 41.5, "soil_moisture_raw": 2100, "soil_temp_c": 27.31})
        del device_key
        flags = {r["quality_flag"] for r in sent["readings"]}
        print(f"Lectura de prueba guardada: {sent['inserted']} valores, quality_flag={sorted(flags)}.")
        if flags != {"test"}:
            print(f"AVISO: falta TEST_DEVICE_EXTERNAL_IDS={EXTERNAL_ID} en backend/.env (reinicia uvicorn).")

    _, history = call("GET", f"{api}/api/plots/{plot['id']}/sensors/readings?limit=5", headers=auth)
    print(f"Historial accesible: {len(history)} lecturas; quality_flag={sorted({r['quality_flag'] for r in history})}.")

    print("\nCompartir:")
    print(f"  plot_id   = {plot['id']}")
    print(f"  device_id = {device['id']}  (external_id {EXTERNAL_ID})")
    print(f"  coordenadas = {plot['latitude']}, {plot['longitude']}")


if __name__ == "__main__":
    main()
