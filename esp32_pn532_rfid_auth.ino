#include <Wire.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Adafruit_PN532.h>

#define SDA_PIN 23
#define SCL_PIN 22

Adafruit_PN532 nfc(SDA_PIN, SCL_PIN);

const char* ssid = "G1.2-0-30 ELJ";
const char* password = "IT_Lager2025";

// Configure server host (change to your PC's LAN IP reachable by the ESP32)
#ifndef SERVER_IP
#define SERVER_IP "192.168.22.46"
#endif
const char* serverURL = "http://" SERVER_IP ":8000/api/rfid-auth/";
bool doorIsOpen = false;

String formatUID(const uint8_t* uid, uint8_t uidLength) {
  String cardUID = "";

  for (uint8_t i = 0; i < uidLength; i++) {
    if (uid[i] < 0x10) {
      cardUID += "0";
    }
    cardUID += String(uid[i], HEX);
  }

  cardUID.toUpperCase();
  cardUID.replace(" ", "");
  return cardUID;
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  Serial.print("[WiFi] Connecting to ");
  Serial.println(ssid);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    attempts++;

    if (attempts >= 60) {
      Serial.println();
      Serial.println("[WiFi] Connection timeout. Restarting WiFi...");
      WiFi.disconnect();
      delay(1000);
      WiFi.begin(ssid, password);
      attempts = 0;
    }
  }

  Serial.println();
  Serial.println("[WiFi] Connected");
  Serial.print("[WiFi] ESP32 IP: ");
  Serial.println(WiFi.localIP());
  Serial.print("[WiFi] Gateway: ");
  Serial.println(WiFi.gatewayIP());
  Serial.print("[WiFi] RSSI: ");
  Serial.println(WiFi.RSSI());
}

void sendRFIDToBackend(const String& cardUID, const String& doorState) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi disconnected. Reconnecting...");
    connectWiFi();
  }

  HTTPClient http;
  WiFiClient client;
  http.setTimeout(15000);

  Serial.print("[HTTP] URL: ");
  Serial.println(serverURL);

  // Use explicit WiFiClient so we get better control over connection
  if (!http.begin(client, serverURL)) {
    Serial.println("[HTTP] http.begin failed. Check server URL and network connectivity.");
    return;
  }

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");

  String jsonData = "{\"uid\":\"" + cardUID + "\",\"door\":\"" + doorState + "\"}";
  Serial.print("[HTTP] JSON payload: ");
  Serial.println(jsonData);

  int httpResponseCode = http.POST(jsonData);
  Serial.print("[HTTP] Response code: ");
  Serial.println(httpResponseCode);

  String response = http.getString();
  Serial.print("[HTTP] Backend response: ");
  Serial.println(response);

  if (httpResponseCode <= 0) {
    Serial.print("[HTTP] Error: ");
    Serial.println(http.errorToString(httpResponseCode));

    // Diagnostic: display local network status
    Serial.print("[HTTP] Local IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("[HTTP] Gateway: ");
    Serial.println(WiFi.gatewayIP());
    Serial.print("[HTTP] RSSI: ");
    Serial.println(WiFi.RSSI());

  } else if (httpResponseCode >= 200 && httpResponseCode < 300) {
    Serial.println("[HTTP] Success: backend accepted the request.");
  } else {
    Serial.println("[HTTP] Backend returned non-2xx status. Check Django logs and URL mapping.");
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println("=== ESP32 PN532 RFID Auth Debug ===");

  connectWiFi();

  Wire.begin(SDA_PIN, SCL_PIN);
  nfc.begin();

  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println("[PN532] PN532 not found. Check SDA/SCL, power, and I2C mode switches.");
    while (1) {
      delay(1000);
    }
  }

  Serial.print("[PN532] Found chip PN5");
  Serial.println((versiondata >> 24) & 0xFF, HEX);
  Serial.print("[PN532] Firmware version: ");
  Serial.print((versiondata >> 16) & 0xFF, DEC);
  Serial.print(".");
  Serial.println((versiondata >> 8) & 0xFF, DEC);

  nfc.SAMConfig();
  Serial.println("[PN532] Ready. Scan RFID card...");
}

void loop() {
  uint8_t uid[] = {0, 0, 0, 0, 0, 0, 0};
  uint8_t uidLength = 0;

  bool success = nfc.readPassiveTargetID(
    PN532_MIFARE_ISO14443A,
    uid,
    &uidLength,
    1000
  );

  if (!success) {
    return;
  }

  Serial.println();
  Serial.println("[RFID] Card detected");
  Serial.print("[RFID] UID length: ");
  Serial.println(uidLength);

  Serial.print("[RFID] Raw bytes: ");
  for (uint8_t i = 0; i < uidLength; i++) {
    if (uid[i] < 0x10) {
      Serial.print("0");
    }
    Serial.print(uid[i], HEX);
    if (i + 1 < uidLength) {
      Serial.print(" ");
    }
  }
  Serial.println();

  String cardUID = formatUID(uid, uidLength);
  Serial.print("[RFID] Formatted UID: ");
  Serial.println(cardUID);

  String doorState = doorIsOpen ? "closed" : "open";
  Serial.print("[DOOR] Requested state: ");
  Serial.println(doorState);

  sendRFIDToBackend(cardUID, doorState);
  doorIsOpen = !doorIsOpen;

  Serial.println("[RFID] Waiting 3 seconds before next scan...");
  delay(3000);
}
