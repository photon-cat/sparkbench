#include <Wire.h>

#define SSD1306_ADDR 0x3C

void ssd1306_cmd(uint8_t cmd) {
  Wire.beginTransmission(SSD1306_ADDR);
  Wire.write(0x00);  // control byte: command
  Wire.write(cmd);
  Wire.endTransmission();
}

void ssd1306_cmd2(uint8_t cmd, uint8_t arg) {
  Wire.beginTransmission(SSD1306_ADDR);
  Wire.write(0x00);
  Wire.write(cmd);
  Wire.write(arg);
  Wire.endTransmission();
}

void setup() {
  Wire.begin();

  // Minimal init sequence
  ssd1306_cmd(0xAE);        // display off
  ssd1306_cmd2(0x20, 0x00); // horizontal addressing mode
  ssd1306_cmd(0xAF);        // display on

  // Set full column and page range
  Wire.beginTransmission(SSD1306_ADDR);
  Wire.write(0x00);
  Wire.write(0x21); Wire.write(0); Wire.write(127); // column 0-127
  Wire.write(0x22); Wire.write(0); Wire.write(7);   // page 0-7
  Wire.endTransmission();

  // Fill with checkerboard pattern (1024 bytes in 32-byte chunks)
  for (int chunk = 0; chunk < 1024; chunk += 16) {
    Wire.beginTransmission(SSD1306_ADDR);
    Wire.write(0x40);  // control byte: data
    for (int i = 0; i < 16; i++) {
      Wire.write((chunk + i) % 2 ? 0xAA : 0x55);
    }
    Wire.endTransmission();
  }
}

void loop() {
}
