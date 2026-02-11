"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { parsePCBDesign } from "@/lib/pcb-parser";
import type { PCBDesign } from "@/lib/pcb-types";

// KiCanvas uses window/WebGL at module load time — must skip SSR
const KiPCBCanvas = dynamic(() => import("@/components/KiPCBCanvas"), {
    ssr: false,
    loading: () => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#888" }}>
            Loading PCB viewer...
        </div>
    ),
});

// Simple test board: 100x80mm with 2 resistors and an LED
const TEST_DESIGN: PCBDesign = parsePCBDesign({
    version: 2,
    units: "mm",
    boardOutline: {
        vertices: [
            { x: 0, y: 0 },
            { x: 60, y: 0 },
            { x: 60, y: 40 },
            { x: 0, y: 40 },
        ],
    },
    nets: [
        { number: 1, name: "VCC" },
        { number: 2, name: "GND" },
        { number: 3, name: "LED_A" },
    ],
    footprints: [
        {
            uuid: "fp-r1",
            ref: "R1",
            value: "220",
            footprintType: "Axial-0.4in",
            x: 15,
            y: 15,
            rotation: 0,
            layer: "F.Cu",
            pads: [
                {
                    id: "R1:1",
                    shape: "circle",
                    x: 0,
                    y: 0,
                    width: 1.7,
                    height: 1.7,
                    drill: 1.0,
                    layers: ["F.Cu", "B.Cu"],
                    net: "VCC",
                },
                {
                    id: "R1:2",
                    shape: "circle",
                    x: 10.16,
                    y: 0,
                    width: 1.7,
                    height: 1.7,
                    drill: 1.0,
                    layers: ["F.Cu", "B.Cu"],
                    net: "LED_A",
                },
            ],
            silkscreen: {
                layer: "F.SilkS",
                lines: [],
                text: { x: 5, y: -2, value: "R1", size: 1 },
            },
        },
        {
            uuid: "fp-led1",
            ref: "LED1",
            value: "Red",
            footprintType: "LED-THT-3mm",
            x: 35,
            y: 15,
            rotation: 0,
            layer: "F.Cu",
            pads: [
                {
                    id: "LED1:1",
                    shape: "circle",
                    x: 0,
                    y: 0,
                    width: 1.7,
                    height: 1.7,
                    drill: 1.0,
                    layers: ["F.Cu", "B.Cu"],
                    net: "LED_A",
                },
                {
                    id: "LED1:2",
                    shape: "circle",
                    x: 2.54,
                    y: 0,
                    width: 1.7,
                    height: 1.7,
                    drill: 1.0,
                    layers: ["F.Cu", "B.Cu"],
                    net: "GND",
                },
            ],
        },
    ],
    traces: [
        {
            net: "LED_A",
            layer: "F.Cu",
            width: 0.25,
            segments: [
                {
                    uuid: "seg-1",
                    x1: 25.16,
                    y1: 15,
                    x2: 35,
                    y2: 15,
                },
            ],
        },
    ],
    vias: [],
    zones: [],
});

export default function PCBTestPage() {
    const [design] = useState<PCBDesign>(TEST_DESIGN);
    const [selected, setSelected] = useState<unknown>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
            <div
                style={{
                    padding: "8px 16px",
                    background: "#1a1a2e",
                    color: "#e0e0e0",
                    borderBottom: "1px solid #333",
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    fontFamily: "monospace",
                    fontSize: 13,
                }}
            >
                <strong>KiPCB Test</strong>
                <span>
                    Mouse: ({mousePos.x.toFixed(2)}, {mousePos.y.toFixed(2)}) mm
                </span>
                <span>
                    Selected:{" "}
                    {selected
                        ? (selected as any).constructor?.name ?? "unknown"
                        : "none"}
                </span>
            </div>
            <div style={{ flex: 1, position: "relative" }}>
                <KiPCBCanvas
                    design={design}
                    onSelect={setSelected}
                    onMouseMove={(x, y) => setMousePos({ x, y })}
                />
            </div>
        </div>
    );
}
