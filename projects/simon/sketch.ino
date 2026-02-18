// Simon Says Game
// 4 LEDs, 4 buttons, SSD1306 OLED score display
// Sequence grows each round. Miss one and it resets.

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

const int ledPins[]    = {12, 11, 10, 9};   // Red, Green, Blue, Yellow
const int buttonPins[] = {5,  4,  3,  2};   // Red, Green, Blue, Yellow
const int NUM_COLORS = 4;
const int MAX_SEQ = 100;

int sequence[MAX_SEQ];
int seqLength = 0;
int baseDelay = 500;  // ms — flash duration, decreases with level
int highScore = 0;

// Forward declarations
void playSequence();
bool getPlayerInput();
int waitForButton();
bool anyButtonPressed();
void readyAnimation();
void successFlash();
void failAnimation();
void updateDisplay(const char* status, int round, int best);

void setup() {
  Serial.begin(115200);
  Serial.println("Simon Says - Ready!");

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  updateDisplay("READY", 0, 0);

  for (int i = 0; i < NUM_COLORS; i++) {
    pinMode(ledPins[i], OUTPUT);
    pinMode(buttonPins[i], INPUT_PULLUP);
  }

  randomSeed(analogRead(A0));
  readyAnimation();
  delay(1000);
}

void loop() {
  // Add one step to the sequence
  sequence[seqLength] = random(NUM_COLORS);
  seqLength++;

  Serial.print("Round ");
  Serial.println(seqLength);

  updateDisplay("WATCH", seqLength, highScore);

  // Play the sequence
  playSequence();

  updateDisplay("YOUR TURN", seqLength, highScore);

  // Wait for player input
  if (getPlayerInput()) {
    // Correct — brief flash all LEDs as success feedback
    Serial.println("Correct!");
    if (seqLength > highScore) highScore = seqLength;
    updateDisplay("CORRECT!", seqLength, highScore);
    successFlash();
    delay(600);
  } else {
    // Wrong — fail animation and reset
    Serial.print("Wrong! Score: ");
    Serial.println(seqLength - 1);
    updateDisplay("GAME OVER", seqLength - 1, highScore);
    failAnimation();
    seqLength = 0;
    baseDelay = 500;
    delay(1000);
    updateDisplay("READY", 0, highScore);
  }
}

// --- Sequence Playback ---

void playSequence() {
  delay(300);
  int flashTime = max(baseDelay - (seqLength * 15), 150);  // speed up gradually

  for (int i = 0; i < seqLength; i++) {
    int color = sequence[i];
    digitalWrite(ledPins[color], HIGH);
    delay(flashTime);
    digitalWrite(ledPins[color], LOW);
    delay(flashTime / 2);
  }
}

// --- Player Input ---

bool getPlayerInput() {
  for (int i = 0; i < seqLength; i++) {
    int pressed = waitForButton();
    if (pressed == -1) return false;  // timeout

    // Light the LED while acknowledging
    digitalWrite(ledPins[pressed], HIGH);
    delay(200);
    digitalWrite(ledPins[pressed], LOW);
    delay(100);

    if (pressed != sequence[i]) {
      return false;  // wrong button
    }
  }
  return true;
}

int waitForButton() {
  unsigned long startTime = millis();
  const unsigned long timeout = 5000;  // 5 second timeout per press

  // Wait for all buttons to be released first
  while (anyButtonPressed()) {
    if (millis() - startTime > timeout) return -1;
  }
  delay(50);  // debounce

  // Wait for a press
  while (true) {
    if (millis() - startTime > timeout) return -1;

    for (int i = 0; i < NUM_COLORS; i++) {
      if (digitalRead(buttonPins[i]) == LOW) {
        delay(50);  // debounce
        if (digitalRead(buttonPins[i]) == LOW) {
          return i;
        }
      }
    }
  }
}

bool anyButtonPressed() {
  for (int i = 0; i < NUM_COLORS; i++) {
    if (digitalRead(buttonPins[i]) == LOW) return true;
  }
  return false;
}

// --- Animations ---

void readyAnimation() {
  // Chase animation 2x
  for (int rep = 0; rep < 2; rep++) {
    for (int i = 0; i < NUM_COLORS; i++) {
      digitalWrite(ledPins[i], HIGH);
      delay(100);
      digitalWrite(ledPins[i], LOW);
    }
  }
  // All on then off
  for (int i = 0; i < NUM_COLORS; i++) digitalWrite(ledPins[i], HIGH);
  delay(300);
  for (int i = 0; i < NUM_COLORS; i++) digitalWrite(ledPins[i], LOW);
}

void successFlash() {
  for (int i = 0; i < NUM_COLORS; i++) digitalWrite(ledPins[i], HIGH);
  delay(150);
  for (int i = 0; i < NUM_COLORS; i++) digitalWrite(ledPins[i], LOW);
}

void failAnimation() {
  for (int rep = 0; rep < 3; rep++) {
    for (int i = 0; i < NUM_COLORS; i++) digitalWrite(ledPins[i], HIGH);
    delay(150);
    for (int i = 0; i < NUM_COLORS; i++) digitalWrite(ledPins[i], LOW);
    delay(150);
  }
}

// --- Display ---

void updateDisplay(const char* status, int round, int best) {
  display.clearDisplay();

  // Status text — large, centered
  display.setTextSize(2);
  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(status, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((SCREEN_WIDTH - w) / 2, 2);
  display.println(status);

  // Round and high score — smaller
  display.setTextSize(1);
  display.setCursor(0, 40);
  display.print("Round: ");
  display.println(round);
  display.setCursor(0, 52);
  display.print("Best:  ");
  display.println(best);

  display.display();
}
