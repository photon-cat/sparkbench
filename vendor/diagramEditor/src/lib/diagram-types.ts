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
