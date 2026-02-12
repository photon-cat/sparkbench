"use client";

import type { CopperLayerId } from "@/lib/pcb-types";

interface KiPCBLayerPanelProps {
    activeLayer: CopperLayerId;
    onLayerChange: (layer: CopperLayerId) => void;
    layerVisibility: Record<CopperLayerId, boolean>;
    onToggleVisibility: (layer: CopperLayerId) => void;
}

const LAYERS: { id: CopperLayerId; label: string; color: string }[] = [
    { id: "F.Cu", label: "F.Cu", color: "#c83434" },
    { id: "B.Cu", label: "B.Cu", color: "#4d7fc4" },
];

export default function KiPCBLayerPanel({
    activeLayer,
    onLayerChange,
    layerVisibility,
    onToggleVisibility,
}: KiPCBLayerPanelProps) {
    return (
        <div
            style={{
                padding: "8px",
                background: "#1a1a2e",
                borderLeft: "1px solid #333",
                minWidth: 120,
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    color: "#888",
                    marginBottom: 6,
                    fontFamily: "monospace",
                }}
            >
                Layers
            </div>
            {LAYERS.map((layer) => (
                <div
                    key={layer.id}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "3px 4px",
                        background:
                            activeLayer === layer.id
                                ? "#2a2a4e"
                                : "transparent",
                        borderRadius: 3,
                        cursor: "pointer",
                    }}
                    onClick={() => onLayerChange(layer.id)}
                >
                    <input
                        type="checkbox"
                        checked={layerVisibility[layer.id] ?? true}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleVisibility(layer.id);
                        }}
                        style={{ margin: 0 }}
                    />
                    <span
                        style={{
                            width: 12,
                            height: 12,
                            background: layer.color,
                            borderRadius: 2,
                            display: "inline-block",
                        }}
                    />
                    <span
                        style={{
                            fontSize: 12,
                            fontFamily: "monospace",
                            color:
                                activeLayer === layer.id ? "#fff" : "#ccc",
                        }}
                    >
                        {layer.label}
                    </span>
                </div>
            ))}
        </div>
    );
}
