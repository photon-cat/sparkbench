/**
 * Ratsnest computation for unconnected pad pairs.
 *
 * For each net: find all pads, determine connectivity via traces/vias,
 * draw thin lines between closest unconnected pad pairs.
 */

import type { PCBDesign, PCBFootprint } from "./pcb-types";
import type { KicadPCB } from "@kicanvas/kicad/board";

export interface RatsnestLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    net: string;
}

/** Get absolute pad position with rotation */
function absPadPos(
    fp: PCBFootprint,
    padX: number,
    padY: number,
): { x: number; y: number } {
    const rad = (fp.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        x: fp.x + padX * cos - padY * sin,
        y: fp.y + padX * sin + padY * cos,
    };
}

/** Simple Union-Find for connectivity */
class UnionFind {
    parent: Map<string, string> = new Map();

    find(x: string): string {
        if (!this.parent.has(x)) this.parent.set(x, x);
        let root = x;
        while (this.parent.get(root) !== root) {
            root = this.parent.get(root)!;
        }
        // Path compression
        let current = x;
        while (current !== root) {
            const next = this.parent.get(current)!;
            this.parent.set(current, root);
            current = next;
        }
        return root;
    }

    union(a: string, b: string) {
        const ra = this.find(a);
        const rb = this.find(b);
        if (ra !== rb) {
            this.parent.set(ra, rb);
        }
    }

    connected(a: string, b: string): boolean {
        return this.find(a) === this.find(b);
    }
}

/**
 * Compute ratsnest lines for the given design.
 * Returns lines between unconnected pad pairs on each net.
 */
export function computeRatsnest(design: PCBDesign): RatsnestLine[] {
    const lines: RatsnestLine[] = [];

    // Build net → pads map with absolute positions
    const netPads = new Map<
        string,
        { id: string; x: number; y: number }[]
    >();

    for (const fp of design.footprints) {
        for (const pad of fp.pads) {
            if (!pad.net) continue;
            const pos = absPadPos(fp, pad.x, pad.y);
            const pads = netPads.get(pad.net) ?? [];
            pads.push({ id: pad.id, x: pos.x, y: pos.y });
            netPads.set(pad.net, pads);
        }
    }

    // Build connectivity from traces
    // A trace connects pads that are near its endpoints
    const CONNECT_THRESHOLD = 0.5; // mm

    for (const [net, pads] of netPads) {
        if (pads.length <= 1) continue;

        const uf = new UnionFind();

        // Initialize all pads
        for (const pad of pads) {
            uf.find(pad.id);
        }

        // Check trace connectivity for this net
        for (const trace of design.traces) {
            if (trace.net !== net) continue;

            // For each segment, find pads near endpoints
            for (const seg of trace.segments) {
                const endpointPads: string[] = [];
                for (const pad of pads) {
                    const d1 = Math.hypot(pad.x - seg.x1, pad.y - seg.y1);
                    const d2 = Math.hypot(pad.x - seg.x2, pad.y - seg.y2);
                    if (d1 < CONNECT_THRESHOLD || d2 < CONNECT_THRESHOLD) {
                        endpointPads.push(pad.id);
                    }
                }
                // Union all pads connected by this segment
                for (let i = 1; i < endpointPads.length; i++) {
                    uf.union(endpointPads[0]!, endpointPads[i]!);
                }
            }

            // Also union pads connected through segment chains
            // (segments sharing endpoints)
            for (let i = 0; i < trace.segments.length - 1; i++) {
                const a = trace.segments[i]!;
                const b = trace.segments[i + 1]!;
                // Find pads near a's endpoints and b's endpoints
                const findNearPad = (x: number, y: number) =>
                    pads.find(
                        (p) => Math.hypot(p.x - x, p.y - y) < CONNECT_THRESHOLD,
                    );
                const pa = findNearPad(a.x1, a.y1) ?? findNearPad(a.x2, a.y2);
                const pb = findNearPad(b.x1, b.y1) ?? findNearPad(b.x2, b.y2);
                if (pa && pb) uf.union(pa.id, pb.id);
            }
        }

        // Find disconnected groups
        const groups = new Map<string, typeof pads>();
        for (const pad of pads) {
            const root = uf.find(pad.id);
            const group = groups.get(root) ?? [];
            group.push(pad);
            groups.set(root, group);
        }

        if (groups.size <= 1) continue; // Fully connected

        // Draw ratsnest between closest pads of different groups
        const groupList = Array.from(groups.values());
        for (let i = 0; i < groupList.length - 1; i++) {
            // Find closest pad pair between group i and any later group
            let bestDist = Infinity;
            let bestLine: RatsnestLine | null = null;

            for (let j = i + 1; j < groupList.length; j++) {
                for (const a of groupList[i]!) {
                    for (const b of groupList[j]!) {
                        const dist = Math.hypot(a.x - b.x, a.y - b.y);
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestLine = {
                                x1: a.x,
                                y1: a.y,
                                x2: b.x,
                                y2: b.y,
                                net,
                            };
                        }
                    }
                }
            }

            if (bestLine) lines.push(bestLine);
        }
    }

    return lines;
}

