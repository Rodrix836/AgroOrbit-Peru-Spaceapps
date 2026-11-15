// Datos privados del kit. Copia este archivo como "secrets.h" (en esta misma carpeta)
// y reemplaza los valores de ejemplo por los tuyos.
// secrets.h está en el .gitignore: NO lo subas al repositorio.

#pragma once

// Red WiFi de 2,4 GHz (el ESP32 no se conecta a redes de 5 GHz).
#define WIFI_SSID  "nombre-de-tu-wifi"
#define WIFI_PASS  "clave-de-tu-wifi"

// Ruta de la API que recibe las lecturas (POST /api/sensors/readings).
// Pruebas en tu red:  "http://192.168.1.50:8000/api/sensors/readings"
// Producción (Render): "https://tu-servicio.onrender.com/api/sensors/readings"
#define API_URL    "https://tu-servicio.onrender.com/api/sensors/readings"

// Clave que devuelve la API una sola vez al registrar el kit (empieza con "aok_").
#define DEVICE_KEY "aok_clave-de-ejemplo-reemplazala"
