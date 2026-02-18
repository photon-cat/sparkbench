// Claude Throbber — CC Hackathon
// 74HC595 LARSON scanner + SSD1306 "keep thinking"

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

#define DATA_PIN  4   // DS
#define CLOCK_PIN 3   // SHCP
#define LATCH_PIN 2   // STCP

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// Brightness levels for trail effect (0-255 mapped to on/off for shift register)
// We'll use persistence-of-vision style: main LED full on, neighbors dimmed via rapid switching
int pos = 0;
int direction = 1;
unsigned long lastStep = 0;
int stepDelay = 80; // ms between steps

// Dot animation for "keep thinking..."
int dotCount = 0;
unsigned long lastDot = 0;
int dotDelay = 400;

// OLED refresh rate limiter
unsigned long lastOLED = 0;
int oledDelay = 100; // ms between OLED redraws

void shiftOut595(byte data) {
  digitalWrite(LATCH_PIN, LOW);
  shiftOut(DATA_PIN, CLOCK_PIN, MSBFIRST, data);
  digitalWrite(LATCH_PIN, HIGH);
}

// Draw a single sparkle ray from center (cx,cy) at angle, with given length and width
void drawRay(int cx, int cy, float angle, int len, int w) {
  float cosA = cos(angle);
  float sinA = sin(angle);
  // Tip of the ray
  int tx = cx + (int)(cosA * len);
  int ty = cy + (int)(sinA * len);
  // Two base points perpendicular to the ray direction
  int bx1 = cx + (int)(-sinA * w);
  int by1 = cy + (int)(cosA * w);
  int bx2 = cx + (int)(sinA * w);
  int by2 = cy - (int)(cosA * w);
  display.fillTriangle(tx, ty, bx1, by1, bx2, by2, SSD1306_WHITE);
}

// Draw the Claude sparkle: 4 pointed star with teardrop-shaped rays
// The rays pulse in size based on the current animation phase
void drawSparkle(int cx, int cy, float phase) {
  // phase 0.0 to 1.0 controls the "breathing" size
  // Base ray length oscillates between min and max
  int minLen = 6;
  int maxLen = 16;
  int rayLen = minLen + (int)((maxLen - minLen) * phase);
  int rayW = 2 + (int)(2 * phase); // width of ray base

  // 4 rays at 45-degree offsets (like the Claude logo asterisk)
  // Claude's spark has rays at roughly: up, right, down, left
  // but rotated ~15 degrees for that distinctive tilt
  float baseAngle = -0.26; // slight tilt (~-15 degrees)
  for (int i = 0; i < 4; i++) {
    float angle = baseAngle + i * (PI / 4.0) * 2.0;
    drawRay(cx, cy, angle, rayLen, rayW);
  }

  // 4 shorter intermediate rays for the 8-point sparkle
  int shortLen = rayLen * 2 / 3;
  int shortW = max(1, rayW - 1);
  for (int i = 0; i < 4; i++) {
    float angle = baseAngle + PI / 4.0 + i * (PI / 4.0) * 2.0;
    drawRay(cx, cy, angle, shortLen, shortW);
  }

  // Small center dot
  display.fillCircle(cx, cy, 2, SSD1306_WHITE);
}

void drawOLED() {
  display.clearDisplay();

  // Compute a smooth breathing phase from the LED sweep position
  // pos goes 0..7..0, map to 0.0..1.0..0.0
  float phase = (float)pos / 7.0;
  // Make it pulse smoothly with a sine curve
  float breathe = 0.5 + 0.5 * sin(phase * PI);

  // Draw the Claude sparkle centered in upper area
  drawSparkle(64, 20, breathe);

  // "keep thinking" text centered below the sparkle
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  String text = "keep thinking";
  for (int i = 0; i < dotCount; i++) {
    text += ".";
  }

  int16_t x1, y1;
  uint16_t w, h;
  display.getTextBounds(text, 0, 0, &x1, &y1, &w, &h);
  display.setCursor((128 - w) / 2, 46);
  display.print(text);

  // Credit line
  display.setTextSize(1);
  display.setCursor(20, 57);
  display.print("~ claude code ~");

  display.display();
}

void setup() {
  Serial.begin(115200);
  Serial.println("Claude Throbber starting...");

  pinMode(DATA_PIN, OUTPUT);
  pinMode(CLOCK_PIN, OUTPUT);
  pinMode(LATCH_PIN, OUTPUT);

  shiftOut595(0);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("SSD1306 init failed!");
    while (1);
  }

  display.clearDisplay();
  display.display();
  Serial.println("Ready. Keep thinking...");
}

void loop() {
  unsigned long now = millis();

  // Update LED position (LARSON scanner)
  if (now - lastStep >= (unsigned long)stepDelay) {
    lastStep = now;

    // Build LED pattern with trail
    byte pattern = 0;
    for (int i = 0; i < 8; i++) {
      int dist = abs(i - pos);
      if (dist <= 2) {
        pattern |= (1 << i);
      }
    }
    shiftOut595(pattern);
    Serial.print("pos=");
    Serial.print(pos);
    Serial.print(" pattern=0b");
    Serial.println(pattern, BIN);

    // Move position
    pos += direction;
    if (pos >= 7) {
      pos = 7;
      direction = -1;
    } else if (pos <= 0) {
      pos = 0;
      direction = 1;
    }
  }

  // Update dot animation
  if (now - lastDot >= (unsigned long)dotDelay) {
    lastDot = now;
    dotCount = (dotCount + 1) % 4; // 0, 1, 2, 3 dots
  }

  // Update OLED at limited rate so it doesn't block the shift register
  if (now - lastOLED >= (unsigned long)oledDelay) {
    lastOLED = now;
    drawOLED();
  }
}
