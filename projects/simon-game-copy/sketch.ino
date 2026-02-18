#include "pitches.h"

// --- Pin definitions (from diagram.json) ---
const int LED_PINS[]    = {12, 11, 10,  9};   // Red, Green, Blue, Yellow
const int BTN_PINS[]    = { 5,  4,  3,  2};   // Red, Green, Blue, Yellow
const int BUZZER_PIN    = 8;

// Tones for each color
const int TONES[] = {NOTE_E4, NOTE_CS4, NOTE_A3, NOTE_E3};

// --- Game state ---
const int MAX_SEQ = 100;
int sequence[MAX_SEQ];
int seqLength = 0;       // current sequence length (== score)
int playerIndex = 0;     // which step the player is on

enum State { STATE_IDLE, STATE_PLAYBACK, STATE_INPUT, STATE_GAMEOVER };
State gameState = STATE_IDLE;

unsigned long lastActionTime = 0;
int playbackIndex = 0;
bool playbackLedOn = false;

// Timing
const unsigned long PLAYBACK_ON_MS   = 420;
const unsigned long PLAYBACK_OFF_MS  = 180;
const unsigned long INPUT_TIMEOUT_MS = 3000;
const unsigned long GAMEOVER_PAUSE   = 1500;

// --- Forward declarations ---
void allLedsOff();
void flashLed(int idx, unsigned long ms);
int readButton();
void waitRelease();
void startNewGame();
void addStep();
void doPlayback();
void doInput();
void gameOver();

// --- Helpers ---

void allLedsOff() {
  for (int i = 0; i < 4; i++) digitalWrite(LED_PINS[i], LOW);
}

void flashLed(int idx, unsigned long ms) {
  digitalWrite(LED_PINS[idx], HIGH);
  tone(BUZZER_PIN, TONES[idx]);
  delay(ms);
  digitalWrite(LED_PINS[idx], LOW);
  noTone(BUZZER_PIN);
}

// Returns 0-3 for pressed button, -1 for none
int readButton() {
  for (int i = 0; i < 4; i++) {
    if (digitalRead(BTN_PINS[i]) == LOW) return i;
  }
  return -1;
}

// Debounced wait-for-release
void waitRelease() {
  delay(50);
  while (readButton() != -1) { /* spin */ }
  delay(50);
}

// --- Game flow ---

void startNewGame() {
  seqLength = 0;
  Serial.println("=== NEW GAME ===");
  Serial.println("Score: 0");
  addStep();
}

void addStep() {
  sequence[seqLength] = random(0, 4);
  seqLength++;
  Serial.print("Round ");
  Serial.print(seqLength);
  Serial.println(" - watch the sequence...");

  // Brief pause before playback
  delay(500);

  // Begin playback
  playbackIndex = 0;
  playbackLedOn = false;
  gameState = STATE_PLAYBACK;
  lastActionTime = millis();
}

void doPlayback() {
  unsigned long now = millis();

  if (!playbackLedOn) {
    // Time to turn on the next LED in the sequence
    if (now - lastActionTime >= PLAYBACK_OFF_MS) {
      int idx = sequence[playbackIndex];
      digitalWrite(LED_PINS[idx], HIGH);
      tone(BUZZER_PIN, TONES[idx]);
      playbackLedOn = true;
      lastActionTime = now;
    }
  } else {
    // LED is on, wait then turn off
    if (now - lastActionTime >= PLAYBACK_ON_MS) {
      allLedsOff();
      noTone(BUZZER_PIN);
      playbackLedOn = false;
      playbackIndex++;
      lastActionTime = now;

      if (playbackIndex >= seqLength) {
        // Done playing sequence -- switch to player input
        playerIndex = 0;
        gameState = STATE_INPUT;
        lastActionTime = millis();
        Serial.println("Your turn!");
      }
    }
  }
}

void doInput() {
  // Check timeout
  if (millis() - lastActionTime > INPUT_TIMEOUT_MS) {
    Serial.println("Timeout!");
    gameOver();
    return;
  }

  int btn = readButton();
  if (btn == -1) return;

  lastActionTime = millis();

  // Light up + tone while pressed, with minimum hold time
  unsigned long pressStart = millis();
  digitalWrite(LED_PINS[btn], HIGH);
  tone(BUZZER_PIN, TONES[btn]);
  waitRelease();
  // Ensure LED stays on for at least 300ms even on a quick tap
  unsigned long held = millis() - pressStart;
  if (held < 300) delay(300 - held);
  digitalWrite(LED_PINS[btn], LOW);
  noTone(BUZZER_PIN);

  // Check correctness
  if (btn != sequence[playerIndex]) {
    Serial.print("Wrong! You pressed ");
    Serial.print(btn);
    Serial.print(", expected ");
    Serial.println(sequence[playerIndex]);
    gameOver();
    return;
  }

  playerIndex++;
  if (playerIndex >= seqLength) {
    // Completed this round
    int score = seqLength;
    Serial.print("Correct! Score: ");
    Serial.println(score);
    delay(400);
    addStep();
  }
}

void gameOver() {
  int finalScore = seqLength - 1;
  Serial.println("*** GAME OVER ***");
  Serial.print("Final score: ");
  Serial.println(finalScore);

  // Buzzer sad tone + flash all LEDs
  for (int i = 0; i < 3; i++) {
    for (int j = 0; j < 4; j++) digitalWrite(LED_PINS[j], HIGH);
    tone(BUZZER_PIN, NOTE_C3);
    delay(150);
    allLedsOff();
    noTone(BUZZER_PIN);
    delay(150);
  }

  gameState = STATE_GAMEOVER;
  lastActionTime = millis();
}

// --- Arduino entry points ---

void setup() {
  Serial.begin(115200);
  Serial.println("Simon Says - Press any button to start!");

  for (int i = 0; i < 4; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    pinMode(BTN_PINS[i], INPUT_PULLUP);
  }
  pinMode(BUZZER_PIN, OUTPUT);

  randomSeed(analogRead(A0));
  gameState = STATE_IDLE;
}

void loop() {
  switch (gameState) {
    case STATE_IDLE:
      // Wait for any button press to start
      if (readButton() != -1) {
        waitRelease();
        startNewGame();
      }
      break;

    case STATE_PLAYBACK:
      doPlayback();
      break;

    case STATE_INPUT:
      doInput();
      break;

    case STATE_GAMEOVER:
      // After a pause, go back to idle
      if (millis() - lastActionTime > GAMEOVER_PAUSE) {
        Serial.println("Press any button to play again.");
        gameState = STATE_IDLE;
      }
      break;
  }
}
