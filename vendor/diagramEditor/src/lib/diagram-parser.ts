import type { Diagram } from "./diagram-types";

export function parseDiagram(json: unknown): Diagram {
  const d = json as Diagram;
  return {
    version: d.version ?? 1,
    author: d.author ?? "",
    editor: d.editor ?? "wokwi",
    parts: (d.parts ?? []).map((p) => ({
      ...p,
      attrs: p.attrs ?? {},
      value: p.value,
      footprint: p.footprint,
    })),
    connections: d.connections ?? [],
    labels: d.labels ?? [],
    serialMonitor: d.serialMonitor,
  };
}
