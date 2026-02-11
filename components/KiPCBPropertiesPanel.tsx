"use client";

import type { PCBDesign } from "@/lib/pcb-types";
import type { DRCViolation } from "@/lib/pcb-drc";

interface KiPCBPropertiesPanelProps {
    selectedItem: unknown;
    design: PCBDesign;
    drcViolations: DRCViolation[];
    mouseX: number;
    mouseY: number;
}

export default function KiPCBPropertiesPanel({
    selectedItem,
    design,
    drcViolations,
    mouseX,
    mouseY,
}: KiPCBPropertiesPanelProps) {
    return (
        <div
            style={{
                padding: "8px",
                background: "#1a1a2e",
                borderLeft: "1px solid #333",
                minWidth: 200,
                fontSize: 12,
                fontFamily: "monospace",
                color: "#ccc",
                overflow: "auto",
            }}
        >
            {/* Cursor position */}
            <div style={{ marginBottom: 8 }}>
                <div style={{ color: "#888", fontSize: 10 }}>Position</div>
                <div>
                    X: {mouseX.toFixed(2)} mm
                </div>
                <div>
                    Y: {mouseY.toFixed(2)} mm
                </div>
            </div>

            {/* Selection info */}
            <div style={{ marginBottom: 8 }}>
                <div style={{ color: "#888", fontSize: 10, marginBottom: 2 }}>
                    Selection
                </div>
                {selectedItem ? (
                    <SelectedItemInfo item={selectedItem} />
                ) : (
                    <div style={{ color: "#666" }}>None</div>
                )}
            </div>

            {/* Board info */}
            <div style={{ marginBottom: 8 }}>
                <div style={{ color: "#888", fontSize: 10, marginBottom: 2 }}>
                    Board
                </div>
                <div>
                    Footprints: {design.footprints.length}
                </div>
                <div>
                    Traces: {design.traces.length}
                </div>
                <div>
                    Vias: {design.vias.length}
                </div>
                <div>
                    Nets: {design.nets.length}
                </div>
            </div>

            {/* DRC */}
            <div>
                <div style={{ color: "#888", fontSize: 10, marginBottom: 2 }}>
                    DRC ({drcViolations.length})
                </div>
                {drcViolations.length === 0 ? (
                    <div style={{ color: "#4a4" }}>No violations</div>
                ) : (
                    drcViolations.slice(0, 10).map((v, i) => (
                        <div
                            key={i}
                            style={{
                                padding: "2px 0",
                                color:
                                    v.severity === "error"
                                        ? "#d75b6b"
                                        : "#d0a030",
                                fontSize: 11,
                            }}
                        >
                            {v.message}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function SelectedItemInfo({ item }: { item: unknown }) {
    // The item is a KiCanvas board item — extract useful info
    const any = item as any;
    const type = any?.constructor?.name ?? "Unknown";

    return (
        <div>
            <div style={{ color: "#aaf" }}>{type}</div>
            {any?.reference && <div>Ref: {any.reference}</div>}
            {any?.value && <div>Value: {any.value}</div>}
            {any?.netname && <div>Net: {any.netname}</div>}
            {any?.at?.position && (
                <div>
                    Pos: ({any.at.position.x.toFixed(2)},{" "}
                    {any.at.position.y.toFixed(2)})
                </div>
            )}
            {any?.number !== undefined && <div>Pad: {any.number}</div>}
            {any?.width !== undefined && <div>Width: {any.width}mm</div>}
            {any?.layer && <div>Layer: {any.layer}</div>}
        </div>
    );
}