/**
 * Compute ratsnest lines from a KiCanvas KicadPCB board model.
 * Works with the parsed board object (viewer.board) rather than our PCBDesign type.
 */
export function computeRatsnestFromBoard(board: KicadPCB): RatsnestLine[] {
    const lines: RatsnestLine[] = [];

    // Build net → pads map with absolute positions
    const netPads = new Map<
        string,
        { id: string; x: number; y: number }[]
    >();

    for (const fp of board.footprints) {
        const fpPos = fp.at?.position;
        const fpRot = fp.at?.rotation ?? 0;
        if (!fpPos) continue;

        const rad = (fpRot * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        for (const pad of fp.pads) {
            const netName = pad.net?.name;
            if (!netName) continue;

            // Pad position is relative to footprint, rotate by footprint angle
            const px = pad.at?.position?.x ?? 0;
            const py = pad.at?.position?.y ?? 0;
            const absX = fpPos.x + px * cos - py * sin;
            const absY = fpPos.y + px * sin + py * cos;

            const padId = `${fp.reference}:${pad.number}`;
            const pads = netPads.get(netName) ?? [];
            pads.push({ id: padId, x: absX, y: absY });
            netPads.set(netName, pads);
        }
    }

    // Build connectivity from traces
    const CONNECT_THRESHOLD = 0.5; // mm

    for (const [net, pads] of netPads) {
        if (pads.length <= 1) continue;

        const uf = new UnionFind();
        for (const pad of pads) {
            uf.find(pad.id);
        }

        // Check trace segment connectivity
        for (const seg of board.segments) {
            const segNet = seg.netname;
            if (segNet !== net) continue;

            // LineSegment has start/end as Vec2
            const s = seg as any;
            const sx = s.start?.x ?? 0;
            const sy = s.start?.y ?? 0;
            const ex = s.end?.x ?? 0;
            const ey = s.end?.y ?? 0;

            const nearStart: string[] = [];
            const nearEnd: string[] = [];

            for (const pad of pads) {
                if (Math.hypot(pad.x - sx, pad.y - sy) < CONNECT_THRESHOLD) {
                    nearStart.push(pad.id);
                }
                if (Math.hypot(pad.x - ex, pad.y - ey) < CONNECT_THRESHOLD) {
                    nearEnd.push(pad.id);
                }
            }

            // Union pads near start with each other and with pads near end
            const connected = [...nearStart, ...nearEnd];
            for (let i = 1; i < connected.length; i++) {
                uf.union(connected[0]!, connected[i]!);
            }
        }

        // Via connectivity: union pads near via position
        for (const via of board.vias) {
            const viaNet = via.netname;
            if (viaNet !== net) continue;

            const viaPos = via.at?.position;
            if (!viaPos) continue;

            const nearVia: string[] = [];
            for (const pad of pads) {
                if (Math.hypot(pad.x - viaPos.x, pad.y - viaPos.y) < CONNECT_THRESHOLD) {
                    nearVia.push(pad.id);
                }
            }
            for (let i = 1; i < nearVia.length; i++) {
                uf.union(nearVia[0]!, nearVia[i]!);
            }
        }

        // Find disconnected groups
        const groups = new Map<string, typeof pads>();
        for (const pad of pads) {
            const root = uf.find(pad.id);
            const group = groups.get(root) ?? [];
            group.push(pad);
            groups.set(root, group);
        }

        if (groups.size <= 1) continue;

        // Ratsnest: closest pad pair between disconnected groups
        const groupList = Array.from(groups.values());
        for (let i = 0; i < groupList.length - 1; i++) {
            let bestDist = Infinity;
            let bestLine: RatsnestLine | null = null;

            for (let j = i + 1; j < groupList.length; j++) {
                for (const a of groupList[i]!) {
                    for (const b of groupList[j]!) {
                        const dist = Math.hypot(a.x - b.x, a.y - b.y);
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestLine = { x1: a.x, y1: a.y, x2: b.x, y2: b.y, net };
                        }
                    }
                }
            }

            if (bestLine) lines.push(bestLine);
        }
    }

    return lines;
}
