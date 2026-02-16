// ============================================================
//  COMBO SAFE — SparkBench Security Demo
// ============================================================
//
//  A 3-digit combination safe using a rotary encoder and
//  SSD1306 OLED display. Turn the dial to select each digit,
//  press the encoder button to confirm.
//
//  This firmware contains INTENTIONAL VULNERABILITIES for
//  demonstrating SparkBench-CI's SparkyFuzzer:
//
//  [VULN 1] Timing side-channel in combo verification
//           — each correct digit adds a measurable delay
//  [VULN 2] Lockout counter uses uint8_t — overflows at 255
//           attempts, resetting the lockout
//  [VULN 3] Serial debug backdoor — sending "DEBUG" over
//           serial dumps internal state including the combo
//
// ============================================================

#include <Wire.h>

// --- Pin assignments ---
#define ENC_CLK   2   // Encoder CLK (INT0)
#define ENC_DT    3   // Encoder DT  (INT1)
#define ENC_SW    4   // Encoder button
#define LED_GREEN 12  // Unlocked indicator
#define LED_RED   13  // Locked indicator

// --- SSD1306 raw I2C driver (no Adafruit lib needed) ---
#define OLED_ADDR 0x3C
#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_PAGES (OLED_HEIGHT / 8)

// Simple 5x7 font for digits 0-9 and a few chars
const uint8_t FONT_5X7[][5] PROGMEM = {
  {0x3E,0x51,0x49,0x45,0x3E}, // 0
  {0x00,0x42,0x7F,0x40,0x00}, // 1
  {0x42,0x61,0x51,0x49,0x46}, // 2
  {0x21,0x41,0x45,0x4B,0x31}, // 3
  {0x18,0x14,0x12,0x7F,0x10}, // 4
  {0x27,0x45,0x45,0x45,0x39}, // 5
  {0x3C,0x4A,0x49,0x49,0x30}, // 6
  {0x01,0x71,0x09,0x05,0x03}, // 7
  {0x36,0x49,0x49,0x49,0x36}, // 8
  {0x06,0x49,0x49,0x29,0x1E}, // 9
};

// Screen buffer (1024 bytes = 128 * 8 pages)
uint8_t screenBuf[OLED_WIDTH * OLED_PAGES];

void oledCmd(uint8_t cmd) {
  Wire.beginTransmission(OLED_ADDR);
  Wire.write(0x00);
  Wire.write(cmd);
  Wire.endTransmission();
}

void oledCmd2(uint8_t cmd, uint8_t arg) {
  Wire.beginTransmission(OLED_ADDR);
  Wire.write(0x00);
  Wire.write(cmd);
  Wire.write(arg);
  Wire.endTransmission();
}

void oledInit() {
  Wire.begin();
  oledCmd(0xAE);         // display off
  oledCmd2(0x20, 0x00);  // horizontal addressing mode
  oledCmd(0xAF);         // display on
}

void oledFlush() {
  // Set column and page range
  Wire.beginTransmission(OLED_ADDR);
  Wire.write(0x00);
  Wire.write(0x21); Wire.write(0); Wire.write(127);
  Wire.write(0x22); Wire.write(0); Wire.write(7);
  Wire.endTransmission();

  // Send buffer in 16-byte chunks (Wire buffer limit)
  for (int i = 0; i < 1024; i += 16) {
    Wire.beginTransmission(OLED_ADDR);
    Wire.write(0x40);  // data mode
    for (int j = 0; j < 16; j++) {
      Wire.write(screenBuf[i + j]);
    }
    Wire.endTransmission();
  }
}

void oledClear() {
  memset(screenBuf, 0, sizeof(screenBuf));
}

// Draw a character at pixel position (x, page)
void oledDrawChar(int x, int page, char c) {
  if (c >= '0' && c <= '9') {
    int idx = c - '0';
    for (int col = 0; col < 5; col++) {
      if (x + col < OLED_WIDTH) {
        screenBuf[page * OLED_WIDTH + x + col] = pgm_read_byte(&FONT_5X7[idx][col]);
      }
    }
  } else if (c == '-') {
    for (int col = 0; col < 5; col++) {
      if (x + col < OLED_WIDTH) {
        screenBuf[page * OLED_WIDTH + x + col] = 0x08;
      }
    }
  } else if (c == ' ') {
    // blank
  }
}

