export interface DiagramPart {
  type: string;
  id: string;
  top: number;
  left: number;
  rotate?: number;
  attrs: Record<string, string>;
  value?: string;
  footprint?: string;
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
  serialMonitor?: { display: string };
}

/**
 * Wokwi renamed some part types from wokwi-* to board-*.
 * Normalize them so all downstream code uses the wokwi-* form.
 */
const TYPE_ALIASES: Record<string, string> = {
  "board-ssd1306": "wokwi-ssd1306",
  "board-lcd1602": "wokwi-lcd1602",
  "board-lcd2004": "wokwi-lcd2004",
  "board-ili9341": "wokwi-ili9341",
};

function normalizePartType(type: string): string {
  return TYPE_ALIASES[type] || type;
}

/** MCU part type → metadata for simulation. */
export interface MCUInfo {
  id: string;           // part id from diagram (e.g. "uno", "u1")
  type: string;         // part type (e.g. "wokwi-arduino-uno")
  boardId: string;      // PlatformIO board env name
  pinStyle: "arduino" | "avr-port";
  label: string;
  simulatable: boolean; // true if avr8js can run this chip
}

const MCU_REGISTRY: Record<string, { boardId: string; pinStyle: "arduino" | "avr-port"; label: string; simulatable: boolean }> = {
  "wokwi-arduino-uno":   { boardId: "uno",        pinStyle: "arduino",   label: "Arduino Uno",   simulatable: true },
  "wokwi-arduino-nano":  { boardId: "uno",        pinStyle: "arduino",   label: "Arduino Nano",  simulatable: true },
  "wokwi-arduino-mega":  { boardId: "mega",       pinStyle: "arduino",   label: "Arduino Mega",  simulatable: false },
  "sb-atmega328":        { boardId: "atmega328p",  pinStyle: "avr-port",  label: "ATmega328P",    simulatable: true },
};

/**
 * Find all MCU parts in the diagram, in parts-array order.
 * First simulatable MCU is the default target (Wokwi convention).
 */
export function findMCUs(diagram: Diagram): MCUInfo[] {
  const mcus: MCUInfo[] = [];
  for (const part of diagram.parts) {
    const reg = MCU_REGISTRY[part.type];
    if (reg) {
      mcus.push({ id: part.id, type: part.type, ...reg });
    }
  }
  return mcus;
}

export function parseDiagram(json: unknown): Diagram {
  const d = json as Diagram;
  return {
    version: d.version ?? 1,
    author: d.author ?? "",
    editor: d.editor ?? "sparkbench",
    parts: (d.parts ?? []).map((p) => ({
      ...p,
      type: normalizePartType(p.type),
      attrs: p.attrs ?? {},
      value: p.value,
      footprint: p.footprint,
    })),
    connections: d.connections ?? [],
    labels: d.labels ?? [],
    serialMonitor: d.serialMonitor,
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
    if (mcuPin.startsWith("GND") || mcuPin === "5V" || mcuPin === "3.3V"
        || mcuPin === "VCC" || mcuPin === "AVCC" || mcuPin === "AREF" || mcuPin === "GND2")
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
