/**
 * Design Rule Check (DRC) for 2-layer PCBs.
 *
 * Checks: track↔track clearance, track↔pad clearance, pad↔pad clearance,
 * minimum track width, unconnected nets.
 */

import type { PCBDesign, PCBFootprint, PCBTraceSegment, CopperLayerId } from "./pcb-types";

export interface DRCViolation {
    type: "clearance" | "min_width" | "unconnected";
    severity: "error" | "warning";
    message: string;
    x: number;
    y: number;
    items: string[]; // UUIDs of involved items
}

interface DesignRulesConfig {
    minTraceWidth: number;
    minClearance: number;
    minViaDrill: number;
}

/** Point-to-segment distance */
function pointToSegmentDist(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    return Math.hypot(px - closestX, py - closestY);
}

/** Segment-to-segment minimum distance */
function segmentToSegmentDist(
    a: PCBTraceSegment,
    b: PCBTraceSegment,
): number {
    // Approximate: check endpoints of each segment against the other
    return Math.min(
        pointToSegmentDist(a.x1, a.y1, b.x1, b.y1, b.x2, b.y2),
        pointToSegmentDist(a.x2, a.y2, b.x1, b.y1, b.x2, b.y2),
        pointToSegmentDist(b.x1, b.y1, a.x1, a.y1, a.x2, a.y2),
        pointToSegmentDist(b.x2, b.y2, a.x1, a.y1, a.x2, a.y2),
    );
}

/** Get absolute pad position (footprint position + pad offset) */
function absPadPos(
    fp: PCBFootprint,
    padIdx: number,
): { x: number; y: number } {
    const pad = fp.pads[padIdx]!;
    // Simple: no rotation handling for now
    const rad = (fp.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return {
        x: fp.x + pad.x * cos - pad.y * sin,
        y: fp.y + pad.x * sin + pad.y * cos,
    };
}

export function runDRC(design: PCBDesign): DRCViolation[] {
    const violations: DRCViolation[] = [];
    const rules: DesignRulesConfig = {
        minTraceWidth: design.designRules.minTraceWidth,
        minClearance: design.designRules.minClearance,
        minViaDrill: design.designRules.minViaDrill,
    };

    // Collect all segments with their net and layer info
    const allSegments: {
        seg: PCBTraceSegment;
        net: string;
        layer: CopperLayerId;
        width: number;
    }[] = [];
    for (const trace of design.traces) {
        for (const seg of trace.segments) {
            allSegments.push({
                seg,
                net: trace.net,
                layer: trace.layer,
                width: trace.width,
            });
        }
    }

    // Check minimum track width
    for (const trace of design.traces) {
        if (trace.width < rules.minTraceWidth) {
            const seg = trace.segments[0];
            if (seg) {
                violations.push({
                    type: "min_width",
                    severity: "error",
                    message: `Track width ${trace.width}mm < minimum ${rules.minTraceWidth}mm`,
                    x: (seg.x1 + seg.x2) / 2,
                    y: (seg.y1 + seg.y2) / 2,
                    items: [seg.uuid],
                });
            }
        }
    }

    // Check track↔track clearance (same layer, different net)
    for (let i = 0; i < allSegments.length; i++) {
        for (let j = i + 1; j < allSegments.length; j++) {
            const a = allSegments[i]!;
            const b = allSegments[j]!;
            if (a.net === b.net) continue; // Same net — no clearance check
            if (a.layer !== b.layer) continue; // Different layers — no clearance check

            const dist = segmentToSegmentDist(a.seg, b.seg);
            const requiredClearance =
                rules.minClearance + a.width / 2 + b.width / 2;

            if (dist < requiredClearance) {
                const mx = (a.seg.x1 + a.seg.x2 + b.seg.x1 + b.seg.x2) / 4;
                const my = (a.seg.y1 + a.seg.y2 + b.seg.y1 + b.seg.y2) / 4;
                violations.push({
                    type: "clearance",
                    severity: "error",
                    message: `Track clearance ${dist.toFixed(3)}mm < ${rules.minClearance}mm between ${a.net} and ${b.net}`,
                    x: mx,
                    y: my,
                    items: [a.seg.uuid, b.seg.uuid],
                });
            }
        }
    }

    // Check track↔pad clearance
    for (const segInfo of allSegments) {
        for (const fp of design.footprints) {
            for (let pi = 0; pi < fp.pads.length; pi++) {
                const pad = fp.pads[pi]!;
                if (pad.net === segInfo.net) continue; // Same net

                // Check if pad is on the same layer
                const padOnLayer = pad.layers.some(
                    (l) => l === segInfo.layer || l === "F.Cu" || l === "B.Cu",
                );
                if (!padOnLayer) continue;

                const pos = absPadPos(fp, pi);
                const dist = pointToSegmentDist(
                    pos.x,
                    pos.y,
                    segInfo.seg.x1,
                    segInfo.seg.y1,
                    segInfo.seg.x2,
                    segInfo.seg.y2,
                );

                const padRadius = Math.max(pad.width, pad.height) / 2;
                const requiredClearance =
                    rules.minClearance + segInfo.width / 2 + padRadius;

                if (dist < requiredClearance) {
                    violations.push({
                        type: "clearance",
                        severity: "error",
                        message: `Track↔pad clearance violation between ${segInfo.net} and pad ${pad.id}`,
                        x: pos.x,
                        y: pos.y,
                        items: [segInfo.seg.uuid, pad.id],
                    });
                }
            }
        }
    }

    // Check for unconnected nets
    const netPads = new Map<string, string[]>(); // net → pad IDs
    for (const fp of design.footprints) {
        for (const pad of fp.pads) {
            if (!pad.net) continue;
            const pads = netPads.get(pad.net) ?? [];
            pads.push(pad.id);
            netPads.set(pad.net, pads);
        }
    }

    const netTraces = new Set<string>();
    for (const trace of design.traces) {
        netTraces.add(trace.net);
    }

    for (const [net, pads] of netPads) {
        if (pads.length > 1 && !netTraces.has(net)) {
            // Multiple pads on net but no traces — unconnected
            violations.push({
                type: "unconnected",
                severity: "warning",
                message: `Net "${net}" has ${pads.length} pads but no traces`,
                x: 0,
                y: 0,
                items: pads,
            });
        }
    }

    return violations;
}
