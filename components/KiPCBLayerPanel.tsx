"use client";

import { useState, useCallback } from "react";
import type { EditableBoardViewer } from "@/lib/editable-board-viewer";
import type { LayerSet } from "@kicanvas/viewers/board/layers";

interface KiPCBLayerPanelProps {
    viewer: EditableBoardViewer | null;
    activeLayer: string;
    onLayerChange: (layer: string) => void;
}

interface LayerInfo {
    name: string;
    cssColor: string;
    visible: boolean;
}

function getLayersFromViewer(viewer: EditableBoardViewer): LayerInfo[] {
    const layerSet = viewer.layers as LayerSet;
    const result: LayerInfo[] = [];
    for (const layer of layerSet.in_ui_order()) {
        result.push({
            name: layer.name,
            cssColor: layer.color.to_css(),
            visible: layer.visible,
        });
    }
    return result;
}

export default function KiPCBLayerPanel({
    viewer,
    activeLayer,
    onLayerChange,
}: KiPCBLayerPanelProps) {
    // Force re-render when visibility toggles
    const [, setTick] = useState(0);

    const layers = viewer ? getLayersFromViewer(viewer) : [];

    const handleToggleVisibility = useCallback(
        (layerName: string) => {
            if (!viewer) return;
            const layerSet = viewer.layers as LayerSet;
            const layer = layerSet.by_name(layerName);
            if (layer) {
                layer.visible = !layer.visible;
                viewer.draw();
                setTick((t) => t + 1);
            }
        },
        [viewer],
    );

    const handleHighlight = useCallback(
        (layerName: string) => {
            if (!viewer) return;
            const layerSet = viewer.layers as LayerSet;
            layerSet.highlight(layerName);
            viewer.draw();
            onLayerChange(layerName);
        },
        [viewer, onLayerChange],
    );

    const handleClearHighlight = useCallback(() => {
        if (!viewer) return;
        const layerSet = viewer.layers as LayerSet;
        layerSet.highlight(null);
        viewer.draw();
    }, [viewer]);

    return (
        <div
            style={{
                padding: "4px 0",
                background: "#1a1a2e",
                borderLeft: "1px solid #333",
                minWidth: 160,
                overflowY: "auto",
                maxHeight: "100%",
            }}
        >
            <div
                style={{
                    fontSize: 11,
                    color: "#888",
                    marginBottom: 4,
                    padding: "0 8px",
                    fontFamily: "monospace",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <span>Layers ({layers.length})</span>
                {activeLayer && (
                    <button
                        onClick={handleClearHighlight}
                        style={{
                            background: "none",
                            border: "none",
                            color: "#666",
                            cursor: "pointer",
                            fontSize: 10,
                            fontFamily: "monospace",
                            padding: "0 2px",
                        }}
                        title="Clear highlight"
                    >
                        clear
                    </button>
                )}
            </div>
            {layers.length === 0 ? (
                <div
                    style={{
                        padding: "8px",
                        color: "#555",
                        fontSize: 11,
                        fontFamily: "monospace",
                    }}
                >
                    Loading...
                </div>
            ) : (
                layers.map((layer) => (
                    <div
                        key={layer.name}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "2px 8px",
                            background:
                                activeLayer === layer.name
                                    ? "#2a2a4e"
                                    : "transparent",
                            cursor: "pointer",
                            fontSize: 11,
                            fontFamily: "monospace",
                        }}
                        onClick={() => handleHighlight(layer.name)}
                    >
                        <input
                            type="checkbox"
                            checked={layer.visible}
                            onChange={(e) => {
                                e.stopPropagation();
                                handleToggleVisibility(layer.name);
                            }}
                            style={{ margin: 0, width: 13, height: 13 }}
                        />
                        <span
                            style={{
                                width: 10,
                                height: 10,
                                background: layer.cssColor,
                                borderRadius: 2,
                                display: "inline-block",
                                flexShrink: 0,
                            }}
                        />
                        <span
                            style={{
                                color:
                                    activeLayer === layer.name
                                        ? "#fff"
                                        : layer.visible
                                          ? "#ccc"
                                          : "#666",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {layer.name}
                        </span>
                    </div>
                ))
            )}
        </div>
    );
}
