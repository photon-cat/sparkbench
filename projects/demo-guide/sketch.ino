// ============================================================
//  SPARKBENCH DEMO GUIDE
// ============================================================
//
//  Welcome to SparkBench! This project walks you through
//  the key features of the platform.
//
//  HOW TO USE THIS GUIDE:
//  1. READ this code in the editor (left panel)
//  2. LOOK at the circuit diagram (right panel, "Diagram" tab)
//  3. CLICK "Run" to start the simulation
//  4. INTERACT with components in the diagram
//  5. WATCH the Serial Monitor for output
//
// ============================================================
//
//  FEATURE TOUR:
//
//  [Code Editor]  - You're here! Monaco-based IDE with
//                   Arduino syntax highlighting. Edit code,
//                   switch to diagram.json tab to see the
//                   circuit definition, or view board.kicad_pcb
//                   for the PCB layout.
//
//  [Diagram Canvas] - The right panel shows your circuit.
//                     Click parts to select them. Drag to move.
//                     Right-click for options (rotate, delete).
//                     Use the toolbar to add new parts or wires.
//
//  [Simulation]   - Click Run (play button) to compile and
//                   simulate. The AVR runs cycle-accurate code.
//                   LEDs light up, servos move, sensors respond.
//
//  [Serial Monitor] - Below the diagram. Shows Serial.println()
//                     output from your running sketch.
//
//  [PCB Editor]   - Switch to "PCB" tab to see the board layout.
//                   KiCAD format with footprints, traces, and
//                   copper zones. Switch to "3D" for a 3D view.
//
//  [Library Manager] - Click the book icon to search and add
//                      Arduino libraries (Servo, Wire, etc.)
//
//  [Sparky AI]    - Click the star button in the toolbar to
//                   open Sparky, your AI engineering partner.
//                   Try: "Add a buzzer that beeps when I press
//                   the button" and watch Sparky modify your
//                   project files with full diff review.
//
// ============================================================

#include <Servo.h>

// Pin assignments
const int LED_RED   = 13;
const int LED_GREEN = 12;
const int LED_BLUE  = 11;
const int BUTTON    = 2;
const int POT_PIN   = A0;
const int SERVO_PIN = 9;

Servo myServo;

// State
int ledPattern = 0;
bool lastButtonState = HIGH;
unsigned long lastToggle = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("=== SparkBench Demo Guide ===");
  Serial.println("Press the button to cycle LED patterns.");
  Serial.println("Turn the potentiometer to move the servo.");
  Serial.println();

  pinMode(LED_RED, OUTPUT);
  pinMode(LED_GREEN, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  pinMode(BUTTON, INPUT_PULLUP);

  myServo.attach(SERVO_PIN);
  myServo.write(90);
}

void loop() {
  // Read button (active LOW with INPUT_PULLUP)
  bool buttonState = digitalRead(BUTTON);
  if (buttonState == LOW && lastButtonState == HIGH) {
    // Button just pressed - cycle LED pattern
    ledPattern = (ledPattern + 1) % 4;
    Serial.print("LED pattern: ");
    Serial.println(ledPattern);

    switch (ledPattern) {
      case 0: // All off
        digitalWrite(LED_RED, LOW);
        digitalWrite(LED_GREEN, LOW);
        digitalWrite(LED_BLUE, LOW);
        Serial.println("  -> All LEDs off");
        break;
      case 1: // Red only
        digitalWrite(LED_RED, HIGH);
        digitalWrite(LED_GREEN, LOW);
        digitalWrite(LED_BLUE, LOW);
        Serial.println("  -> Red ON");
        break;
      case 2: // Green only
        digitalWrite(LED_RED, LOW);
        digitalWrite(LED_GREEN, HIGH);
        digitalWrite(LED_BLUE, LOW);
        Serial.println("  -> Green ON");
        break;
      case 3: // All on
        digitalWrite(LED_RED, HIGH);
        digitalWrite(LED_GREEN, HIGH);
        digitalWrite(LED_BLUE, HIGH);
        Serial.println("  -> All LEDs ON");
        break;
    }
  }
  lastButtonState = buttonState;

  // Read potentiometer and map to servo angle
  int potValue = analogRead(POT_PIN);
  int angle = map(potValue, 0, 1023, 0, 180);
  myServo.write(angle);

  // Print pot/servo values periodically
  if (millis() - lastToggle > 500) {
    lastToggle = millis();
    Serial.print("Pot: ");
    Serial.print(potValue);
    Serial.print(" -> Servo: ");
    Serial.print(angle);
    Serial.println(" deg");
  }

  delay(20);
}
