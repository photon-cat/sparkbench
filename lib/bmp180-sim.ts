import type { AVRTWI, TWIEventHandler } from "avr8js";

/**
 * BMP180 / BMP085 barometric pressure sensor simulator.
 *
 * I2C slave at address 0x77. Implements the register protocol used by
 * the Adafruit BMP085/BMP180 library:
 *
 * Key registers:
 *   0xAA-0xBF  Calibration EEPROM (11 coefficients, 22 bytes)
 *   0xD0       Chip ID (returns 0x55)
 *   0xF4       Control register (write command byte)
 *   0xF6-0xF8  Measurement result (16-bit temp or 19-bit pressure)
 *
 * Commands written to 0xF4:
 *   0x2E              = start temperature measurement
 *   0x34+(oss<<6)     = start pressure measurement (oss 0-3)
 *
 * Default values: temperature=24°C, pressure=101325 Pa
 */

const BMP180_DEFAULT_ADDR = 0x77;
const REG_CALIB_START = 0xaa;
const REG_CHIP_ID = 0xd0;
const REG_CONTROL = 0xf4;
const REG_RESULT_MSB = 0xf6;
const REG_RESULT_LSB = 0xf7;
const REG_RESULT_XLSB = 0xf8;

const CMD_READ_TEMP = 0x2e;

// Calibration coefficients — realistic values from a typical BMP180
const CAL_AC1 = 408;
const CAL_AC2 = -72;
const CAL_AC3 = -14383;
const CAL_AC4 = 32741;
const CAL_AC5 = 32757;
const CAL_AC6 = 23153;
const CAL_B1 = 6190;
const CAL_B2 = 4;
const CAL_MB = -32768;
const CAL_MC = -8711;
const CAL_MD = 2868;

/**
 * Reverse the BMP180 temperature calculation to find the raw UT value
 * that will produce the desired temperature when the library processes it.
 *
 * Forward formula (from datasheet):
 *   X1 = (UT - AC6) * AC5 / 2^15
 *   X2 = MC * 2^11 / (X1 + MD)
 *   B5 = X1 + X2
 *   T = (B5 + 8) / 2^4   (in 0.1°C)
 */
function computeRawTemp(celsius: number): number {
  // Target T in 0.1°C units
  const T10 = Math.round(celsius * 10);
  // B5 = T * 16 - 8
  const B5 = T10 * 16 - 8;
  // X1 + X2 = B5, and X2 = MC * 2048 / (X1 + MD)
  // X1 = (UT - AC6) * AC5 / 32768
  // We solve numerically: try UT values. Since UT is ~27898 for 25°C,
  // we can solve analytically:
  // Let x1 = (UT - AC6) * AC5 / 32768
  // x2 = MC * 2048 / (x1 + MD)
  // x1 + x2 = B5
  // x1 + MC*2048/(x1+MD) = B5
  // x1*(x1+MD) + MC*2048 = B5*(x1+MD)
  // x1^2 + MD*x1 + MC*2048 = B5*x1 + B5*MD
  // x1^2 + (MD - B5)*x1 + MC*2048 - B5*MD = 0
  const a = 1;
  const b = CAL_MD - B5;
  const c = CAL_MC * 2048 - B5 * CAL_MD;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return 27898; // fallback
  const x1 = (-b + Math.sqrt(disc)) / (2 * a);
  // UT = x1 * 32768 / AC5 + AC6
  const UT = Math.round(x1 * 32768 / CAL_AC5 + CAL_AC6);
  return UT;
}

/**
 * Compute B5 from a raw temperature (needed for pressure calc).
 */
function computeB5(UT: number): number {
  const X1 = Math.floor(((UT - CAL_AC6) * CAL_AC5) / 32768);
  const X2 = Math.floor((CAL_MC * 2048) / (X1 + CAL_MD));
  return X1 + X2;
}

/**
 * Reverse the BMP180 pressure calculation to find the raw UP value
 * that will produce the desired pressure when the library processes it.
 *
 * We compute for oss=0 (ultra low power mode) which the Adafruit library
 * defaults to. The raw UP is 16-bit left-aligned in the 19-bit result
 * (shifted left by 8-oss = 8 for oss=0).
 */
function computeRawPressure(pascals: number, UT: number, oss: number): number {
  const B5 = computeB5(UT);
  const B6 = B5 - 4000;
  let X1 = Math.floor((CAL_B2 * Math.floor(B6 * B6 / 4096)) / 2048);
  let X2 = Math.floor(CAL_AC2 * B6 / 2048);
  let X3 = X1 + X2;
  const B3 = Math.floor(((Math.floor((CAL_AC1 * 4 + X3)) << oss) + 2) / 4);
  X1 = Math.floor(CAL_AC3 * B6 / 8192);
  X2 = Math.floor((CAL_B1 * Math.floor(B6 * B6 / 4096)) / 65536);
  X3 = Math.floor((X1 + X2 + 2) / 4);
  const B4 = Math.floor(CAL_AC4 * (X3 + 32768) / 32768);
  // p = 101325 + ... We need to reverse from p to find UP
  // Forward: B7 = (UP - B3) * (50000 >> oss)
  //          if B7 < 0x80000000: p = (B7 * 2) / B4
  //          else: p = (B7 / B4) * 2
  //          X1 = (p/256)^2, X1 = X1*3038/65536
  //          X2 = -7357*p/65536
  //          p = p + (X1 + X2 + 3791) / 16
  // Reverse: find UP from target p
  // Start from final p and work backwards
  let p = pascals;
  // Reverse the final correction: p_before = p - (X1 + X2 + 3791)/16
  // But X1,X2 depend on p_before... iterate
  let pPrev = p;
  for (let i = 0; i < 10; i++) {
    const pX1raw = Math.floor(pPrev / 256);
    let pX1 = pX1raw * pX1raw;
    pX1 = Math.floor(pX1 * 3038 / 65536);
    const pX2 = Math.floor(-7357 * pPrev / 65536);
    pPrev = p - Math.floor((pX1 + pX2 + 3791) / 16);
  }
  // pPrev is now the pressure before final correction
  // Reverse B7: B7 = pPrev * B4 / 2 (assuming B7 < 0x80000000)
  const B7 = Math.floor(pPrev * B4 / 2);
  // UP = B7 / (50000 >> oss) + B3
  const UP = Math.floor(B7 / (50000 >> oss)) + B3;
  // Raw value stored is UP << (8 - oss) for the 19-bit format
  return UP;
}

