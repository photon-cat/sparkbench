import type { Diagram } from "./diagram-parser";

export interface Net {
  name: string;
  pins: string[];
}

export interface Netlist {
  nets: Net[];
  pinToNet: Map<string, string>;
}

class UnionFind {
  private parent = new Map<string, string>();
  private rank = new Map<string, number>();

  find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
    }
    let root = x;
    while (this.parent.get(root) !== root) {
      root = this.parent.get(root)!;
    }
    // Path compression
    let cur = x;
    while (cur !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }

  union(a: string, b: string): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    const rankA = this.rank.get(ra)!;
    const rankB = this.rank.get(rb)!;
    if (rankA < rankB) {
      this.parent.set(ra, rb);
    } else if (rankA > rankB) {
      this.parent.set(rb, ra);
    } else {
      this.parent.set(rb, ra);
      this.rank.set(ra, rankA + 1);
    }
  }

  getSets(): Map<string, string[]> {
    const sets = new Map<string, string[]>();
    for (const key of this.parent.keys()) {
      const root = this.find(key);
      if (!sets.has(root)) sets.set(root, []);
      sets.get(root)!.push(key);
    }
    return sets;
  }
}

/**
 * Extract a full netlist from schematic connections and labels.
 *
 * 1. Union all directly-connected pins from diagram.connections.
 * 2. Labels with the same name implicitly connect their pinRefs
 *    (KiCad global-label semantics).
 * 3. Group pins into nets, named by label or auto "Net-N".
 */
export function extractNetlist(diagram: Diagram): Netlist {
  const uf = new UnionFind();
  const labels = diagram.labels ?? [];

  // Union directly-connected pins
  for (const [fromPin, toPin] of diagram.connections) {
    uf.union(fromPin, toPin);
  }

  // Global labels: same name → same net
  const labelsByName = new Map<string, string[]>();
  for (const label of labels) {
    if (!labelsByName.has(label.name)) labelsByName.set(label.name, []);
    labelsByName.get(label.name)!.push(label.pinRef);
  }
  for (const [, pinRefs] of labelsByName) {
    for (let i = 1; i < pinRefs.length; i++) {
      uf.union(pinRefs[0], pinRefs[i]);
    }
  }

  // Map label pinRefs to their root for naming
  const rootLabelName = new Map<string, string>();
  for (const label of labels) {
    const root = uf.find(label.pinRef);
    if (!rootLabelName.has(root)) rootLabelName.set(root, label.name);
  }

  // Build nets
  const sets = uf.getSets();
  const nets: Net[] = [];
  const pinToNet = new Map<string, string>();
  let autoIdx = 1;

  for (const [root, pins] of sets) {
    const name = rootLabelName.get(root) ?? `Net-${autoIdx++}`;
    pins.sort();
    nets.push({ name, pins });
    for (const pin of pins) {
      pinToNet.set(pin, name);
    }
  }

  return { nets, pinToNet };
}
