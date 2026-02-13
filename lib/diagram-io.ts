import { parseDiagram, type Diagram, type DiagramConnection } from "./diagram-parser";
import { extractNetlist } from "./netlist";

/**
 * Import a Wokwi diagram.json into Sparkbench format.
 * Promotes attrs.value to part.value and sets editor to sparkbench.
 */
export function importWokwi(json: unknown): Diagram {
  const diagram = parseDiagram(json);
  diagram.editor = "sparkbench";

  // Promote attrs.value to first-class value field
  for (const part of diagram.parts) {
    if (part.attrs.value && !part.value) {
      part.value = part.attrs.value;
    }
  }

  return diagram;
}

/**
 * Export a Sparkbench diagram to Wokwi format.
 * Converts netlabel connections into explicit wires and strips sparkbench-only fields.
 */
export function exportToWokwi(diagram: Diagram): Record<string, unknown> {
  const connections = [...diagram.connections];

  // Build set of pin pairs already connected by wires
  const wiredPairs = new Set<string>();
  for (const conn of connections) {
    const pair = [conn[0], conn[1]].sort().join("||");
    wiredPairs.add(pair);
  }

  // Use netlist to find pins connected only via labels
  const labels = diagram.labels ?? [];
  if (labels.length > 0) {
    const netlist = extractNetlist(diagram);

    // For each net, find pins that are connected via labels but not wires
    for (const net of netlist.nets) {
      if (net.pins.length < 2) continue;

      // Find label-connected pins (pins that appear in labels for this net)
      const labelPins = new Set<string>();
      for (const label of labels) {
        if (label.pinRef && net.pins.includes(label.pinRef)) {
          labelPins.add(label.pinRef);
        }
      }

      if (labelPins.size < 2) continue;

      // Connect label pins in a chain where no wire exists
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

  // Build parts without sparkbench-only fields, move value back to attrs
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
