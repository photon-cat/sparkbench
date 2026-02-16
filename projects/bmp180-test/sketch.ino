#include <Wire.h>
#include <Adafruit_BMP085.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Adafruit_BMP085 bmp;

// Encoder pins
#define ENC_CLK 2
#define ENC_DT  3
#define ENC_SW  4

volatile int encoderPos = 0;
volatile bool encoderChanged = false;
bool lastButtonState = HIGH;
int menuIndex = 0; // 0=overview, 1=temp detail, 2=pressure detail

void encoderISR() {
  if (digitalRead(ENC_DT) == LOW) {
    encoderPos++;
  } else {
    encoderPos--;
  }
  encoderChanged = true;
}

void setup() {
  Serial.begin(115200);

  // Encoder setup
  pinMode(ENC_CLK, INPUT_PULLUP);
  pinMode(ENC_DT, INPUT_PULLUP);
  pinMode(ENC_SW, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC_CLK), encoderISR, FALLING);

  // OLED init
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 failed!");
    while (1);
  }
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Starting...");
  display.display();

  // BMP180 init
  if (!bmp.begin()) {
    Serial.println("BMP180 not found!");
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("BMP180 FAIL");
    display.display();
    while (1);
  }

  Serial.println("BMP180 ready");
  Serial.println("Encoder ready");
  delay(500);
}

void loop() {
  // Read BMP180
  float temperature = bmp.readTemperature();
  int32_t pressure = bmp.readPressure();
  float altitude = bmp.readAltitude();

  // Check encoder rotation
  if (encoderChanged) {
    encoderChanged = false;
    Serial.print("ENC:");
    Serial.println(encoderPos);
  }

  // Check encoder button
  bool buttonState = digitalRead(ENC_SW);
  if (buttonState == LOW && lastButtonState == HIGH) {
    menuIndex = (menuIndex + 1) % 3;
    Serial.print("BTN:menu=");
    Serial.println(menuIndex);
  }
  lastButtonState = buttonState;

  // Print sensor data on serial
  Serial.print("T:");
  Serial.print(temperature, 1);
  Serial.print(" P:");
  Serial.print(pressure);
  Serial.print(" A:");
  Serial.println(altitude, 1);

  // Update OLED
  display.clearDisplay();
  display.setCursor(0, 0);

  if (menuIndex == 0) {
    // Overview
    display.setTextSize(1);
    display.println("BMP180 + Encoder");
    display.println();
    display.print("Temp: ");
    display.print(temperature, 1);
    display.println(" C");
    display.print("Pres: ");
    display.print(pressure / 100.0, 1);
    display.println(" hPa");
    display.print("Alt:  ");
    display.print(altitude, 1);
    display.println(" m");
    display.println();
    display.print("Enc: ");
    display.print(encoderPos);
  } else if (menuIndex == 1) {
    // Temperature detail
    display.setTextSize(1);
    display.println("== Temperature ==");
    display.println();
    display.setTextSize(2);
    display.print(temperature, 1);
    display.setTextSize(1);
    display.println(" C");
  } else {
    // Pressure detail
    display.setTextSize(1);
    display.println("== Pressure ==");
    display.println();
    display.setTextSize(2);
    display.print(pressure / 100.0, 0);
    display.setTextSize(1);
    display.println(" hPa");
    display.println();
    display.print("Alt: ");
    display.print(altitude, 1);
    display.println(" m");
  }

  display.display();
  delay(500);
}
