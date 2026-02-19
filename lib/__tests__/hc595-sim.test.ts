import { describe, it, expect, vi } from "vitest";
import { HC595Chip } from "../hc595-sim";

describe("HC595Chip", () => {
  it("starts with zero in shift and output registers", () => {
    const chip = new HC595Chip();
    expect(chip.shiftRegister).toBe(0);
    expect(chip.outputRegister).toBe(0);
  });

  it("shifts bits in from LSB", () => {
    const chip = new HC595Chip();
    chip.shift(true);  // bit 0 = 1
    expect(chip.shiftRegister).toBe(0b00000001);

    chip.shift(false); // bit 1 = 0, shift left
    expect(chip.shiftRegister).toBe(0b00000010);

    chip.shift(true);  // bit 2 = 1
    expect(chip.shiftRegister).toBe(0b00000101);
  });

  it("returns old MSB (Q7S) on shift for daisy-chaining", () => {
    const chip = new HC595Chip();
    // Fill register with 0x80 (MSB set)
    chip.shiftRegister = 0x80;
    const q7s = chip.shift(false);
    expect(q7s).toBe(true); // old MSB was 1
  });

  it("returns false Q7S when MSB is 0", () => {
    const chip = new HC595Chip();
    chip.shiftRegister = 0x7f; // MSB is 0
    const q7s = chip.shift(false);
    expect(q7s).toBe(false);
  });

  it("wraps shift register to 8 bits", () => {
    const chip = new HC595Chip();
    chip.shiftRegister = 0xff;
    chip.shift(true);
    expect(chip.shiftRegister).toBe(0xff); // all bits still set (shifted out MSB, shifted in 1)
  });

  it("latch copies shift register to output register", () => {
    const chip = new HC595Chip();
    chip.shiftRegister = 0xab;
    chip.latch();
    expect(chip.outputRegister).toBe(0xab);
  });

  it("fires onOutputChange callback on latch when value changes", () => {
    const chip = new HC595Chip();
    const callback = vi.fn();
    chip.onOutputChange = callback;

    chip.shiftRegister = 0x05; // Q0=1, Q2=1
    chip.latch();

    expect(callback).toHaveBeenCalledOnce();
    const outputs = callback.mock.calls[0][0];
    expect(outputs[0]).toBe(true);  // Q0
    expect(outputs[1]).toBe(false); // Q1
    expect(outputs[2]).toBe(true);  // Q2
  });

  it("does not fire callback when latch value unchanged", () => {
    const chip = new HC595Chip();
    const callback = vi.fn();
    chip.onOutputChange = callback;

    chip.shiftRegister = 0;
    chip.latch(); // output was already 0
    expect(callback).not.toHaveBeenCalled();
  });

  it("supports daisy-chaining through Q7S overflow", () => {
    const chip1 = new HC595Chip();
    const chip2 = new HC595Chip();

    // Shift 9 bits: chip1 overflows MSB to chip2
    // Shift in: 1,0,0,0,0,0,0,0, 1
    // After 8 shifts: chip1 = 10000000, chip2 still 0
    // 9th shift: chip1 MSB overflows to chip2

    for (let i = 0; i < 8; i++) {
      const ds = i === 0; // first bit is 1, rest are 0
      const q7s = chip1.shift(ds);
      chip2.shift(q7s);
    }
    // chip1 = 0b10000000, chip2 = 0b00000000
    expect(chip1.shiftRegister).toBe(0x80);
    expect(chip2.shiftRegister).toBe(0x00);

    // One more shift: chip1's MSB (1) overflows to chip2
    const q7s = chip1.shift(true);
    chip2.shift(q7s);
    expect(q7s).toBe(true);
    expect(chip2.shiftRegister).toBe(0x01); // chip2 got the overflow bit
  });
});