export class BMP180Controller implements TWIEventHandler {
  private registers = new Uint8Array(256);
  private regPointer = 0;
  private connected = false;
  private writing = false;
  private firstByte = true;
  private addr: number;

  private temperature = 24; // °C
  private pressure = 101325; // Pa
  private lastCommand = 0;
  private oss = 0; // oversampling setting

  constructor(private twi: AVRTWI, addr: number = BMP180_DEFAULT_ADDR) {
    this.addr = addr;
    // Write calibration EEPROM
    this.writeInt16(0xaa, CAL_AC1);
    this.writeInt16(0xac, CAL_AC2);
    this.writeInt16(0xae, CAL_AC3);
    this.writeUint16(0xb0, CAL_AC4);
    this.writeUint16(0xb2, CAL_AC5);
    this.writeUint16(0xb4, CAL_AC6);
    this.writeInt16(0xb6, CAL_B1);
    this.writeInt16(0xb8, CAL_B2);
    this.writeInt16(0xba, CAL_MB);
    this.writeInt16(0xbc, CAL_MC);
    this.writeInt16(0xbe, CAL_MD);

    // Chip ID
    this.registers[REG_CHIP_ID] = 0x55;

    // Compute initial measurement values
    this.updateMeasurement();
  }

  // --- Public API ---

  setTemperature(celsius: number) {
    this.temperature = Math.max(-40, Math.min(85, celsius));
    this.updateMeasurement();
  }

  setPressure(pascals: number) {
    this.pressure = Math.max(30000, Math.min(110000, pascals));
    this.updateMeasurement();
  }

  // --- TWIEventHandler ---

  start(): void {
    this.twi.completeStart();
  }

  stop(): void {
    this.connected = false;
    this.twi.completeStop();
  }

  connectToSlave(addr: number, write: boolean): void {
    if (addr === this.addr) {
      this.connected = true;
      this.writing = write;
      this.firstByte = write;
      this.twi.completeConnect(true);
    } else {
      this.connected = false;
      this.twi.completeConnect(false);
    }
  }

  writeByte(value: number): void {
    if (!this.connected) {
      this.twi.completeWrite(false);
      return;
    }

    if (this.firstByte) {
      this.regPointer = value;
      this.firstByte = false;
    } else {
      if (this.regPointer === REG_CONTROL) {
        this.lastCommand = value;
        this.handleCommand(value);
      }
      this.registers[this.regPointer] = value;
      this.regPointer = (this.regPointer + 1) & 0xff;
    }

    this.twi.completeWrite(true);
  }

  readByte(ack: boolean): void {
    if (!this.connected) {
      this.twi.completeRead(0xff);
      return;
    }

    const value = this.registers[this.regPointer];
    this.regPointer = (this.regPointer + 1) & 0xff;
    this.twi.completeRead(value);
  }

  // --- Internal ---

  private handleCommand(cmd: number) {
    if (cmd === CMD_READ_TEMP) {
      // Temperature measurement requested — write raw temp to result registers
      const UT = computeRawTemp(this.temperature);
      this.registers[REG_RESULT_MSB] = (UT >> 8) & 0xff;
      this.registers[REG_RESULT_LSB] = UT & 0xff;
      this.registers[REG_RESULT_XLSB] = 0;
    } else if ((cmd & 0x3f) === 0x34) {
      // Pressure measurement requested
      this.oss = (cmd >> 6) & 0x03;
      const UT = computeRawTemp(this.temperature);
      const UP = computeRawPressure(this.pressure, UT, this.oss);
      // Store as 19-bit value: UP << (8 - oss)
      const shifted = UP << (8 - this.oss);
      this.registers[REG_RESULT_MSB] = (shifted >> 16) & 0xff;
      this.registers[REG_RESULT_LSB] = (shifted >> 8) & 0xff;
      this.registers[REG_RESULT_XLSB] = shifted & 0xff;
    }
  }

  private updateMeasurement() {
    // Pre-compute so results are ready when read
    // (in real hardware there's a conversion delay, but we make it instant)
    const UT = computeRawTemp(this.temperature);
    this.registers[REG_RESULT_MSB] = (UT >> 8) & 0xff;
    this.registers[REG_RESULT_LSB] = UT & 0xff;
    this.registers[REG_RESULT_XLSB] = 0;
  }

  private writeInt16(addr: number, value: number) {
    value = Math.max(-32768, Math.min(32767, value));
    if (value < 0) value += 0x10000;
    this.registers[addr] = (value >> 8) & 0xff;
    this.registers[addr + 1] = value & 0xff;
  }

  private writeUint16(addr: number, value: number) {
    value = Math.max(0, Math.min(65535, value));
    this.registers[addr] = (value >> 8) & 0xff;
    this.registers[addr + 1] = value & 0xff;
  }
}
