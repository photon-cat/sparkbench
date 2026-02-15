/*
  74HC595 Shift Register test sketch

  Sends known patterns to the shift register and reports via Serial.
  Used for automated scenario testing.
*/

int dataPin = 2;   // DS
int clockPin = 3;  // SHCP
int latchPin = 4;  // STCP

void setup() {
  Serial.begin(115200);
  pinMode(dataPin, OUTPUT);
  pinMode(clockPin, OUTPUT);
  pinMode(latchPin, OUTPUT);
}

void sendByte(byte val) {
  shiftOut(dataPin, clockPin, MSBFIRST, val);
  digitalWrite(latchPin, HIGH);
  digitalWrite(latchPin, LOW);
  Serial.print("OUT: ");
  for (int i = 7; i >= 0; i--) {
    Serial.print(bitRead(val, i));
  }
  Serial.println();
}

void loop() {
  sendByte(0x00);
  delay(500);
  sendByte(0x01);
  delay(500);
  sendByte(0x80);
  delay(500);
  sendByte(0xAA);
  delay(500);
  sendByte(0xFF);
  delay(500);
  sendByte(0x00);
  delay(2000);
}
