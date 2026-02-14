import { parseDiagram } from "./diagram-parser";
import type { Diagram, DiagramConnection } from "./diagram-types";
import { extractNetlist } from "./netlist";

/**
 * Import a Wokwi diagram.json.
 * Promotes attrs.value to part.value.
 */
export function importWokwi(json: unknown): Diagram {
  const diagram = parseDiagram(json);

  for (const part of diagram.parts) {
    if (part.attrs.value && !part.value) {
      part.value = part.attrs.value;
    }
  }

  return diagram;
}

/**
 * Export diagram to Wokwi format.
 * Converts netlabel connections into explicit wires.
 */
export function exportToWokwi(diagram: Diagram): Record<string, unknown> {
  const connections = [...diagram.connections];

  const wiredPairs = new Set<string>();
  for (const conn of connections) {
    const pair = [conn[0], conn[1]].sort().join("||");
    wiredPairs.add(pair);
  }

  const labels = diagram.labels ?? [];
  if (labels.length > 0) {
    const netlist = extractNetlist(diagram);

    for (const net of netlist.nets) {
      if (net.pins.length < 2) continue;

      const labelPins = new Set<string>();
      for (const label of labels) {
        if (label.pinRef && net.pins.includes(label.pinRef)) {
          labelPins.add(label.pinRef);
        }
      }

      if (labelPins.size < 2) continue;

      const labelPinList = [...labelPins].sort();
      for (let i = 1; i < labelPinList.length; i++) {
        const a = labelPinList[i - 1];
        const b = labelPinList[i];
        const pair = [a, b].sort().join("||");
        if (!wiredPairs.has(pair)) {
          connections.push([a, b, "green", []] as DiagramConnection);
          wiredPairs.add(pair);
        }
      }
    }
  }

  const parts = diagram.parts.map((p) => {
    const attrs = { ...p.attrs };
    if (p.value) {
      attrs.value = p.value;
    }
    const wokwiPart: Record<string, unknown> = {
      type: p.type,
      id: p.id,
      top: p.top,
      left: p.left,
      attrs,
    };
    if (p.rotate) wokwiPart.rotate = p.rotate;
    return wokwiPart;
  });

  const result: Record<string, unknown> = {
    version: diagram.version,
    author: diagram.author,
    editor: "wokwi",
    parts,
    connections,
  };

  if (diagram.serialMonitor) {
    result.serialMonitor = diagram.serialMonitor;
  }

  return result;
}
