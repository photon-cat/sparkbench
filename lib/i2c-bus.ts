import type { AVRTWI, TWIEventHandler } from "avr8js";

/**
 * I2C bus multiplexer — dispatches TWI events to multiple I2C devices by address.
 *
 * Only one TWIEventHandler can be set on runner.twi at a time.
 * This class acts as a router, forwarding events to the device
 * whose address matched in connectToSlave().
 */
export class I2CBus implements TWIEventHandler {
  private devices = new Map<number, TWIEventHandler>();
  private activeDevice: TWIEventHandler | null = null;

  constructor(private twi: AVRTWI) {}

  addDevice(address: number, handler: TWIEventHandler): void {
    this.devices.set(address, handler);
  }

  // --- TWIEventHandler ---

  start(): void {
    this.twi.completeStart();
  }

  stop(): void {
    if (this.activeDevice) {
      this.activeDevice.stop();
      this.activeDevice = null;
    } else {
      this.twi.completeStop();
    }
  }

  connectToSlave(addr: number, write: boolean): void {
    const device = this.devices.get(addr);
    if (device) {
      this.activeDevice = device;
      device.connectToSlave(addr, write);
    } else {
      this.activeDevice = null;
      this.twi.completeConnect(false);
    }
  }

  writeByte(value: number): void {
    if (this.activeDevice) {
      this.activeDevice.writeByte(value);
    } else {
      this.twi.completeWrite(false);
    }
  }

  readByte(ack: boolean): void {
    if (this.activeDevice) {
      this.activeDevice.readByte(ack);
    } else {
      this.twi.completeRead(0xff);
    }
  }
}
