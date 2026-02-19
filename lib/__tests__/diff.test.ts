import { describe, it, expect } from "vitest";
import { diffLines } from "../diff";

describe("diffLines", () => {
  it("returns all 'same' for identical text", () => {
    const text = "a\nb\nc";
    const result = diffLines(text, text);
    expect(result).toEqual([
      { type: "same", content: "a" },
      { type: "same", content: "b" },
      { type: "same", content: "c" },
    ]);
  });

  it("detects additions", () => {
    const result = diffLines("a\nc", "a\nb\nc");
    expect(result).toEqual([
      { type: "same", content: "a" },
      { type: "add", content: "b" },
      { type: "same", content: "c" },
    ]);
  });

  it("detects deletions", () => {
    const result = diffLines("a\nb\nc", "a\nc");
    expect(result).toEqual([
      { type: "same", content: "a" },
      { type: "del", content: "b" },
      { type: "same", content: "c" },
    ]);
  });

  it("handles completely different text", () => {
    const result = diffLines("a\nb", "x\ny");
    const types = result.map((r) => r.type);
    expect(types).toContain("del");
    expect(types).toContain("add");
  });

  it("handles empty old text", () => {
    const result = diffLines("", "a\nb");
    // "" splits to [""], so we get a "same" for the empty line plus adds
    const addCount = result.filter((r) => r.type === "add").length;
    expect(addCount).toBeGreaterThanOrEqual(2);
  });

  it("handles empty new text", () => {
    const result = diffLines("a\nb", "");
    // "" splits to [""], so we get dels plus a "same" for the empty line
    const delCount = result.filter((r) => r.type === "del").length;
    expect(delCount).toBeGreaterThanOrEqual(2);
  });

  it("handles mixed changes", () => {
    const result = diffLines("a\nb\nc\nd", "a\nX\nc\nY");
    // a is same, b→X, c is same, d→Y
    expect(result[0]).toEqual({ type: "same", content: "a" });
    expect(result.find((r) => r.type === "same" && r.content === "c")).toBeTruthy();
  });
});
