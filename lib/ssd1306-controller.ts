import type { AVRTWI, TWIEventHandler } from "avr8js";

const SSD1306_DEFAULT_ADDR = 0x3c;
const SCREEN_WIDTH = 128;
const SCREEN_HEIGHT = 64;
const GDDRAM_SIZE = (SCREEN_WIDTH * SCREEN_HEIGHT) / 8; // 1024 bytes
const NUM_PAGES = SCREEN_HEIGHT / 8; // 8

const ADDR_HORIZONTAL = 0x00;
const ADDR_VERTICAL = 0x01;

export class SSD1306Controller implements TWIEventHandler {
  private gddram = new Uint8Array(GDDRAM_SIZE);

  // Display state
  private addressingMode = ADDR_HORIZONTAL;
  private columnStart = 0;
  private columnEnd = SCREEN_WIDTH - 1;
  private pageStart = 0;
  private pageEnd = NUM_PAGES - 1;
  private column = 0;
  private page = 0;

  // I2C transaction state
  private connected = false;
  private controlByte: number | null = null;
  private expectingControlByte = true;

  // Multi-byte command state
  private pendingCommand: number | null = null;
  private pendingArgs: number[] = [];
  private expectedArgCount = 0;

  // Rendering
  private dirty = false;
  private imageData: ImageData;
  private rafId: number | null = null;

  onFrameReady: ((imageData: ImageData) => void) | null = null;

  constructor(
    private twi: AVRTWI,
    private address = SSD1306_DEFAULT_ADDR,
  ) {
    this.imageData = new ImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  // --- TWIEventHandler ---

  start(): void {
    this.twi.completeStart();
  }

  stop(): void {
    this.connected = false;
    this.controlByte = null;
    this.expectingControlByte = true;
    if (this.dirty) this.scheduleRender();
    this.twi.completeStop();
  }

  connectToSlave(addr: number, write: boolean): void {
    if (addr === this.address) {
      this.connected = true;
      this.expectingControlByte = true;
      this.controlByte = null;
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

    if (this.expectingControlByte) {
      this.controlByte = value;
      this.expectingControlByte = false;
      this.twi.completeWrite(true);
      return;
    }

    if (this.controlByte === 0x00 || this.controlByte === 0x80) {
      this.processCommand(value);
    } else if ((this.controlByte! & 0x40) !== 0) {
      this.writeData(value);
    }

    // 0x80 = single command mode: next byte is another control byte
    if (this.controlByte === 0x80) {
      this.expectingControlByte = true;
    }

    this.twi.completeWrite(true);
  }

  readByte(): void {
    this.twi.completeRead(0x00);
  }

  // --- Command processing ---

  private processCommand(cmd: number): void {
    // Collecting args for a multi-byte command
    if (this.pendingCommand !== null) {
      this.pendingArgs.push(cmd);
      if (this.pendingArgs.length >= this.expectedArgCount) {
        this.executeMultiByteCommand(this.pendingCommand, this.pendingArgs);
        this.pendingCommand = null;
        this.pendingArgs = [];
      }
      return;
    }

    if (cmd >= 0x00 && cmd <= 0x0f) {
      // Set lower nibble of column (page mode)
      this.column = (this.column & 0xf0) | (cmd & 0x0f);
    } else if (cmd >= 0x10 && cmd <= 0x1f) {
      // Set upper nibble of column (page mode)
      this.column = (this.column & 0x0f) | ((cmd & 0x0f) << 4);
    } else if (cmd === 0x20) {
      this.startMultiByte(cmd, 1);
    } else if (cmd === 0x21) {
      this.startMultiByte(cmd, 2);
    } else if (cmd === 0x22) {
      this.startMultiByte(cmd, 2);
    } else if (cmd >= 0xb0 && cmd <= 0xb7) {
      this.page = cmd & 0x07;
    } else if (
      cmd === 0x81 || cmd === 0xd5 || cmd === 0xd3 ||
      cmd === 0x8d || cmd === 0xda || cmd === 0xdb ||
      cmd === 0xd9 || cmd === 0xa8
    ) {
      // Init commands that take 1 arg — consume and ignore
      this.startMultiByte(cmd, 1);
    }
    // Display on/off (0xAE/0xAF), segment remap (0xA0/0xA1),
    // COM scan direction (0xC0/0xC8), etc. — single-byte, no effect on GDDRAM
  }

  private startMultiByte(cmd: number, argCount: number): void {
    this.pendingCommand = cmd;
    this.expectedArgCount = argCount;
    this.pendingArgs = [];
  }

  private executeMultiByteCommand(cmd: number, args: number[]): void {
    switch (cmd) {
      case 0x20:
        this.addressingMode = args[0]! & 0x03;
        break;
      case 0x21:
        this.columnStart = args[0]! & 0x7f;
        this.columnEnd = args[1]! & 0x7f;
        this.column = this.columnStart;
        break;
      case 0x22:
        this.pageStart = args[0]! & 0x07;
        this.pageEnd = args[1]! & 0x07;
        this.page = this.pageStart;
        break;
    }
  }

  // --- GDDRAM writes ---

  private writeData(value: number): void {
    if (this.page < NUM_PAGES && this.column < SCREEN_WIDTH) {
      this.gddram[this.page * SCREEN_WIDTH + this.column] = value;
      this.dirty = true;
    }
    this.advanceCursor();
  }

  private advanceCursor(): void {
    if (this.addressingMode === ADDR_HORIZONTAL) {
      this.column++;
      if (this.column > this.columnEnd) {
        this.column = this.columnStart;
        this.page++;
        if (this.page > this.pageEnd) {
          this.page = this.pageStart;
        }
      }
    } else if (this.addressingMode === ADDR_VERTICAL) {
      this.page++;
      if (this.page > this.pageEnd) {
        this.page = this.pageStart;
        this.column++;
        if (this.column > this.columnEnd) {
          this.column = this.columnStart;
        }
      }
    } else {
      // Page addressing mode
      this.column++;
      if (this.column >= SCREEN_WIDTH) {
        this.column = 0;
      }
    }
  }

  // --- Rendering ---

  private scheduleRender(): void {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.renderToImageData();
    });
  }

  private renderToImageData(): void {
    if (!this.dirty) return;
    this.dirty = false;

    const data = this.imageData.data;
    for (let p = 0; p < NUM_PAGES; p++) {
      const pageOffset = p * SCREEN_WIDTH;
      const yBase = p * 8;
      for (let col = 0; col < SCREEN_WIDTH; col++) {
        const byte = this.gddram[pageOffset + col]!;
        for (let bit = 0; bit < 8; bit++) {
          const offset = ((yBase + bit) * SCREEN_WIDTH + col) * 4;
          const color = (byte >> bit) & 1 ? 0xff : 0x00;
          data[offset] = color;
          data[offset + 1] = color;
          data[offset + 2] = color;
          data[offset + 3] = 0xff;
        }
      }
    }

    this.onFrameReady?.(this.imageData);
  }

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
