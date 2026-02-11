"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { PCBDesign, CopperLayerId } from "@/lib/pcb-types";
import { PCBUndoStack } from "@/lib/pcb-undo";
import { runDRC, type DRCViolation } from "@/lib/pcb-drc";
import { computeRatsnest, type RatsnestLine } from "@/lib/ratsnest";
import KiPCBToolPalette, { type PCBTool } from "./KiPCBToolPalette";
import KiPCBLayerPanel from "./KiPCBLayerPanel";
import KiPCBPropertiesPanel from "./KiPCBPropertiesPanel";

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
    initialDesign: PCBDesign;
    onSave?: (design: PCBDesign) => void;
}

export default function KiPCBEditor({
    initialDesign,
    onSave,
}: KiPCBEditorProps) {
    const [design, setDesign] = useState<PCBDesign>(initialDesign);
    const [activeTool, setActiveTool] = useState<PCBTool>("select");
    const [activeLayer, setActiveLayer] = useState<CopperLayerId>("F.Cu");
    const [selectedItem, setSelectedItem] = useState<unknown>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [layerVisibility, setLayerVisibility] = useState<
        Record<CopperLayerId, boolean>
    >({
        "F.Cu": true,
        "B.Cu": true,
    });

    const undoStackRef = useRef(new PCBUndoStack());

    // Run DRC on design changes (debounced)
    const [drcViolations, setDrcViolations] = useState<DRCViolation[]>([]);
    useEffect(() => {
        const timer = setTimeout(() => {
            setDrcViolations(runDRC(design));
        }, 200);
        return () => clearTimeout(timer);
    }, [design]);

    // Compute ratsnest
    const ratsnest = useMemo(() => computeRatsnest(design), [design]);

    // Handle design changes from editing hooks
    const handleDesignChange = useCallback(
        (newDesign: PCBDesign) => {
            setDesign(newDesign);
        },
        [],
    );

    // Keyboard shortcuts for tool switching
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't intercept if in an input
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
                    setActiveTool("route");
                    break;
                case "z":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("zone");
                    break;
                case "o":
                    setActiveTool("outline");
                    break;
                case "m":
                    setActiveTool("measure");
                    break;
            }

            // Ctrl+S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                onSave?.(design);
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [design, onSave]);

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
                    {undoStackRef.current.canUndo && (
                        <span style={{ color: "#888" }}>
                            Undo: {undoStackRef.current.undoDescription}
                        </span>
                    )}
                    <span style={{ marginLeft: "auto" }}>
                        Ratsnest: {ratsnest.length} lines
                    </span>
                    <span
                        style={{
                            color:
                                drcViolations.length > 0
                                    ? "#d75b6b"
                                    : "#4a4",
                        }}
                    >
                        DRC:{" "}
                        {drcViolations.length === 0
                            ? "OK"
                            : `${drcViolations.length} issues`}
                    </span>
                </div>

                {/* Canvas */}
                <div style={{ flex: 1, position: "relative" }}>
                    <KiPCBCanvas
                        design={design}
                        onDesignChange={handleDesignChange}
                        activeTool={activeTool}
                        activeLayer={activeLayer}
                        onSelect={setSelectedItem}
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
                <div style={{ flex: 1, overflow: "auto" }}>
                    <KiPCBPropertiesPanel
                        selectedItem={selectedItem}
                        design={design}
                        drcViolations={drcViolations}
                        mouseX={mousePos.x}
                        mouseY={mousePos.y}
                    />
                </div>
            </div>
        </div>
    );
}
