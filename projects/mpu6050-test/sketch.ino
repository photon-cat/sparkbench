#include <Arduino.h>
#include <Wire.h>

// Simple MPU6050 reader without library dependency
#define MPU6050_ADDR 0x68
#define REG_PWR_MGMT_1 0x6B
#define REG_ACCEL_XOUT_H 0x3B
#define REG_WHO_AM_I 0x75

int16_t readInt16(uint8_t reg) {
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU6050_ADDR, 2);
  int16_t val = (Wire.read() << 8) | Wire.read();
  return val;
}

void setup() {
  Serial.begin(115200);
  Wire.begin();

  // Wake up MPU6050
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(REG_PWR_MGMT_1);
  Wire.write(0);
  Wire.endTransmission();
  delay(100);

  // Check WHO_AM_I
  int16_t whoami = readInt16(REG_WHO_AM_I);
  Serial.print("WHO:");
  Serial.println(whoami >> 8, HEX);
}

void loop() {
  int16_t ax = readInt16(REG_ACCEL_XOUT_H);
  int16_t ay = readInt16(REG_ACCEL_XOUT_H + 2);
  int16_t az = readInt16(REG_ACCEL_XOUT_H + 4);

  // Print raw values
  Serial.print("A:");
  Serial.print(ax);
  Serial.print(",");
  Serial.print(ay);
  Serial.print(",");
  Serial.println(az);

  delay(500);
}
