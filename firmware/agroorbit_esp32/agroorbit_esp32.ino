// AgroOrbit - kit ESP32: humedad de suelo (HW-390) + temperatura de suelo (DS18B20)
// Librerias (Arduino IDE > Administrar bibliotecas): "OneWire" y "DallasTemperature".
// Placa: ESP32 Dev Module. Monitor serie a 115200.

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include "secrets.h"   // WIFI_SSID, WIFI_PASS, API_URL, DEVICE_KEY (no subir al repo)

// ---------- Pines ----------
const int PIN_HUMEDAD = 34;   // HW-390 AOUT -> GPIO34 (ADC1, funciona con WiFi encendido)
const int PIN_DS18B20 = 4;    // DS18B20 DATA -> GPIO4, con resistencia de 4,7 kOhm a 3.3V

// ---------- Calibracion del HW-390 (reemplaza con TUS mediciones) ----------
const int RAW_SECO   = 2930;  // al aire, medido 14-nov-2026
const int RAW_HUMEDO = 1058;  // en agua, medido 14-nov-2026

// ---------- Envio ----------
const char* DEVICE_ID = "kit-lote4b-01";
const unsigned long INTERVALO_MS = 10000;  // una lectura cada 10 segundos

OneWire oneWire(PIN_DS18B20);
DallasTemperature ds18b20(&oneWire);
unsigned long ultimoEnvio = 0;

void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Conectando a WiFi");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < 15000) {
    delay(500);
    Serial.print(".");
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(" OK, IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println(" sin conexion; se reintenta en el siguiente ciclo.");
  }
}

// Promedia varias muestras para reducir el ruido del ADC.
int leerHumedadCruda() {
  long suma = 0;
  const int muestras = 20;
  for (int i = 0; i < muestras; i++) {
    suma += analogRead(PIN_HUMEDAD);
    delay(5);
  }
  return suma / muestras;
}

float crudoAPorcentaje(int crudo) {
  float pct = 100.0 * (RAW_SECO - crudo) / (float)(RAW_SECO - RAW_HUMEDO);
  return constrain(pct, 0.0, 100.0);
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("AgroOrbit kit - firmware v3 (HTTPS)");
  Serial.print("Enviando a: ");
  Serial.println(API_URL);
  analogReadResolution(12);                       // lecturas de 0 a 4095
  analogSetPinAttenuation(PIN_HUMEDAD, ADC_11db); // rango completo hasta ~3.3 V
  ds18b20.begin();
  conectarWiFi();
}

void loop() {
  if (millis() - ultimoEnvio < INTERVALO_MS) return;
  ultimoEnvio = millis();

  int crudo = leerHumedadCruda();
  float humedad = crudoAPorcentaje(crudo);

  ds18b20.requestTemperatures();
  float temp = ds18b20.getTempCByIndex(0);

  if (temp == DEVICE_DISCONNECTED_C) {
    Serial.println("DS18B20 no responde: revisa el cableado y la resistencia de 4,7 kOhm. No se envia.");
    return;
  }

  Serial.printf("Humedad: %.1f %% (cruda %d) | Temp suelo: %.2f C\n", humedad, crudo, temp);

  conectarWiFi();
  if (WiFi.status() != WL_CONNECTED) return;

  char json[160];
  snprintf(json, sizeof(json),
           "{\"device_id\":\"%s\",\"soil_moisture_pct\":%.1f,\"soil_moisture_raw\":%d,\"soil_temp_c\":%.2f}",
           DEVICE_ID, humedad, crudo, temp);

  // Si API_URL empieza con https:// (Render) se usa conexion segura.
  // Para la demo no se valida el certificado del servidor (setInsecure).
  WiFiClientSecure clienteSeguro;
  clienteSeguro.setInsecure();
  HTTPClient http;
  http.setTimeout(20000);  // Render puede tardar si estaba dormida
  if (String(API_URL).startsWith("https://")) {
    http.begin(clienteSeguro, API_URL);
  } else {
    http.begin(API_URL);
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  int codigo = http.POST(json);

  Serial.printf("POST %s -> %d\n", json, codigo);
  if (codigo < 0) {
    Serial.printf("Error de conexion: %s\n", http.errorToString(codigo).c_str());
    char detalle[120] = "";
    int errTls = clienteSeguro.lastError(detalle, sizeof(detalle));
    if (errTls != 0) Serial.printf("Detalle TLS (%d): %s\n", errTls, detalle);
  } else if (codigo == 401) {
    Serial.println("401: la clave del dispositivo falta o es incorrecta.");
  }
  http.end();
}
