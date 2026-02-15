#include <Arduino.h>
#include <Servo.h>

Servo myServo;

void setup() {
  Serial.begin(115200);
  myServo.attach(9);
  myServo.write(0);
  delay(50);
  Serial.println("ANGLE:0");

  myServo.write(90);
  delay(50);
  Serial.println("ANGLE:90");

  myServo.write(180);
  delay(50);
  Serial.println("ANGLE:180");

  myServo.write(45);
  delay(50);
  Serial.println("ANGLE:45");
}

void loop() {
  delay(1000);
}
