# Firmware del kit AgroOrbit (ESP32)

Sketch de Arduino que mide la **humedad del suelo** (HW-390) y la **temperatura del suelo** (DS18B20) y las envía a la API de AgroOrbit. Está en [`agroorbit_esp32/agroorbit_esp32.ino`](agroorbit_esp32/agroorbit_esp32.ino).

> Estas dos cifras son una **medición puntual en un punto del suelo**. No son humedad ni temperatura del aire, y de ellas no se infiere pH, NPK ni salinidad.

## Componentes

| Componente | Para qué |
|---|---|
| ESP32 DevKit (ESP32 Dev Module) | Microcontrolador con WiFi |
| Sensor de humedad de suelo HW-390 (analógico) | Humedad del suelo |
| Sensor de temperatura DS18B20 (a prueba de agua) | Temperatura del suelo |
| Resistencia de 4,7 kΩ | Pull-up del cable de datos del DS18B20 |

## Conexiones

| Desde | Hacia |
|---|---|
| HW-390 **AOUT** | **D34** (GPIO34, ADC1: funciona con el WiFi encendido) |
| HW-390 **VCC** / **GND** | **3V3** / **GND** |
| DS18B20 **DATA** | **D4** (GPIO4) |
| Resistencia de 4,7 kΩ | entre **DATA** (D4) y **3V3** |
| DS18B20 **VDD** / **GND** | **3V3** / **GND** |

Ambos sensores van a 3V3 y a GND. No uses 5 V: el pin D34 del ESP32 no tolera más de 3,3 V.

## Cómo cargarlo

1. En Arduino IDE instala la placa **ESP32** (Gestor de placas) y elige **ESP32 Dev Module**.
2. En *Administrar bibliotecas* instala **OneWire** y **DallasTemperature**.
3. Copia `agroorbit_esp32/secrets.example.h` como `agroorbit_esp32/secrets.h` y pon tus datos:

   | Definición | Qué es |
   |---|---|
   | `WIFI_SSID`, `WIFI_PASS` | Tu red WiFi de 2,4 GHz |
   | `API_URL` | `https://<tu-servicio>.onrender.com/api/sensors/readings` (en pruebas locales, `http://<IP de tu PC>:8000/api/sensors/readings`) |
   | `DEVICE_KEY` | Clave que devuelve la API **una sola vez** al registrar el kit (`POST /api/plots/{id}/devices`) |

   `secrets.h` está en el `.gitignore`. **No lo subas al repositorio ni lo pegues en chats o capturas.**
4. Sube el sketch y abre el *Monitor serie* a **115200**.

## Qué envía

Una vez cada **10 segundos**, por **HTTPS** a la API en Render (con una URL `http://` usa HTTP simple, útil para pruebas en tu red). Si la API estaba dormida, el primer envío puede tardar: el tiempo de espera es de 20 s.

```
POST /api/sensors/readings
Content-Type: application/json
X-Device-Key: <DEVICE_KEY>

{"device_id":"kit-lote4b-01","soil_moisture_pct":41.5,"soil_moisture_raw":2100,"soil_temp_c":27.31}
```

| Campo | Qué es | Rango que acepta la API |
|---|---|---|
| `device_id` | Identificador del kit; debe ser igual al `external_id` con el que se registró (en el sketch, `DEVICE_ID`) | 1 a 120 caracteres |
| `soil_moisture_pct` | Humedad calibrada, en % | 0 a 100 |
| `soil_moisture_raw` | Lectura cruda del ADC (promedio de 20 muestras), solo para calibrar | entero de 0 a 4095 |
| `soil_temp_c` | Temperatura del suelo, en °C | -55 a 125 |

- La cabecera **`X-Device-Key`** es la que identifica el kit y su parcela. Si falta o no corresponde al `device_id`, la API rechaza la lectura.
- El kit **no tiene reloj**: la hora de la lectura la pone el servidor al recibirla (UTC).
- Si el DS18B20 no responde, el sketch **no envía nada** (no manda valores inventados).
- Los kits de prueba (como `kit-lote4b-01`, cuyas lecturas se toman fuera del campo) aparecen en el panel como **DATO DE PRUEBA**.
- Contrato completo: [`backend/docs/api-contract.md`](../backend/docs/api-contract.md), sección «Lecturas».

## Calibración de la humedad (14-nov-2026)

El HW-390 entrega un número crudo; el sketch lo convierte a porcentaje con dos puntos medidos:

| Punto | Lectura cruda | Humedad |
|---|---|---|
| Sensor seco, al aire | **2930** | 0 % |
| Sensor sumergido en agua | **1058** | 100 % |

```
humedad % = 100 × (2930 − crudo) / (2930 − 1058)      (limitado a 0–100)
```

Se midieron el 14 de noviembre de 2026 con **este** sensor, al aire y en agua; no en un suelo real. Cada sensor cambia un poco: para otro kit, mide tus propios valores en el Monitor serie (`cruda …`) y cambia `RAW_SECO` y `RAW_HUMEDO` en el sketch. Un 0 % o un 100 % es un valor válido (sensor seco o en agua), no una falta de dato.

## Errores comunes

| Qué ves | Causa probable |
|---|---|
| No compila: `secrets.h: No such file` | Falta copiar `secrets.example.h` como `secrets.h` |
| No compila: `OneWire.h` o `DallasTemperature.h` | Faltan las bibliotecas **OneWire** y **DallasTemperature** |
| «DS18B20 no responde… No se envía» | DATA mal conectado a D4, falta la resistencia de 4,7 kΩ entre DATA y 3V3, o el sensor no está a 3V3/GND |
| Se queda en «Conectando a WiFi…» y «sin conexión» | Nombre o clave de WiFi incorrectos, o la red es de 5 GHz (el ESP32 solo usa 2,4 GHz) |
| POST con código negativo y «Error de conexión» | Sin internet, `API_URL` mal escrita (revisa `http://` / `https://` y el puerto) o la API no responde. Con Render dormida puede tardar hasta 20 s; si pasa de eso, reintenta |
| «Detalle TLS (…)» | Problema de la conexión segura (hora, red o servidor). El sketch no valida el certificado (`setInsecure`), así que no es un certificado vencido |
| **401** «la clave del dispositivo falta o es incorrecta» | `DEVICE_KEY` vacía o mal copiada. La clave solo se muestra al registrar el kit: si se perdió, hay que registrarlo de nuevo con otro `external_id` |
| **403** `device_id_mismatch` | La clave es de otro kit: `DEVICE_ID` en el sketch no coincide con el `external_id` registrado |
| **403** `device_inactive` | El dispositivo está desactivado en la API |
| **422** | Un valor fuera de rango (humedad fuera de 0–100, cruda fuera de 0–4095, temperatura fuera de -55 a 125) o `device_id` vacío |
| Humedad siempre 0 % o siempre 100 % | AOUT no conectado a D34, sensor fuera de calibración, o realmente seco / en agua. Mira el valor `cruda` en el Monitor serie |
| La lectura llega pero el panel dice «Sensor sin actualización» | Pasaron más de 15 minutos sin lecturas nuevas: revisa energía, WiFi y que el kit siga enviando |

## Limitaciones conocidas

- Para la demo el sketch **no valida el certificado del servidor** (`setInsecure`). Antes de usarlo fuera de la demo, hay que validarlo.
- Sin identificador de muestra, un reintento de red puede guardar la misma lectura dos veces (la API no puede distinguir una repetición de una muestra nueva).
- La calibración es de dos puntos (aire y agua): la humedad en suelo real puede no ser lineal.
