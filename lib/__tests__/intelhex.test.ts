import { describe, it, expect } from "vitest";
import { loadHex } from "../intelhex";

describe("loadHex", () => {
  it("parses a single data record", () => {
    // :10 0000 00 0C9434000C9451000C9451000C945100 A1
    // 16 bytes at address 0x0000, record type 00
    const hex = ":100000000C9434000C9451000C9451000C945100A1\n";
    const target = new Uint8Array(256);
    loadHex(hex, target);

    expect(target[0]).toBe(0x0c);
    expect(target[1]).toBe(0x94);
    expect(target[2]).toBe(0x34);
    expect(target[3]).toBe(0x00);
    expect(target[4]).toBe(0x0c);
    expect(target[5]).toBe(0x94);
  });

  it("parses multiple data records at different addresses", () => {
    const hex = [
      ":02000000AABB30", // 2 bytes at 0x0000: AA BB
      ":0200100011228B", // 2 bytes at 0x0010: 11 22
    ].join("\n");
    const target = new Uint8Array(256);
    loadHex(hex, target);

    expect(target[0]).toBe(0xaa);
    expect(target[1]).toBe(0xbb);
    expect(target[16]).toBe(0x11);
    expect(target[17]).toBe(0x22);
  });

  it("skips non-00 record types (e.g. EOF record)", () => {
    const hex = [
      ":02000000FFEE11", // data record
      ":00000001FF",     // EOF record (type 01) — should be skipped
    ].join("\n");
    const target = new Uint8Array(256);
    loadHex(hex, target);

    expect(target[0]).toBe(0xff);
    expect(target[1]).toBe(0xee);
  });

  it("handles empty input", () => {
    const target = new Uint8Array(256);
    loadHex("", target);
    expect(target.every((b) => b === 0)).toBe(true);
  });

  it("handles lines without colon prefix", () => {
    const hex = "not a hex line\n:01000000AB54\n";
    const target = new Uint8Array(256);
    loadHex(hex, target);
    expect(target[0]).toBe(0xab);
  });
});
