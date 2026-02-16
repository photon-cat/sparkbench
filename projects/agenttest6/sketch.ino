#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Servo.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define OLED_ADDR 0x3C

#define CLK_PIN 2
#define DT_PIN  3
#define SW_PIN  4
#define SERVO_PIN 9

#define ANGLE_MIN 0
#define ANGLE_MAX 180
#define STEP_SIZE 5

// MPU6050 I2C address
#define MPU_ADDR 0x68

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
Servo myServo;

volatile int angle = 0;
volatile bool encoderMoved = false;

int lastCLK;
bool needsRedraw = true;

// Gyro data (raw and converted)
float gyroX = 0, gyroY = 0, gyroZ = 0;
unsigned long lastGyroRead = 0;
#define GYRO_INTERVAL 100  // ms between reads

void encoderISR() {
  int currentCLK = digitalRead(CLK_PIN);
  int currentDT = digitalRead(DT_PIN);
  if (currentCLK != lastCLK && currentCLK == LOW) {
    if (currentDT != currentCLK) {
      angle += STEP_SIZE;
    } else {
      angle -= STEP_SIZE;
    }
    if (angle < ANGLE_MIN) angle = ANGLE_MIN;
    if (angle > ANGLE_MAX) angle = ANGLE_MAX;
    encoderMoved = true;
  }
  lastCLK = currentCLK;
}

void initMPU6050() {
  // Wake up MPU6050
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);  // PWR_MGMT_1
  Wire.write(0x00);  // Wake up
  Wire.endTransmission(true);

  // Set gyro range to +/- 250 deg/s
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x1B);  // GYRO_CONFIG
  Wire.write(0x00);  // 250 deg/s
  Wire.endTransmission(true);

  Serial.println("MPU6050 initialized");
}

void readGyro() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x43);  // GYRO_XOUT_H
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 6, true);

  int16_t rawX = (Wire.read() << 8) | Wire.read();
  int16_t rawY = (Wire.read() << 8) | Wire.read();
  int16_t rawZ = (Wire.read() << 8) | Wire.read();

  // Convert to deg/s (sensitivity 131 LSB/(deg/s) at 250 deg/s range)
  gyroX = rawX / 131.0;
  gyroY = rawY / 131.0;
  gyroZ = rawZ / 131.0;
}

void updateDisplay() {
  display.clearDisplay();

  // --- Header ---
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(10, 0);
  display.print("Servo");
  display.setCursor(76, 0);
  display.print("Gyro");
  display.drawLine(0, 9, 127, 9, SSD1306_WHITE);

  // Vertical divider
  display.drawLine(64, 9, 64, 63, SSD1306_WHITE);

  // --- Left side: Servo angle ---
  display.setTextSize(2);
  String valStr = String(angle);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(valStr, 0, 0, &x1, &y1, &w, &h);
  int xPos = (64 - w) / 2;
  display.setCursor(xPos, 14);
  display.print(valStr);

  // Degree symbol and label
  display.setTextSize(1);
  display.setCursor(14, 34);
  display.print("degrees");

  // Mini progress bar
  int barX = 4;
  int barY = 46;
  int barW = 56;
  display.drawRect(barX, barY, barW, 7, SSD1306_WHITE);
  int fillW = map(angle, ANGLE_MIN, ANGLE_MAX, 0, barW - 2);
  if (fillW > 0) {
    display.fillRect(barX + 1, barY + 1, fillW, 5, SSD1306_WHITE);
  }

  // Min/max labels
  display.setCursor(4, 55);
  display.print("0");
  display.setCursor(42, 55);
  display.print("180");

  // --- Right side: Gyro X Y Z ---
  display.setTextSize(1);

  display.setCursor(68, 14);
  display.print("X:");
  display.setCursor(80, 14);
  display.print(gyroX, 1);

  display.setCursor(68, 28);
  display.print("Y:");
  display.setCursor(80, 28);
  display.print(gyroY, 1);

  display.setCursor(68, 42);
  display.print("Z:");
  display.setCursor(80, 42);
  display.print(gyroZ, 1);

  display.setCursor(72, 56);
  display.print("deg/s");

  display.display();
}

void setup() {
  Serial.begin(115200);
  Serial.println("Encoder + Servo + MPU6050 + OLED");

  pinMode(CLK_PIN, INPUT);
  pinMode(DT_PIN, INPUT);
  pinMode(SW_PIN, INPUT_PULLUP);

  lastCLK = digitalRead(CLK_PIN);
  attachInterrupt(digitalPinToInterrupt(CLK_PIN), encoderISR, CHANGE);

  myServo.attach(SERVO_PIN);
  myServo.write(angle);
  Serial.println("Servo attached to pin 9");

  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println("SSD1306 init failed!");
    while (true);
  }
  Serial.println("Display initialized");

  initMPU6050();
  updateDisplay();
}

void loop() {
  // Check encoder rotation
  if (encoderMoved) {
    encoderMoved = false;
    needsRedraw = true;
    myServo.write(angle);
    Serial.print("Angle: ");
    Serial.print(angle);
    Serial.println(" deg");
  }

  // Check button press (reset to 0)
  static bool lastButtonState = HIGH;
  bool buttonState = digitalRead(SW_PIN);
  if (lastButtonState == HIGH && buttonState == LOW) {
    angle = 0;
    myServo.write(0);
    needsRedraw = true;
    Serial.println("Angle reset to 0");
  }
  lastButtonState = buttonState;

  // Read gyro at regular intervals
  unsigned long now = millis();
  if (now - lastGyroRead >= GYRO_INTERVAL) {
    lastGyroRead = now;
    readGyro();
    needsRedraw = true;

    // Print to serial periodically
    Serial.print("Gyro X:");
    Serial.print(gyroX, 1);
    Serial.print(" Y:");
    Serial.print(gyroY, 1);
    Serial.print(" Z:");
    Serial.println(gyroZ, 1);
  }

  // Only redraw when something changed
  if (needsRedraw) {
    needsRedraw = false;
    updateDisplay();
  }

  delay(5);
}
