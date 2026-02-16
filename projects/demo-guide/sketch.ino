// ============================================================
//  SPARKBENCH DEMO GUIDE
// ============================================================
//
//  Welcome to SparkBench. This sketch walks you through the
//  platform while running a real simulation.
//
//  HOW TO USE:
//  1. Read this code (left panel, "sketch.ino" tab)
//  2. Look at the circuit (right panel, "Diagram" tab)
//  3. Click Run (play button) to compile and simulate
//  4. Interact with components in the diagram
//  5. Watch Serial Monitor output below the diagram
//
// ============================================================
//
//  WHAT'S HAPPENING UNDER THE HOOD
//
//  When you click Run, SparkBench:
//
//  1. Sends your sketch to PlatformIO which compiles it to
//     an AVR .hex binary (same toolchain as real Arduino IDE)
//
//  2. Loads the hex into avr8js, a cycle-accurate ATmega328P
//     emulator running at 16MHz. This is a real CPU emulator
//     that executes AVR instructions one cycle at a time.
//     It models: 3 hardware timers, GPIO ports B/C/D, USART,
//     TWI (I2C), ADC, and the interrupt controller.
//
//  3. Wires each component to MCU pins at the register level:
//     - The 74HC595 shift register receives serial data via
//       shiftOut() — DS (data), SHCP (clock), STCP (latch) —
//       and SparkBench's shift register sim clocks bits through
//       an 8-bit internal register, outputting to Q0-Q7 which
//       drive the 8 LEDs
//     - The pushbutton writes to GPIO input registers (PINx)
//       and the internal pullup is modeled via PORTx bits
//     - The potentiometer feeds the ADC multiplexer (ADMUX)
//       and writes to ADCH/ADCL when a conversion completes
//     - The servo reads Timer1 ICR1 capture register to
//       decode PWM pulse width into an angle
//
//  4. Runs in real-time: the emulator throttles itself to
//     maintain 1:1 sim-to-wall-clock ratio so serial output
//     and timing-dependent code works correctly.
//
// ============================================================
//
//  THE SPARKBENCH WORKBENCH
//
//  Left panel (Editor):
//    sketch.ino    - Arduino code (this file). Monaco editor
//                    with Arduino/C++ syntax highlighting.
//    diagram.json  - Wokwi-format circuit definition. Parts,
//                    connections, wire routing. Edit visually
//                    on the Diagram tab or edit JSON directly.
//    board.kicad_pcb - KiCAD PCB layout. Auto-generated from
//                    the schematic. Switch to PCB/3D tabs.
//    libraries.txt - Arduino library deps (one per line).
//                    SparkBench auto-installs them at build.
//
//  Right panel (Simulation):
//    Diagram tab   - Interactive circuit canvas. Click parts
//                    to select. Drag to move. Draw wires
//                    between pins. Right-click for options.
//    PCB tab       - KiCAD board layout with copper layers,
//                    silkscreen, DRC, and ratsnest display.
//    3D tab        - Three.js 3D board viewer. Rotate/zoom.
//    Serial tab    - Serial monitor (below diagram).
//    Parts tab     - Component catalog. Click to add parts.
//
//  Toolbar:
//    Sparky button - Opens the AI engineering assistant.
//                    Sparky uses Claude Opus 4.6 via the
//                    Agent SDK. It has full context on your
//                    schematic, code, PCB, and libraries.
//                    It can edit files, trigger simulations,
//                    validate PCB floorplans, and present
//                    diffs for your review.
//
//  Try asking Sparky: "Add a buzzer that beeps when the
//  button is pressed" and watch it modify diagram.json
//  and sketch.ino with a reviewable diff.
//
// ============================================================

#include <Servo.h>

// --- Pin assignments ---
// 74HC595 shift register (serial-in, parallel-out)
const int SR_DATA  = 2;  // DS   - serial data input
const int SR_CLOCK = 3;  // SHCP - shift register clock
const int SR_LATCH = 4;  // STCP - storage register clock (latch)

const int BUTTON    = 5;  // Digital pin 5 <- pushbutton -> GND
const int POT_PIN   = A0; // Analog pin A0 <- potentiometer wiper
const int SERVO_PIN = 9;  // Digital pin 9 (Timer1 OC1A) -> servo PWM

Servo myServo;

// State
byte ledData = 0;         // Current 8-bit LED pattern
int animMode = 0;         // 0=chase, 1=fill, 2=bounce, 3=pot-bar
bool lastButtonState = HIGH;
unsigned long lastStep = 0;
int animPos = 0;
bool animDir = true;      // true=forward for bounce
unsigned long lastPrint = 0;

