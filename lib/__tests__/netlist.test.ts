import { describe, it, expect } from "vitest";
import { extractNetlist } from "../netlist";
import { parseDiagram } from "../diagram-parser";

describe("extractNetlist", () => {
  it("groups directly connected pins into nets", () => {
    const diagram = parseDiagram({
      parts: [
        { type: "wokwi-arduino-uno", id: "uno", top: 0, left: 0 },
        { type: "wokwi-led", id: "led1", top: 0, left: 100 },
      ],
      connections: [["uno:13", "led1:A", "green", []]],
    });
    const netlist = extractNetlist(diagram);
    expect(netlist.nets).toHaveLength(1);
    expect(netlist.nets[0].pins).toContain("uno:13");
    expect(netlist.nets[0].pins).toContain("led1:A");
    expect(netlist.pinToNet.get("uno:13")).toBe(netlist.pinToNet.get("led1:A"));
  });

  it("creates separate nets for unconnected pins", () => {
    const diagram = parseDiagram({
      parts: [],
      connections: [
        ["a:1", "b:1", "", []],
        ["c:1", "d:1", "", []],
      ],
    });
    const netlist = extractNetlist(diagram);
    expect(netlist.nets).toHaveLength(2);
    expect(netlist.pinToNet.get("a:1")).not.toBe(netlist.pinToNet.get("c:1"));
  });

  it("merges nets through transitive connections", () => {
    const diagram = parseDiagram({
      parts: [],
      connections: [
        ["a:1", "b:1", "", []],
        ["b:1", "c:1", "", []],
      ],
    });
    const netlist = extractNetlist(diagram);
    expect(netlist.nets).toHaveLength(1);
    expect(netlist.nets[0].pins).toHaveLength(3);
  });

  it("uses label names for nets when available", () => {
    const diagram = parseDiagram({
      parts: [],
      connections: [["a:1", "b:1", "", []]],
      labels: [
        { id: "l1", name: "VCC", pinRef: "a:1", x: 0, y: 0 },
      ],
    });
    const netlist = extractNetlist(diagram);
    expect(netlist.nets[0].name).toBe("VCC");
  });

  it("merges pins with same label name", () => {
    const diagram = parseDiagram({
      parts: [],
      connections: [],
      labels: [
        { id: "l1", name: "SIG", pinRef: "a:1", x: 0, y: 0 },
        { id: "l2", name: "SIG", pinRef: "b:1", x: 10, y: 0 },
      ],
    });
    const netlist = extractNetlist(diagram);
    expect(netlist.nets).toHaveLength(1);
    expect(netlist.nets[0].pins).toContain("a:1");
    expect(netlist.nets[0].pins).toContain("b:1");
  });

  it("auto-names nets as Net-N when no label", () => {
    const diagram = parseDiagram({
      parts: [],
      connections: [["x:1", "y:1", "", []]],
    });
    const netlist = extractNetlist(diagram);
    expect(netlist.nets[0].name).toMatch(/^Net-\d+$/);
  });

  it("handles empty diagram", () => {
    const diagram = parseDiagram({});
    const netlist = extractNetlist(diagram);
    expect(netlist.nets).toHaveLength(0);
    expect(netlist.pinToNet.size).toBe(0);
  });
});
