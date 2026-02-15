import type { AVRTWI, TWIEventHandler } from "avr8js";

/**
 * MPU6050 accelerometer/gyroscope simulator.
 *
 * I2C slave at address 0x68. Implements the minimum register set
 * needed by common Arduino libraries (Adafruit_MPU6050, MPU6050_light, etc.):
 *
 * Key registers:
 *   0x3B-0x40  ACCEL_XOUT_H/L, YOUT, ZOUT  (16-bit signed)
 *   0x41-0x42  TEMP_OUT_H/L                 (16-bit signed)
 *   0x43-0x48  GYRO_XOUT_H/L, YOUT, ZOUT   (16-bit signed)
 *   0x6B       PWR_MGMT_1 (write 0 to wake)
 *   0x75       WHO_AM_I (returns 0x68)
 *
 * Default sensitivity:
 *   Accel: ±2g  → 16384 LSB/g
 *   Gyro:  ±250°/s → 131 LSB/(°/s)
 *   Temp:  raw = (celsius - 36.53) * 340
 */

const MPU6050_ADDR = 0x68;

// Register addresses
const REG_ACCEL_XOUT_H = 0x3b;
const REG_TEMP_OUT_H = 0x41;
const REG_GYRO_XOUT_H = 0x43;
const REG_PWR_MGMT_1 = 0x6b;
const REG_WHO_AM_I = 0x75;

export class MPU6050Controller implements TWIEventHandler {
  private registers = new Uint8Array(128);
  private regPointer = 0;
  private connected = false;
  private writing = false;
  private firstByte = true; // first byte after connect-write is register address

  constructor(private twi: AVRTWI) {
    // Initialize WHO_AM_I
    this.registers[REG_WHO_AM_I] = 0x68;
    // PWR_MGMT_1 default: 0x40 (sleep bit set)
    this.registers[REG_PWR_MGMT_1] = 0x40;
    // Default accel: 0g, 0g, 1g (sitting on table)
    this.setAccel(0, 0, 1);
    // Default temp: 25°C
    this.setTemperature(25);
    // Default gyro: 0
    this.setGyro(0, 0, 0);
  }

  // --- Public API ---

  /** Set accelerometer values in g units (±2g range) */
  setAccel(x: number, y: number, z: number) {
    const scale = 16384; // LSB/g at ±2g
    this.writeInt16(REG_ACCEL_XOUT_H, Math.round(x * scale));
    this.writeInt16(REG_ACCEL_XOUT_H + 2, Math.round(y * scale));
    this.writeInt16(REG_ACCEL_XOUT_H + 4, Math.round(z * scale));
  }

  /** Set gyroscope values in °/s (±250°/s range) */
  setGyro(x: number, y: number, z: number) {
    const scale = 131; // LSB/(°/s) at ±250°/s
    this.writeInt16(REG_GYRO_XOUT_H, Math.round(x * scale));
    this.writeInt16(REG_GYRO_XOUT_H + 2, Math.round(y * scale));
    this.writeInt16(REG_GYRO_XOUT_H + 4, Math.round(z * scale));
  }

  /** Set temperature in °C */
  setTemperature(celsius: number) {
    const raw = Math.round((celsius - 36.53) * 340);
    this.writeInt16(REG_TEMP_OUT_H, raw);
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
    if (addr === MPU6050_ADDR) {
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
      // First byte in a write transaction is the register address
      this.regPointer = value & 0x7f;
      this.firstByte = false;
    } else {
      // Subsequent bytes write to registers
      this.registers[this.regPointer] = value;
      this.regPointer = (this.regPointer + 1) & 0x7f;
    }

    this.twi.completeWrite(true);
  }

  readByte(ack: boolean): void {
    if (!this.connected) {
      this.twi.completeRead(0xff);
      return;
    }

    const value = this.registers[this.regPointer];
    this.regPointer = (this.regPointer + 1) & 0x7f;
    this.twi.completeRead(value);
  }

  // --- Helpers ---

  private writeInt16(addr: number, value: number) {
    // Clamp to signed 16-bit
    value = Math.max(-32768, Math.min(32767, value));
    if (value < 0) value += 0x10000;
    this.registers[addr] = (value >> 8) & 0xff;
    this.registers[addr + 1] = value & 0xff;
  }
}
