#include <Arduino.h>
#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(115200);
  dht.begin();
  delay(2000); // DHT22 needs time to stabilize
}

void loop() {
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  if (!isnan(temp) && !isnan(hum)) {
    Serial.print("T:");
    Serial.print((int)(temp * 10));
    Serial.print(" H:");
    Serial.println((int)(hum * 10));
  } else {
    Serial.println("ERR");
  }
  delay(2000);
}
