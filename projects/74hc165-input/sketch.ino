/*
  74HC165 Shift register input example

  https://wokwi.com/arduino/projects/306031380875182657

  (C) 2021, Uri Shaked
*/

const int dataPin = 2;   /* Q7 */
const int clockPin = 3;  /* CP */
const int latchPin = 4;  /* PL */

const int numBits = 8;   /* Set to 8 * number of shift registers */

void setup() {
  Serial.begin(115200);
  pinMode(dataPin, INPUT);
  pinMode(clockPin, OUTPUT);
  pinMode(latchPin, OUTPUT);
}

void loop() {
  // Step 1: Sample
  digitalWrite(latchPin, LOW);
  digitalWrite(latchPin, HIGH);

  // Step 2: Shift
  Serial.print("Bits: ");
  for (int i = 0; i < numBits; i++) {
    int bit = digitalRead(dataPin);
    if (bit == HIGH) {
      Serial.print("1");
    } else {
      Serial.print("0");
    }
    digitalWrite(clockPin, HIGH); // Shift out the next bit
    digitalWrite(clockPin, LOW);
  }

  Serial.println();
  delay(1000);
}