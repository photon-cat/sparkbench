// Simon Says Game - 4 LEDs, 4 Buttons, Buzzer

const int ledPins[] = {2, 3, 4, 5};        // Red, Green, Blue, Yellow LEDs
const int buttonPins[] = {6, 7, 8, 9};     // Corresponding buttons
const int buzzerPin = 10;
const int tones[] = {262, 294, 330, 349};  // C, D, E, F notes

const int maxSequence = 100;
int sequence[maxSequence];
int sequenceLength = 0;
int score = 0;

void setup() {
  Serial.begin(115200);

  // Setup LED pins
  for (int i = 0; i < 4; i++) {
    pinMode(ledPins[i], OUTPUT);
    pinMode(buttonPins[i], INPUT_PULLUP);
  }
  pinMode(buzzerPin, OUTPUT);

  randomSeed(analogRead(A0));

  Serial.println("=== SIMON SAYS ===");
  Serial.println("Watch the pattern, then repeat it!");
  delay(1000);

  startupSequence();
  newGame();
}

void loop() {
  // Show the sequence
  playSequence();

  // Wait for player input
  if (!checkPlayerInput()) {
    // Player failed
    gameOver();
    newGame();
  } else {
    // Player succeeded
    score++;
    Serial.print("Round ");
    Serial.print(score);
    Serial.println(" complete!");
    delay(1000);
    addToSequence();
  }
}

void startupSequence() {
  for (int i = 0; i < 4; i++) {
    digitalWrite(ledPins[i], HIGH);
    tone(buzzerPin, tones[i], 200);
    delay(200);
    digitalWrite(ledPins[i], LOW);
    delay(100);
  }
}

void newGame() {
  sequenceLength = 0;
  score = 0;
  Serial.println("\n--- NEW GAME ---");
  delay(500);
  addToSequence();
}

void addToSequence() {
  sequence[sequenceLength] = random(0, 4);
  sequenceLength++;
}

void playSequence() {
  delay(500);
  for (int i = 0; i < sequenceLength; i++) {
    int led = sequence[i];
    digitalWrite(ledPins[led], HIGH);
    tone(buzzerPin, tones[led], 400);
    delay(400);
    digitalWrite(ledPins[led], LOW);
    delay(200);
  }
}

bool checkPlayerInput() {
  for (int i = 0; i < sequenceLength; i++) {
    int expectedButton = sequence[i];
    int pressedButton = waitForButtonPress();

    if (pressedButton == -1 || pressedButton != expectedButton) {
      return false;
    }

    // Light up LED and play tone for correct press
    digitalWrite(ledPins[pressedButton], HIGH);
    tone(buzzerPin, tones[pressedButton], 200);
    delay(200);
    digitalWrite(ledPins[pressedButton], LOW);
    noTone(buzzerPin);
    delay(100);
  }
  return true;
}

int waitForButtonPress() {
  unsigned long startTime = millis();
  const unsigned long timeout = 5000; // 5 second timeout

  // Wait for button press
  while (millis() - startTime < timeout) {
    for (int i = 0; i < 4; i++) {
      if (digitalRead(buttonPins[i]) == LOW) {
        // Wait for release
        while (digitalRead(buttonPins[i]) == LOW) {
          delay(10);
        }
        return i;
      }
    }
    delay(10);
  }
  return -1; // Timeout
}

void gameOver() {
  Serial.println("\n*** GAME OVER! ***");
  Serial.print("Final Score: ");
  Serial.println(score);
  Serial.println("------------------\n");

  // Blink all LEDs
  for (int blink = 0; blink < 5; blink++) {
    for (int i = 0; i < 4; i++) {
      digitalWrite(ledPins[i], HIGH);
    }
    tone(buzzerPin, 100, 200);
    delay(200);

    for (int i = 0; i < 4; i++) {
      digitalWrite(ledPins[i], LOW);
    }
    noTone(buzzerPin);
    delay(200);
  }

  delay(2000);
}