// Draw a string at pixel position (x, page)
void oledDrawStr(int x, int page, const char* str) {
  while (*str) {
    oledDrawChar(x, page, *str);
    x += 6;
    str++;
  }
}

// Draw a box outline around a digit position
void oledDrawBox(int x, int page, int w, int h) {
  // Top edge
  for (int i = 0; i < w; i++) {
    if (x + i < OLED_WIDTH) screenBuf[page * OLED_WIDTH + x + i] |= 0x01;
  }
  // Bottom edge
  int bottomPage = page + h - 1;
  if (bottomPage < OLED_PAGES) {
    for (int i = 0; i < w; i++) {
      if (x + i < OLED_WIDTH) screenBuf[bottomPage * OLED_WIDTH + x + i] |= 0x80;
    }
  }
  // Left/right edges
  for (int p = page; p < page + h && p < OLED_PAGES; p++) {
    if (x < OLED_WIDTH) screenBuf[p * OLED_WIDTH + x] |= 0xFF;
    if (x + w - 1 < OLED_WIDTH) screenBuf[p * OLED_WIDTH + x + w - 1] |= 0xFF;
  }
}

// --- Safe state ---
const int SECRET_COMBO[3] = {7, 3, 9};
int enteredDigits[3] = {0, 0, 0};
int currentDigit = 0;
int dialValue = 0;
bool locked = true;

// [VULN 2] uint8_t overflows at 255 → resets lockout
uint8_t failCount = 0;
bool lockedOut = false;
#define MAX_ATTEMPTS 5

// --- Encoder state ---
volatile int encoderPos = 0;
int lastEncoderPos = 0;
bool lastButtonState = HIGH;
unsigned long lastButtonPress = 0;

// --- Serial input buffer ---
char serialBuf[16];
int serialBufIdx = 0;

// --- Forward declarations ---
void readEncoder();
void drawSafeScreen();
void handleUnlockAttempt();
void resetSafe();
void processSerialInput();

void setup() {
  Serial.begin(115200);
  Serial.println("=== COMBO SAFE v1.0 ===");
  Serial.println("Turn encoder to select digit, press to confirm.");
  Serial.println("Enter 3 digits to unlock the safe.");

  pinMode(ENC_CLK, INPUT_PULLUP);
  pinMode(ENC_DT, INPUT_PULLUP);
  pinMode(ENC_SW, INPUT_PULLUP);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  digitalWrite(LED_RED, HIGH);
  digitalWrite(LED_GREEN, LOW);

  oledInit();

  attachInterrupt(digitalPinToInterrupt(ENC_CLK), readEncoder, FALLING);

  delay(100);
  drawSafeScreen();
}

void readEncoder() {
  // At CLK falling edge: DT LOW = CW, DT HIGH = CCW
  // (matches SparkBench encoder sim quadrature)
  if (digitalRead(ENC_DT) == LOW) {
    encoderPos++;
  } else {
    encoderPos--;
  }
}

void drawSafeScreen() {
  oledClear();

  // Title row (page 0)
  char titleBuf[22];
  if (lockedOut) {
    oledDrawStr(0, 0, "LOCKED OUT");
  } else if (locked) {
    oledDrawStr(0, 0, "ENTER COMBO");
  } else {
    oledDrawStr(0, 0, "UNLOCKED");
  }

  // Draw the 3 digit boxes (pages 2-4)
  for (int i = 0; i < 3; i++) {
    int x = 20 + i * 36;

    // Active digit box
    if (i == currentDigit && locked && !lockedOut) {
      oledDrawBox(x - 3, 2, 14, 2);
    }

    char digit;
    if (i < currentDigit) {
      digit = '0' + enteredDigits[i];
    } else if (i == currentDigit && locked) {
      digit = '0' + dialValue;
    } else {
      digit = '-';
    }
    oledDrawChar(x, 3, digit);
  }

  // Status row (page 6)
  if (!locked) {
    oledDrawStr(0, 6, "ACCESS GRANTED");
  } else if (lockedOut) {
    oledDrawStr(0, 6, "TRY LATER");
  }

  oledFlush();
}

