// Simon Says Game with 4 LEDs and 4 Buttons

const int ledPins[] = {2, 3, 4, 5};
const int buttonPins[] = {8, 9, 10, 11};
const int numLeds = 4;

int sequence[100];
int currentLevel = 1;
int ledDelay = 500;
int gameOverDelay = 200;

void setup() {
  Serial.begin(115200);

  // Initialize LED pins
  for (int i = 0; i < numLeds; i++) {
    pinMode(ledPins[i], OUTPUT);
    digitalWrite(ledPins[i], LOW);
  }

  // Initialize button pins with internal pullup
  for (int i = 0; i < numLeds; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }

  randomSeed(analogRead(0));

  Serial.println("Simon Says Game Starting!");
  Serial.println("Watch the pattern, then repeat it by pressing the buttons.");
  delay(1000);

  startNewGame();
}

void loop() {
  // Play the sequence
  playSequence();

  // Wait for player input
  if (checkPlayerInput()) {
    // Player got it right!
    Serial.print("Correct! Level ");
    Serial.print(currentLevel);
    Serial.println(" complete!");
    delay(1000);

    // Add next step and increase level
    addNextStep();
    currentLevel++;
    Serial.print("Starting level ");
    Serial.println(currentLevel);
  } else {
    // Player made a mistake
    Serial.println("Wrong! Game Over!");
    Serial.print("Final level reached: ");
    Serial.println(currentLevel - 1);
    gameOver();
    startNewGame();
  }
}

void startNewGame() {
  currentLevel = 1;
  Serial.println("\n=== New Game ===");
  Serial.println("Level 1");

  // Generate first random step
  sequence[0] = random(0, numLeds);
}

void addNextStep() {
  sequence[currentLevel] = random(0, numLeds);
}

void playSequence() {
  delay(500);

  for (int i = 0; i < currentLevel; i++) {
    int led = sequence[i];
    digitalWrite(ledPins[led], HIGH);
    delay(ledDelay);
    digitalWrite(ledPins[led], LOW);
    delay(200);
  }
}

bool checkPlayerInput() {
  for (int i = 0; i < currentLevel; i++) {
    int expectedButton = sequence[i];
    int pressedButton = waitForButtonPress();

    if (pressedButton != expectedButton) {
      return false;
    }

    // Flash the corresponding LED when button is pressed
    digitalWrite(ledPins[pressedButton], HIGH);
    delay(300);
    digitalWrite(ledPins[pressedButton], LOW);
    delay(200);
  }

  return true;
}

int waitForButtonPress() {
  // Wait until a button is pressed
  while (true) {
    for (int i = 0; i < numLeds; i++) {
      if (digitalRead(buttonPins[i]) == LOW) {
        // Button pressed (LOW because of INPUT_PULLUP)

        // Debounce and wait for release
        delay(50);
        while (digitalRead(buttonPins[i]) == LOW) {
          delay(10);
        }

        Serial.print("Button ");
        Serial.print(i + 1);
        Serial.println(" pressed");

        return i;
      }
    }
  }
}

void gameOver() {
  // Flash all LEDs rapidly to indicate game over
  for (int flash = 0; flash < 5; flash++) {
    for (int i = 0; i < numLeds; i++) {
      digitalWrite(ledPins[i], HIGH);
    }
    delay(gameOverDelay);

    for (int i = 0; i < numLeds; i++) {
      digitalWrite(ledPins[i], LOW);
    }
    delay(gameOverDelay);
  }

  delay(1000);
}
