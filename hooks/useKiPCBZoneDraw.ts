/**
 * Hook for drawing copper pour zone boundaries.
 *
 * Click vertices to define zone boundary polygon, double-click to close.
 * Net assignment is determined by the first clicked pad, or can be
 * set externally.
 */

import { useRef, useCallback, useEffect } from "react";
import { Vec2 } from "@kicanvas/base/math";
import { Color, Polyline, Polygon } from "@kicanvas/graphics";
import type { PCBDesign, PCBZone, PCBPoint, CopperLayerId } from "@/lib/pcb-types";
import { generateUUID } from "@/lib/pcb-types";
import { PCBUndoStack, AddZoneCommand } from "@/lib/pcb-undo";
import type { EditableBoardViewer } from "@/lib/editable-board-viewer";

const GRID_SNAP = 0.5; // mm

function snap(v: number): number {
    return Math.round(v / GRID_SNAP) * GRID_SNAP;
}

interface ZoneDrawingState {
    net: string;
    layer: CopperLayerId;
    vertices: PCBPoint[];
}

export interface UseKiPCBZoneDrawOptions {
    viewer: EditableBoardViewer | null;
    design: PCBDesign;
    undoStack: PCBUndoStack;
    activeLayer: CopperLayerId;
    zoneNet: string | null;
    onDesignChange: (design: PCBDesign) => void;
    canvasElement: HTMLCanvasElement | null;
    active: boolean;
}

export function useKiPCBZoneDraw({
    viewer,
    design,
    undoStack,
    activeLayer,
    zoneNet,
    onDesignChange,
    canvasElement,
    active,
}: UseKiPCBZoneDrawOptions) {
    const drawingRef = useRef<ZoneDrawingState | null>(null);

    const getWorldPos = useCallback(
        (e: MouseEvent): PCBPoint | null => {
            if (!viewer || !canvasElement) return null;
            const rect = canvasElement.getBoundingClientRect();
            const screenPos = new Vec2(
                e.clientX - rect.left,
                e.clientY - rect.top,
            );
            const worldPos = viewer.viewport.camera.screen_to_world(screenPos);
            return { x: snap(worldPos.x), y: snap(worldPos.y) };
        },
        [viewer, canvasElement],
    );

    const drawPreview = useCallback(
        (vertices: PCBPoint[], cursor?: PCBPoint, layer?: CopperLayerId) => {
            if (!viewer) return;
            viewer.paintOverlay((gfx) => {
                const layerColor = (layer ?? activeLayer) === "F.Cu"
                    ? Color.from_css("rgba(200, 52, 52, 0.3)")
                    : Color.from_css("rgba(77, 127, 196, 0.3)");
                const edgeColor = (layer ?? activeLayer) === "F.Cu"
                    ? Color.from_css("rgb(200, 52, 52)")
                    : Color.from_css("rgb(77, 127, 196)");

                // Draw filled polygon preview
                if (vertices.length >= 3) {
                    const pts = vertices.map((v) => new Vec2(v.x, v.y));
                    if (cursor) pts.push(new Vec2(cursor.x, cursor.y));
                    gfx.polygon(new Polygon(pts, layerColor));
                }

                // Draw edges
                const allPts = [...vertices];
                if (cursor) allPts.push(cursor);
                for (let i = 0; i < allPts.length; i++) {
                    const a = allPts[i]!;
                    const b = allPts[(i + 1) % allPts.length]!;
                    gfx.line(
                        new Polyline(
                            [new Vec2(a.x, a.y), new Vec2(b.x, b.y)],
                            0.15,
                            edgeColor,
                        ),
                    );
                }

                // Draw vertex handles
                for (const v of vertices) {
                    const size = 0.4;
                    gfx.line(
                        new Polyline(
                            [
                                new Vec2(v.x - size, v.y - size),
                                new Vec2(v.x + size, v.y - size),
                                new Vec2(v.x + size, v.y + size),
                                new Vec2(v.x - size, v.y + size),
                                new Vec2(v.x - size, v.y - size),
                            ],
                            0.1,
                            Color.white,
                        ),
                    );
                }
            });
        },
        [viewer, activeLayer],
    );

    const onClick = useCallback(
        (e: MouseEvent) => {
            if (!active || !viewer) return;
            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            const drawing = drawingRef.current;

            if (!drawing) {
                // Start zone drawing
                const net = zoneNet ?? "GND"; // Default to GND if no net specified
                drawingRef.current = {
                    net,
                    layer: activeLayer,
                    vertices: [worldPos],
                };
                drawPreview([worldPos]);
                return;
            }

            // Add vertex
            drawing.vertices.push(worldPos);
            drawPreview(drawing.vertices, undefined, drawing.layer);
        },
        [active, viewer, getWorldPos, zoneNet, activeLayer, drawPreview],
    );

    const onDblClick = useCallback(
        (e: MouseEvent) => {
            if (!active) return;
            const drawing = drawingRef.current;
            if (!drawing || drawing.vertices.length < 3) return;

            e.preventDefault();

            // Create zone and commit
            const zone: PCBZone = {
                uuid: generateUUID(),
                net: drawing.net,
                layer: drawing.layer,
                boundary: drawing.vertices,
                priority: 0,
                fill: {
                    thermalGap: 0.5,
                    thermalBridgeWidth: 0.5,
                },
            };

            const cmd = new AddZoneCommand(zone);
            const newDesign = undoStack.execute(cmd, design);
            onDesignChange(newDesign);

            drawingRef.current = null;
            viewer?.clearOverlay();
        },
        [active, design, undoStack, onDesignChange, viewer],
    );

    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!active) return;
            const drawing = drawingRef.current;
            if (!drawing) return;

            const worldPos = getWorldPos(e);
            if (worldPos) {
                drawPreview(drawing.vertices, worldPos, drawing.layer);
            }
        },
        [active, getWorldPos, drawPreview],
    );

    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!active) return;

            if (e.key === "Escape" && drawingRef.current) {
                drawingRef.current = null;
                viewer?.clearOverlay();
            }
        },
        [active, viewer],
    );

    useEffect(() => {
        if (!canvasElement || !active) return;

        canvasElement.addEventListener("click", onClick);
        canvasElement.addEventListener("dblclick", onDblClick);
        canvasElement.addEventListener("mousemove", onMouseMove);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            canvasElement.removeEventListener("click", onClick);
            canvasElement.removeEventListener("dblclick", onDblClick);
            canvasElement.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("keydown", onKeyDown);
            drawingRef.current = null;
        };
    }, [canvasElement, active, onClick, onDblClick, onMouseMove, onKeyDown]);

    return {
        isDrawing: drawingRef.current !== null,
    };
}