// [VULN 1] Timing side-channel: each correct digit adds 50ms delay
bool checkCombo() {
  unsigned long startTime = millis();

  for (int i = 0; i < 3; i++) {
    if (enteredDigits[i] != SECRET_COMBO[i]) {
      unsigned long elapsed = millis() - startTime;
      Serial.print("[check] WRONG combo — elapsed ");
      Serial.print(elapsed);
      Serial.println("ms");
      return false;
    }
    delay(50);
  }

  unsigned long elapsed = millis() - startTime;
  Serial.print("[check] CORRECT combo — elapsed ");
  Serial.print(elapsed);
  Serial.println("ms");
  return true;
}

void handleUnlockAttempt() {
  Serial.print("[attempt] Entered: ");
  Serial.print(enteredDigits[0]);
  Serial.print(enteredDigits[1]);
  Serial.println(enteredDigits[2]);

  if (checkCombo()) {
    locked = false;
    lockedOut = false;
    digitalWrite(LED_GREEN, HIGH);
    digitalWrite(LED_RED, LOW);
    Serial.println("[safe] UNLOCKED!");
  } else {
    failCount++;
    Serial.print("[safe] Failed attempts: ");
    Serial.println(failCount);

    if (failCount >= MAX_ATTEMPTS) {
      lockedOut = true;
      Serial.println("[safe] LOCKOUT ENGAGED");
    }
  }

  drawSafeScreen();
}

void resetSafe() {
  currentDigit = 0;
  dialValue = 0;
  enteredDigits[0] = enteredDigits[1] = enteredDigits[2] = 0;
  encoderPos = 0;
  lastEncoderPos = 0;

  if (!lockedOut) {
    drawSafeScreen();
  }
}

// [VULN 3] Debug backdoor — "DEBUG" over serial leaks combo
void processSerialInput() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n' || c == '\r') {
      serialBuf[serialBufIdx] = '\0';

      if (strcmp(serialBuf, "DEBUG") == 0) {
        Serial.println("[debug] === INTERNAL STATE ===");
        Serial.print("[debug] combo=");
        Serial.print(SECRET_COMBO[0]);
        Serial.print(SECRET_COMBO[1]);
        Serial.println(SECRET_COMBO[2]);
        Serial.print("[debug] failCount=");
        Serial.println(failCount);
        Serial.print("[debug] locked=");
        Serial.println(locked);
        Serial.print("[debug] lockedOut=");
        Serial.println(lockedOut);
        Serial.println("[debug] === END STATE ===");
      } else if (strcmp(serialBuf, "RESET") == 0) {
        locked = true;
        lockedOut = false;
        failCount = 0;
        digitalWrite(LED_RED, HIGH);
        digitalWrite(LED_GREEN, LOW);
        resetSafe();
        Serial.println("[safe] Reset complete");
      }

      serialBufIdx = 0;
    } else if (serialBufIdx < 15) {
      serialBuf[serialBufIdx++] = c;
    }
  }
}

void loop() {
  processSerialInput();

  if (lockedOut || !locked) {
    delay(50);
    return;
  }

  // --- Encoder rotation ---
  int newPos = encoderPos;
  if (newPos != lastEncoderPos) {
    int diff = newPos - lastEncoderPos;
    lastEncoderPos = newPos;

    dialValue += diff;
    while (dialValue < 0) dialValue += 10;
    dialValue = dialValue % 10;

    drawSafeScreen();
  }

  // --- Encoder button ---
  bool buttonState = digitalRead(ENC_SW);
  if (buttonState == LOW && lastButtonState == HIGH) {
    if (millis() - lastButtonPress > 200) {
      lastButtonPress = millis();

      enteredDigits[currentDigit] = dialValue;
      Serial.print("[input] Digit ");
      Serial.print(currentDigit + 1);
      Serial.print(" = ");
      Serial.println(dialValue);

      currentDigit++;
      dialValue = 0;
      encoderPos = 0;
      lastEncoderPos = 0;

      if (currentDigit >= 3) {
        handleUnlockAttempt();
        if (locked) {
          delay(1000);
          resetSafe();
        }
      } else {
        drawSafeScreen();
      }
    }
  }
  lastButtonState = buttonState;

  delay(5);
}
