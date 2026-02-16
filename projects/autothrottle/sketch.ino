/**
 * Autothrottle Controller
 *
 * Pitot-static airspeed measurement with PID-controlled throttle servo.
 *
 * Hardware:
 *   - BMP180 #1 (0x77): Pitot tube (total pressure = static + dynamic)
 *   - BMP180 #2 (0x76): Static port (ambient pressure)
 *   - SSD1306 OLED: Display current/target speed, A/T status
 *   - KY-040 Encoder: Set target airspeed (knots)
 *   - Servo on pin 9: Throttle position (0°=idle, 180°=full)
 *
 * Uses raw I2C register access for both BMP180 sensors to support
 * two sensors on the same bus at different addresses.
 *
 * Airspeed formula (IAS from differential pressure):
 *   IAS = sqrt(2 * (Pt - Ps) / rho)
 *   where rho = 1.225 kg/m³ (sea level standard density)
 *   Convert m/s to knots: * 1.94384
 */

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Servo.h>

// === Pin definitions ===
#define ENC_CLK     2
#define ENC_DT      3
#define ENC_SW      4
#define SERVO_PIN   9

// === BMP180 I2C addresses ===
#define PITOT_ADDR  0x77
#define STATIC_ADDR 0x76

// === BMP180 registers ===
#define BMP_REG_CONTROL  0xF4
#define BMP_REG_RESULT   0xF6
#define BMP_CMD_TEMP     0x2E
#define BMP_CMD_PRESSURE 0x34  // oss=0

// === Display ===
#define SCREEN_W 128
#define SCREEN_H 64
Adafruit_SSD1306 display(SCREEN_W, SCREEN_H, &Wire, -1);

// === Servo ===
Servo throttleServo;
float throttlePos = 0;  // 0-180 degrees

// === Autothrottle state ===
bool atEngaged = false;
float targetKnots = 120;  // target IAS in knots
float currentKnots = 0;
const float MIN_SPEED = 60;
const float MAX_SPEED = 250;
const float SPEED_INCREMENT = 5; // knots per encoder click

// === PID controller ===
float Kp = 1.5;
float Ki = 0.3;
float Kd = 0.5;
float integral = 0;
float prevError = 0;
unsigned long lastPidTime = 0;
const float INTEGRAL_MAX = 50;  // anti-windup

// === Encoder ===
volatile int encoderDelta = 0;
bool lastButtonState = HIGH;
unsigned long lastDebounce = 0;
const unsigned long DEBOUNCE_MS = 200;

// === Constants ===
const float RHO_SEA_LEVEL = 1.225;  // kg/m³
const float MS_TO_KNOTS = 1.94384;

// === BMP180 calibration data (per sensor) ===
struct BMP180Cal {
  int16_t ac1, ac2, ac3;
  uint16_t ac4, ac5, ac6;
  int16_t b1, b2, mb, mc, md;
};

BMP180Cal pitotCal, staticCal;

// --- Raw I2C helpers ---

uint8_t bmpRead8(uint8_t addr, uint8_t reg) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.endTransmission();
  Wire.requestFrom(addr, (uint8_t)1);
  return Wire.read();
}

uint16_t bmpRead16(uint8_t addr, uint8_t reg) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.endTransmission();
  Wire.requestFrom(addr, (uint8_t)2);
  uint16_t val = Wire.read() << 8;
  val |= Wire.read();
  return val;
}

void bmpWrite8(uint8_t addr, uint8_t reg, uint8_t val) {
  Wire.beginTransmission(addr);
  Wire.write(reg);
  Wire.write(val);
  Wire.endTransmission();
}

bool bmpInit(uint8_t addr, BMP180Cal &cal) {
  // Verify chip ID
  uint8_t id = bmpRead8(addr, 0xD0);
  if (id != 0x55) return false;

  // Read calibration data
  cal.ac1 = (int16_t)bmpRead16(addr, 0xAA);
  cal.ac2 = (int16_t)bmpRead16(addr, 0xAC);
  cal.ac3 = (int16_t)bmpRead16(addr, 0xAE);
  cal.ac4 = bmpRead16(addr, 0xB0);
  cal.ac5 = bmpRead16(addr, 0xB2);
  cal.ac6 = bmpRead16(addr, 0xB4);
  cal.b1  = (int16_t)bmpRead16(addr, 0xB6);
  cal.b2  = (int16_t)bmpRead16(addr, 0xB8);
  cal.mb  = (int16_t)bmpRead16(addr, 0xBA);
  cal.mc  = (int16_t)bmpRead16(addr, 0xBC);
  cal.md  = (int16_t)bmpRead16(addr, 0xBE);
  return true;
}

