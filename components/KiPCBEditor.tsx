"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { List } from "@kicanvas/kicad/tokenizer";
import { listify } from "@kicanvas/kicad/tokenizer";
import { findChildren } from "@/lib/sexpr-mutate";
import { SExprUndoStack } from "@/lib/sexpr-undo";
import { serializeSExpr } from "@/lib/sexpr-serializer";
import { useKiPCBDrag } from "@/hooks/useKiPCBDrag";
import type { KiPCBCanvasHandle } from "./KiPCBCanvas";
import KiPCBToolPalette, { type PCBTool } from "./KiPCBToolPalette";
import KiPCBLayerPanel from "./KiPCBLayerPanel";
import type { CopperLayerId } from "@/lib/pcb-types";

// Dynamic import for the WebGL canvas (no SSR)
const KiPCBCanvas = dynamic(() => import("./KiPCBCanvas"), {
    ssr: false,
    loading: () => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#888",
                fontFamily: "monospace",
            }}
        >
            Loading PCB viewer...
        </div>
    ),
});

interface KiPCBEditorProps {
    initialPcbText: string;
    onSave?: (text: string) => void;
}

export default function KiPCBEditor({
    initialPcbText,
    onSave,
}: KiPCBEditorProps) {
    // Parse initial text into S-expr tree
    // listify() returns a wrapper [root_expr] — unwrap to get the kicad_pcb expression
    const [pcbTree, setPcbTree] = useState<List>(() => listify(initialPcbText)[0] as List);
    const [activeTool, setActiveTool] = useState<PCBTool>("select");
    const [activeLayer, setActiveLayer] = useState<CopperLayerId>("F.Cu");
    const [selectedItem, setSelectedItem] = useState<unknown>(null);
    const [selectedRef, setSelectedRef] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [layerVisibility, setLayerVisibility] = useState<
        Record<CopperLayerId, boolean>
    >({
        "F.Cu": true,
        "B.Cu": true,
    });

    const canvasHandleRef = useRef<KiPCBCanvasHandle>(null);
    const undoStackRef = useRef(new SExprUndoStack());

    // Extract selected footprint reference from KiCanvas selection
    const handleSelect = useCallback((item: unknown) => {
        setSelectedItem(item);
        // KiCanvas Footprint has a .reference property
        const any = item as any;
        if (any?.reference) {
            setSelectedRef(any.reference);
        } else if (any?.parent?.reference) {
            // Pad selected — use parent footprint's ref
            setSelectedRef(any.parent.reference);
        } else {
            setSelectedRef(null);
        }
    }, []);

    // Handle tree changes from editing hooks
    const handleTreeChange = useCallback((newTree: List) => {
        setPcbTree(newTree);
    }, []);

    // Wire up drag hook
    useKiPCBDrag({
        viewer: canvasHandleRef.current?.viewer ?? null,
        pcbTree,
        undoStack: undoStackRef.current,
        selectedRef,
        onTreeChange: handleTreeChange,
        canvasElement: canvasHandleRef.current?.canvas ?? null,
    });

    // Board stats from tree
    const footprintCount = findChildren(pcbTree, "footprint").length;
    const segmentCount = findChildren(pcbTree, "segment").length;
    const viaCount = findChildren(pcbTree, "via").length;
    const netCount = findChildren(pcbTree, "net").length;

    // Keyboard shortcuts for tool switching + save
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case "s":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("select");
                    break;
                case "x":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("route");
                    break;
                case "z":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("zone");
                    break;
                case "o":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("outline");
                    break;
                case "m":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("measure");
                    break;
            }

            // Ctrl+S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                onSave?.(serializeSExpr(pcbTree));
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [pcbTree, onSave]);

    return (
        <div
            style={{
                display: "flex",
                height: "100%",
                background: "#0a0a1e",
            }}
        >
            {/* Tool palette */}
            <KiPCBToolPalette
                activeTool={activeTool}
                onToolChange={setActiveTool}
            />

            {/* Main canvas area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Status bar */}
                <div
                    style={{
                        padding: "4px 12px",
                        background: "#1a1a2e",
                        borderBottom: "1px solid #333",
                        display: "flex",
                        gap: 16,
                        alignItems: "center",
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "#aaa",
                    }}
                >
                    <span>
                        Tool:{" "}
                        <strong style={{ color: "#fff" }}>{activeTool}</strong>
                    </span>
                    <span>
                        Layer:{" "}
                        <strong
                            style={{
                                color:
                                    activeLayer === "F.Cu"
                                        ? "#c83434"
                                        : "#4d7fc4",
                            }}
                        >
                            {activeLayer}
                        </strong>
                    </span>
                    <span>
                        ({mousePos.x.toFixed(2)}, {mousePos.y.toFixed(2)}) mm
                    </span>
                    {selectedRef && (
                        <span style={{ color: "#aaf" }}>
                            Selected: {selectedRef}
                        </span>
                    )}
                    <span style={{ marginLeft: "auto" }}>
                        {footprintCount} fp, {segmentCount} seg, {viaCount} via, {netCount} net
                    </span>
                    {undoStackRef.current.canUndo && (
                        <span style={{ color: "#888" }}>
                            Undo available
                        </span>
                    )}
                </div>

                {/* Canvas */}
                <div style={{ flex: 1, position: "relative" }}>
                    <KiPCBCanvas
                        ref={canvasHandleRef}
                        pcbTree={pcbTree}
                        onSelect={handleSelect}
                        onMouseMove={(x, y) => setMousePos({ x, y })}
                    />
                </div>
            </div>

            {/* Right panel: layers + properties */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: 220,
                }}
            >
                <KiPCBLayerPanel
                    activeLayer={activeLayer}
                    onLayerChange={setActiveLayer}
                    layerVisibility={layerVisibility}
                    onToggleVisibility={(layer) =>
                        setLayerVisibility((prev) => ({
                            ...prev,
                            [layer]: !prev[layer],
                        }))
                    }
                />
                <div
                    style={{
                        flex: 1,
                        overflow: "auto",
                        padding: "8px",
                        background: "#1a1a2e",
                        borderLeft: "1px solid #333",
                        fontSize: 12,
                        fontFamily: "monospace",
                        color: "#ccc",
                    }}
                >
                    {/* Cursor position */}
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ color: "#888", fontSize: 10 }}>Position</div>
                        <div>X: {mousePos.x.toFixed(2)} mm</div>
                        <div>Y: {mousePos.y.toFixed(2)} mm</div>
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
                    <div>
                        <div style={{ color: "#888", fontSize: 10, marginBottom: 2 }}>
                            Board
                        </div>
                        <div>Footprints: {footprintCount}</div>
                        <div>Segments: {segmentCount}</div>
                        <div>Vias: {viaCount}</div>
                        <div>Nets: {netCount}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SelectedItemInfo({ item }: { item: unknown }) {
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