// Forward declarations
void updateShiftRegister();
void shiftWrite(int pin, bool state);

void setup() {
  Serial.begin(115200);
  Serial.println("=== SparkBench Demo Guide ===");
  Serial.println();
  Serial.println("Under the hood: avr8js ATmega328P @ 16MHz");
  Serial.println("74HC595 shift register -> 8 LEDs via SPI");
  Serial.println("GPIO ports B/C/D, Timer0/1/2, ADC, USART");
  Serial.println();
  Serial.println("Button cycles animation modes:");
  Serial.println("  0: Chase   - single LED scrolls across");
  Serial.println("  1: Fill    - LEDs light up one by one");
  Serial.println("  2: Bounce  - LED bounces back and forth");
  Serial.println("  3: Pot bar - potentiometer controls LED count");
  Serial.println();
  Serial.println("Potentiometer always controls the servo angle.");
  Serial.println();

  pinMode(SR_DATA, OUTPUT);
  pinMode(SR_CLOCK, OUTPUT);
  pinMode(SR_LATCH, OUTPUT);
  pinMode(BUTTON, INPUT_PULLUP);

  myServo.attach(SERVO_PIN);
  myServo.write(90);

  // Flash all LEDs on startup
  ledData = 0xFF;
  updateShiftRegister();
  delay(300);
  ledData = 0x00;
  updateShiftRegister();
  delay(200);
}

void updateShiftRegister() {
  // shiftOut() clocks 8 bits into the 74HC595 via DS/SHCP,
  // then a latch pulse on STCP transfers the shift register
  // contents to the output pins Q0-Q7 simultaneously.
  shiftOut(SR_DATA, SR_CLOCK, MSBFIRST, ledData);
  digitalWrite(SR_LATCH, HIGH);
  digitalWrite(SR_LATCH, LOW);
}

void shiftWrite(int pin, bool state) {
  bitWrite(ledData, pin, state);
  updateShiftRegister();
}

void loop() {
  // --- Button handling ---
  bool buttonState = digitalRead(BUTTON);
  if (buttonState == LOW && lastButtonState == HIGH) {
    animMode = (animMode + 1) % 4;
    animPos = 0;
    animDir = true;
    ledData = 0;
    updateShiftRegister();

    Serial.print("[button] mode ");
    Serial.print(animMode);
    switch (animMode) {
      case 0: Serial.println(": chase"); break;
      case 1: Serial.println(": fill"); break;
      case 2: Serial.println(": bounce"); break;
      case 3: Serial.println(": pot bar"); break;
    }
  }
  lastButtonState = buttonState;

  // --- Potentiometer -> Servo ---
  int potValue = analogRead(POT_PIN);
  int angle = map(potValue, 0, 1023, 0, 180);
  myServo.write(angle);

  // --- LED Animations (modes 0-2 are time-based) ---
  unsigned long now = millis();

  if (animMode == 3) {
    // Pot bar: map pot value to 0-8 LEDs lit
    int numLeds = map(potValue, 0, 1023, 0, 9);
    if (numLeds > 8) numLeds = 8;
    ledData = 0;
    for (int i = 0; i < numLeds; i++) {
      ledData |= (1 << i);
    }
    updateShiftRegister();
  } else if (now - lastStep > 120) {
    lastStep = now;

    switch (animMode) {
      case 0: // Chase - single LED moves across
        ledData = (1 << animPos);
        animPos = (animPos + 1) % 8;
        break;

      case 1: // Fill - LEDs light up one by one, then clear
        if (animPos <= 7) {
          ledData |= (1 << animPos);
        } else {
          ledData = 0;
        }
        animPos = (animPos + 1) % 16;
        break;

      case 2: // Bounce - LED bounces back and forth
        ledData = (1 << animPos);
        if (animDir) {
          animPos++;
          if (animPos >= 7) animDir = false;
        } else {
          animPos--;
          if (animPos <= 0) animDir = true;
        }
        break;
    }

    updateShiftRegister();
  }

  // Print state periodically
  if (now - lastPrint > 500) {
    lastPrint = now;
    Serial.print("[sr] LEDs=");
    for (int i = 7; i >= 0; i--) {
      Serial.print((ledData >> i) & 1);
    }
    Serial.print("  pot=");
    Serial.print(potValue);
    Serial.print(" servo=");
    Serial.print(angle);
    Serial.println("deg");
  }

  delay(10);
}