int32_t bmpReadPressure(uint8_t addr, const BMP180Cal &cal) {
  // Read uncompensated temperature
  bmpWrite8(addr, BMP_REG_CONTROL, BMP_CMD_TEMP);
  delay(5);
  int32_t UT = (int32_t)bmpRead16(addr, BMP_REG_RESULT);

  // Read uncompensated pressure (oss=0)
  bmpWrite8(addr, BMP_REG_CONTROL, BMP_CMD_PRESSURE);
  delay(5);
  int32_t UP = (int32_t)bmpRead16(addr, BMP_REG_RESULT);

  // Compute true temperature (for B5)
  int32_t X1 = ((UT - (int32_t)cal.ac6) * (int32_t)cal.ac5) >> 15;
  int32_t X2 = ((int32_t)cal.mc << 11) / (X1 + (int32_t)cal.md);
  int32_t B5 = X1 + X2;

  // Compute true pressure
  int32_t B6 = B5 - 4000;
  X1 = ((int32_t)cal.b2 * ((B6 * B6) >> 12)) >> 11;
  X2 = ((int32_t)cal.ac2 * B6) >> 11;
  int32_t X3 = X1 + X2;
  int32_t B3 = ((((int32_t)cal.ac1 * 4 + X3)) + 2) / 4; // oss=0

  X1 = ((int32_t)cal.ac3 * B6) >> 13;
  X2 = ((int32_t)cal.b1 * ((B6 * B6) >> 12)) >> 16;
  X3 = ((X1 + X2) + 2) >> 2;
  uint32_t B4 = ((uint32_t)cal.ac4 * (uint32_t)(X3 + 32768)) >> 15;
  uint32_t B7 = ((uint32_t)UP - B3) * 50000UL; // oss=0

  int32_t p;
  if (B7 < 0x80000000UL) {
    p = (B7 * 2) / B4;
  } else {
    p = (B7 / B4) * 2;
  }

  X1 = (p >> 8) * (p >> 8);
  X1 = (X1 * 3038) >> 16;
  X2 = (-7357L * p) >> 16;
  p = p + ((X1 + X2 + 3791) >> 4);

  return p;
}

void encoderISR() {
  if (digitalRead(ENC_DT) == LOW) {
    encoderDelta++;
  } else {
    encoderDelta--;
  }
}

float computeAirspeed(float pitotPa, float staticPa) {
  float diffP = pitotPa - staticPa;
  if (diffP < 0) diffP = 0;
  // IAS = sqrt(2 * qc / rho0)
  float ias_ms = sqrt(2.0 * diffP / RHO_SEA_LEVEL);
  return ias_ms * MS_TO_KNOTS;
}

float pidUpdate(float error, float dt) {
  if (dt <= 0) return 0;

  integral += error * dt;
  if (integral > INTEGRAL_MAX) integral = INTEGRAL_MAX;
  if (integral < -INTEGRAL_MAX) integral = -INTEGRAL_MAX;

  float derivative = (error - prevError) / dt;
  prevError = error;

  return Kp * error + Ki * integral + Kd * derivative;
}

void setup() {
  Serial.begin(115200);
  Wire.begin();

  // Encoder
  pinMode(ENC_CLK, INPUT_PULLUP);
  pinMode(ENC_DT, INPUT_PULLUP);
  pinMode(ENC_SW, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ENC_CLK), encoderISR, FALLING);

  // Servo
  throttleServo.attach(SERVO_PIN);
  throttleServo.write(0);

  // Display
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED FAIL");
    while (1);
  }
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.println("A/T INIT...");
  display.display();

  // Init pitot BMP180 at 0x77
  if (!bmpInit(PITOT_ADDR, pitotCal)) {
    Serial.println("PITOT FAIL");
    display.println("PITOT FAIL");
    display.display();
    while (1);
  }

  // Init static BMP180 at 0x76
  if (!bmpInit(STATIC_ADDR, staticCal)) {
    Serial.println("STATIC FAIL");
    display.println("STATIC FAIL");
    display.display();
    while (1);
  }

  Serial.println("AT:READY");
  lastPidTime = millis();
  delay(200);
}

