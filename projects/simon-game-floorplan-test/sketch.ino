// Simplified Simon Game - Arduino Shield version
// Used for PCB floorplan testing only

const int LED_PINS[] = {12, 11, 10, 9};     // red, green, blue, yellow
const int BTN_PINS[] = {5, 4, 3, 2};        // red, green, blue, yellow
const int BUZZER_PIN = 8;

void setup() {
  for (int i = 0; i < 4; i++) {
    pinMode(LED_PINS[i], OUTPUT);
    pinMode(BTN_PINS[i], INPUT_PULLUP);
  }
  pinMode(BUZZER_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  // placeholder for floorplan test
}
