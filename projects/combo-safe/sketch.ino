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
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// --- Pin assignments ---
#define ENC_CLK   2   // Encoder CLK (INT0)
#define ENC_DT    3   // Encoder DT  (INT1)
#define ENC_SW    4   // Encoder button
#define LED_GREEN 12  // Unlocked indicator
#define LED_RED   13  // Locked indicator

// --- Display ---
#define SCREEN_WIDTH  128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// --- Safe state ---
const int SECRET_COMBO[3] = {7, 3, 9};  // The secret combination
int enteredDigits[3] = {0, 0, 0};
int currentDigit = 0;       // Which digit we're entering (0-2)
int dialValue = 0;          // Current encoder position (0-9)
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

void setup() {
  Serial.begin(115200);
  Serial.println("=== COMBO SAFE v1.0 ===");
  Serial.println("Turn encoder to select digit, press to confirm.");
  Serial.println("Enter 3 digits to unlock the safe.");
  Serial.println();

  pinMode(ENC_CLK, INPUT_PULLUP);
  pinMode(ENC_DT, INPUT_PULLUP);
  pinMode(ENC_SW, INPUT_PULLUP);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_RED, OUTPUT);

  digitalWrite(LED_RED, HIGH);
  digitalWrite(LED_GREEN, LOW);

  // Initialize OLED
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("COMBO SAFE v1.0");
  display.println();
  display.println("Turn dial to select");
  display.println("Press to confirm");
  display.display();

  // Encoder interrupt
  attachInterrupt(digitalPinToInterrupt(ENC_CLK), readEncoder, FALLING);

  delay(1000);
  drawSafeScreen();
}

void readEncoder() {
  if (digitalRead(ENC_DT) == HIGH) {
    encoderPos++;
  } else {
    encoderPos--;
  }
}

void drawSafeScreen() {
  display.clearDisplay();

  // Title
  display.setTextSize(1);
  display.setCursor(0, 0);
  if (lockedOut) {
    display.print("LOCKED OUT (");
    display.print(failCount);
    display.println(" fails)");
  } else if (locked) {
    display.println("ENTER COMBO:");
  } else {
    display.println("** UNLOCKED **");
  }

  // Draw the 3 digit boxes
  display.setTextSize(2);
  for (int i = 0; i < 3; i++) {
    int x = 16 + i * 36;
    int y = 24;

    // Draw box
    if (i == currentDigit && locked && !lockedOut) {
      display.drawRect(x - 2, y - 2, 24, 22, SSD1306_WHITE);
    }

    display.setCursor(x + 4, y);
    if (i < currentDigit) {
      // Already entered — show it
      display.print(enteredDigits[i]);
    } else if (i == currentDigit && locked) {
      // Currently selecting
      display.print(dialValue);
    } else {
      display.print("-");
    }
  }

  // Status bar
  display.setTextSize(1);
  display.setCursor(0, 54);
  if (!locked) {
    display.print("ACCESS GRANTED");
  } else if (lockedOut) {
    display.print("TRY AGAIN LATER");
  } else {
    display.print("Digit ");
    display.print(currentDigit + 1);
    display.print("/3  Dial: ");
    display.print(dialValue);
  }

  display.display();
}

// [VULN 1] Timing side-channel: each correct digit adds 50ms delay
// An attacker can measure response time to determine correct digits
// one at a time, reducing brute force from 10^3 to 10*3 attempts.
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
    // BUG: Timing leak — delay per correct digit
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
    // [VULN 2] uint8_t overflow: failCount wraps 255→0
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
  // Process serial commands
  processSerialInput();

  // Skip if locked out or already unlocked
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
    // Wrap 0-9
    while (dialValue < 0) dialValue += 10;
    dialValue = dialValue % 10;

    drawSafeScreen();
  }

  // --- Encoder button ---
  bool buttonState = digitalRead(ENC_SW);
  if (buttonState == LOW && lastButtonState == HIGH) {
    if (millis() - lastButtonPress > 200) {  // debounce
      lastButtonPress = millis();

      // Confirm current digit
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
        // All 3 digits entered — check combo
        handleUnlockAttempt();
        // Reset for next attempt
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