void loop() {
  unsigned long now = millis();

  // --- Read encoder ---
  noInterrupts();
  int delta = encoderDelta;
  encoderDelta = 0;
  interrupts();

  if (delta != 0) {
    targetKnots += delta * SPEED_INCREMENT;
    if (targetKnots < MIN_SPEED) targetKnots = MIN_SPEED;
    if (targetKnots > MAX_SPEED) targetKnots = MAX_SPEED;
    Serial.print("AT:SPD_SET=");
    Serial.println((int)targetKnots);
  }

  // --- Engage/disengage button ---
  bool btn = digitalRead(ENC_SW);
  if (btn == LOW && lastButtonState == HIGH && (now - lastDebounce > DEBOUNCE_MS)) {
    atEngaged = !atEngaged;
    lastDebounce = now;
    if (atEngaged) {
      integral = 0;
      prevError = 0;
      Serial.println("AT:ENGAGED");
    } else {
      Serial.println("AT:DISENGAGED");
    }
  }
  lastButtonState = btn;

  // --- Read pressures ---
  float pitotPressure = (float)bmpReadPressure(PITOT_ADDR, pitotCal);
  float staticPressure = (float)bmpReadPressure(STATIC_ADDR, staticCal);

  // --- Compute airspeed ---
  currentKnots = computeAirspeed(pitotPressure, staticPressure);

  // --- PID throttle control ---
  float dt = (now - lastPidTime) / 1000.0;
  lastPidTime = now;

  if (atEngaged && dt > 0 && dt < 1.0) {
    float error = targetKnots - currentKnots;
    float output = pidUpdate(error, dt);

    throttlePos += output * dt;
    if (throttlePos < 0) throttlePos = 0;
    if (throttlePos > 180) throttlePos = 180;

    throttleServo.write((int)throttlePos);
  }

  // --- Serial telemetry ---
  Serial.print("AT:IAS=");
  Serial.print((int)currentKnots);
  Serial.print(" TGT=");
  Serial.print((int)targetKnots);
  Serial.print(" THR=");
  Serial.print((int)throttlePos);
  Serial.print(" ");
  Serial.println(atEngaged ? "ENG" : "DIS");

  // --- Update display ---
  display.clearDisplay();

  // Title bar
  display.setTextSize(1);
  display.setCursor(0, 0);
  display.print("AUTOTHROTTLE ");
  if (atEngaged) {
    display.fillRect(78, 0, 50, 9, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK);
    display.setCursor(80, 1);
    display.print("ACTIVE");
    display.setTextColor(SSD1306_WHITE);
  } else {
    display.setCursor(80, 0);
    display.print("OFF");
  }

  // Divider
  display.drawLine(0, 11, 127, 11, SSD1306_WHITE);

  // Current airspeed (big)
  display.setTextSize(1);
  display.setCursor(0, 15);
  display.print("IAS");
  display.setTextSize(3);
  display.setCursor(0, 26);
  if (currentKnots < 10) display.print("  ");
  else if (currentKnots < 100) display.print(" ");
  display.print((int)currentKnots);
  display.setTextSize(1);
  display.setCursor(58, 38);
  display.print("KT");

  // Target speed
  display.setCursor(76, 15);
  display.print("SET");
  display.setTextSize(2);
  display.setCursor(76, 26);
  display.print((int)targetKnots);
  display.setTextSize(1);
  display.setCursor(112, 30);
  display.print("KT");

  // Throttle bar
  display.drawLine(0, 52, 127, 52, SSD1306_WHITE);
  display.setCursor(0, 55);
  display.print("THR ");
  int barWidth = map((int)throttlePos, 0, 180, 0, 96);
  display.drawRect(28, 54, 98, 9, SSD1306_WHITE);
  display.fillRect(29, 55, barWidth, 7, SSD1306_WHITE);
  int thrPct = map((int)throttlePos, 0, 180, 0, 100);
  display.setCursor(86, 55);
  display.setTextColor(throttlePos > 90 ? SSD1306_BLACK : SSD1306_WHITE);
  display.print(thrPct);
  display.print("%");
  display.setTextColor(SSD1306_WHITE);

  display.display();
  delay(100);
}
