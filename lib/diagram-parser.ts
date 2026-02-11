export interface DiagramPart {
  type: string;
  id: string;
  top: number;
  left: number;
  rotate?: number;
  attrs: Record<string, string>;
}

// Each connection: [fromPin, toPin, color, routingHints]
export type DiagramConnection = [string, string, string, string[]];

export interface DiagramLabel {
  id: string;
  name: string;
  pinRef: string;
  x: number;
  y: number;
  orientation?: number;
}

export interface Diagram {
  version: number;
  author: string;
  editor: string;
  parts: DiagramPart[];
  connections: DiagramConnection[];
  labels?: DiagramLabel[];
}

export function parseDiagram(json: unknown): Diagram {
  const d = json as Diagram;
  return {
    version: d.version ?? 1,
    author: d.author ?? "",
    editor: d.editor ?? "",
    parts: d.parts ?? [],
    connections: d.connections ?? [],
    labels: d.labels ?? [],
  };
}

/**
 * Find which Arduino pin a component is connected to.
 * Returns mapping: componentId -> { pinName, arduinoPin }
 */
export function findComponentPins(
  diagram: Diagram,
  mcuId = "uno"
): Map<string, string> {
  const map = new Map<string, string>();

  const partsById = new Map<string, DiagramPart>();
  for (const part of diagram.parts) {
    partsById.set(part.id, part);
  }

  // Passive components that pass signals through (e.g. resistors)
  const passiveTypes = new Set(["wokwi-resistor"]);

  // Step 1: Direct MCU connections
  for (const conn of diagram.connections) {
    const [a, b] = conn;

    let mcuPin: string | null = null;
    let componentId: string | null = null;

    if (a.startsWith(`${mcuId}:`)) {
      mcuPin = a.split(":")[1];
      componentId = b.split(":")[0];
    } else if (b.startsWith(`${mcuId}:`)) {
      mcuPin = b.split(":")[1];
      componentId = a.split(":")[0];
    }

    if (!mcuPin || !componentId) continue;
    if (mcuPin.startsWith("GND") || mcuPin === "5V" || mcuPin === "3.3V")
      continue;

    if (!map.has(componentId)) {
      map.set(componentId, mcuPin);
    }
  }

  // Step 2: Propagate through passive components (e.g. resistors between MCU and LED)
  let changed = true;
  while (changed) {
    changed = false;
    for (const conn of diagram.connections) {
      const [a, b] = conn;
      const aId = a.split(":")[0];
      const bId = b.split(":")[0];

      if (aId === mcuId || bId === mcuId) continue;

      if (map.has(aId) && !map.has(bId)) {
        const part = partsById.get(aId);
        if (part && passiveTypes.has(part.type)) {
          map.set(bId, map.get(aId)!);
          changed = true;
        }
      } else if (map.has(bId) && !map.has(aId)) {
        const part = partsById.get(bId);
        if (part && passiveTypes.has(part.type)) {
          map.set(aId, map.get(bId)!);
          changed = true;
        }
      }
    }
  }

  return map;
}
