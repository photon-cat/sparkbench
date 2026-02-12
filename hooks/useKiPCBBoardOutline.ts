/**
 * Hook for editing the board outline (Edge.Cuts polygon).
 *
 * Modes:
 * - Click to place vertices, double-click to close polygon
 * - When editing existing outline: show vertex handles, drag to reshape
 */

import { useRef, useCallback, useEffect } from "react";
import { Vec2 } from "@kicanvas/base/math";
import { Color, Polyline } from "@kicanvas/graphics";
import type { PCBDesign, PCBPoint } from "@/lib/pcb-types";
import { PCBUndoStack, EditBoardOutlineCommand } from "@/lib/pcb-undo";
import type { EditableBoardViewer } from "@/lib/editable-board-viewer";

const GRID_SNAP = 0.5; // mm
const VERTEX_HIT_RADIUS = 1.5; // mm

function snap(v: number): number {
    return Math.round(v / GRID_SNAP) * GRID_SNAP;
}

interface DrawingState {
    vertices: PCBPoint[];
}

interface DragVertexState {
    index: number;
    origVertices: PCBPoint[];
}

export interface UseKiPCBBoardOutlineOptions {
    viewer: EditableBoardViewer | null;
    design: PCBDesign;
    undoStack: PCBUndoStack;
    onDesignChange: (design: PCBDesign) => void;
    canvasElement: HTMLCanvasElement | null;
    active: boolean;
}

export function useKiPCBBoardOutline({
    viewer,
    design,
    undoStack,
    onDesignChange,
    canvasElement,
    active,
}: UseKiPCBBoardOutlineOptions) {
    const drawingRef = useRef<DrawingState | null>(null);
    const dragVertexRef = useRef<DragVertexState | null>(null);

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

    // Draw outline preview
    const drawPreview = useCallback(
        (vertices: PCBPoint[], cursor?: PCBPoint) => {
            if (!viewer) return;
            viewer.paintOverlay((gfx) => {
                const color = Color.from_css("rgb(208, 210, 205)");
                const previewColor = Color.from_css("rgba(208, 210, 205, 0.5)");

                // Draw completed edges
                for (let i = 0; i < vertices.length - 1; i++) {
                    const a = vertices[i]!;
                    const b = vertices[i + 1]!;
                    gfx.line(
                        new Polyline(
                            [new Vec2(a.x, a.y), new Vec2(b.x, b.y)],
                            0.15,
                            color,
                        ),
                    );
                }

                // Draw rubber-band to cursor
                if (cursor && vertices.length > 0) {
                    const last = vertices[vertices.length - 1]!;
                    gfx.line(
                        new Polyline(
                            [new Vec2(last.x, last.y), new Vec2(cursor.x, cursor.y)],
                            0.15,
                            previewColor,
                        ),
                    );
                    // Close to first vertex preview
                    const first = vertices[0]!;
                    gfx.line(
                        new Polyline(
                            [new Vec2(cursor.x, cursor.y), new Vec2(first.x, first.y)],
                            0.1,
                            previewColor,
                        ),
                    );
                }

                // Draw vertex handles
                for (const v of vertices) {
                    const size = 0.5;
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
        [viewer],
    );

    // Find nearest existing vertex
    const findNearVertex = useCallback(
        (pos: PCBPoint): number => {
            const verts = design.boardOutline.vertices;
            for (let i = 0; i < verts.length; i++) {
                const v = verts[i]!;
                const dist = Math.hypot(pos.x - v.x, pos.y - v.y);
                if (dist < VERTEX_HIT_RADIUS) return i;
            }
            return -1;
        },
        [design],
    );

    const onClick = useCallback(
        (e: MouseEvent) => {
            if (!active || !viewer) return;
            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            const drawing = drawingRef.current;

            if (!drawing) {
                // Check if clicking on an existing vertex to start editing
                const vertIdx = findNearVertex(worldPos);
                if (vertIdx >= 0) {
                    // Start vertex drag
                    dragVertexRef.current = {
                        index: vertIdx,
                        origVertices: structuredClone(design.boardOutline.vertices),
                    };
                    return;
                }

                // Start new outline drawing
                drawingRef.current = { vertices: [worldPos] };
                drawPreview([worldPos]);
                return;
            }

            // Add vertex
            drawing.vertices.push(worldPos);
            drawPreview(drawing.vertices);
        },
        [active, viewer, getWorldPos, findNearVertex, drawPreview, design],
    );

    const onDblClick = useCallback(
        (e: MouseEvent) => {
            if (!active) return;
            const drawing = drawingRef.current;
            if (!drawing || drawing.vertices.length < 3) return;

            e.preventDefault();

            // Close polygon and commit
            const cmd = new EditBoardOutlineCommand(
                design.boardOutline.vertices,
                drawing.vertices,
            );
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
            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            // Drawing mode: update rubber-band
            const drawing = drawingRef.current;
            if (drawing) {
                drawPreview(drawing.vertices, worldPos);
                return;
            }

            // Vertex drag mode
            const drag = dragVertexRef.current;
            if (drag) {
                const newVerts = structuredClone(drag.origVertices);
                newVerts[drag.index] = worldPos;
                drawPreview(newVerts);
                return;
            }

            // Not in any mode: highlight nearest vertex
            if (design.boardOutline.vertices.length > 0) {
                drawPreview(design.boardOutline.vertices);
            }
        },
        [active, getWorldPos, drawPreview, design],
    );

    const onMouseUp = useCallback(
        (e: MouseEvent) => {
            const drag = dragVertexRef.current;
            if (!drag) return;
            dragVertexRef.current = null;

            const worldPos = getWorldPos(e);
            if (!worldPos || !viewer) return;

            const newVerts = structuredClone(drag.origVertices);
            newVerts[drag.index] = worldPos;

            const cmd = new EditBoardOutlineCommand(
                drag.origVertices,
                newVerts,
            );
            const newDesign = undoStack.execute(cmd, design);
            onDesignChange(newDesign);
            viewer.clearOverlay();
        },
        [getWorldPos, viewer, design, undoStack, onDesignChange],
    );

    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!active) return;

            // Escape: cancel drawing
            if (e.key === "Escape") {
                if (drawingRef.current) {
                    drawingRef.current = null;
                    viewer?.clearOverlay();
                }
                if (dragVertexRef.current) {
                    dragVertexRef.current = null;
                    viewer?.clearOverlay();
                }
            }
        },
        [active, viewer],
    );

    useEffect(() => {
        if (!canvasElement || !active) return;

        canvasElement.addEventListener("click", onClick);
        canvasElement.addEventListener("dblclick", onDblClick);
        canvasElement.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            canvasElement.removeEventListener("click", onClick);
            canvasElement.removeEventListener("dblclick", onDblClick);
            canvasElement.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("keydown", onKeyDown);
            drawingRef.current = null;
            dragVertexRef.current = null;
        };
    }, [canvasElement, active, onClick, onDblClick, onMouseMove, onMouseUp, onKeyDown]);

    return {
        isDrawing: drawingRef.current !== null,
    };
}
