#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  pinMode(A0, INPUT);
}

void loop() {
  int value = analogRead(A0);
  Serial.print("ADC:");
  Serial.println(value);
  delay(100);
}
