/**
 * Hook for dragging footprints on the PCB canvas.
 *
 * Handles mousedown → mousemove → mouseup cycle:
 * - Mousedown on a selected footprint starts drag
 * - Mousemove computes world-space delta, paints preview on overlay
 * - Mouseup snaps to grid and commits MoveFootprintCommand
 *
 * Also handles:
 * - R key: rotate 90° CCW
 * - F key: flip F.Cu↔B.Cu
 * - Delete/Backspace: delete selected items
 */

import { useRef, useCallback, useEffect } from "react";
import { Vec2 } from "@kicanvas/base/math";
import { Color, Polyline } from "@kicanvas/graphics";
import type { PCBDesign } from "@/lib/pcb-types";
import {
    PCBUndoStack,
    MoveFootprintCommand,
    RotateFootprintCommand,
    FlipFootprintCommand,
    DeleteItemsCommand,
} from "@/lib/pcb-undo";
import type { EditableBoardViewer } from "@/lib/editable-board-viewer";

const GRID_SNAP = 0.5; // mm

function snapToGrid(v: number, grid: number): number {
    return Math.round(v / grid) * grid;
}

interface DragState {
    ref: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
}

export interface UseKiPCBDragOptions {
    viewer: EditableBoardViewer | null;
    design: PCBDesign;
    undoStack: PCBUndoStack;
    selectedRef: string | null;
    onDesignChange: (design: PCBDesign) => void;
    canvasElement: HTMLCanvasElement | null;
}

export function useKiPCBDrag({
    viewer,
    design,
    undoStack,
    selectedRef,
    onDesignChange,
    canvasElement,
}: UseKiPCBDragOptions) {
    const dragRef = useRef<DragState | null>(null);

    // Mouse → world coordinate conversion
    const getWorldPos = useCallback(
        (e: MouseEvent): { x: number; y: number } | null => {
            if (!viewer || !canvasElement) return null;
            const rect = canvasElement.getBoundingClientRect();
            const screenPos = new Vec2(
                e.clientX - rect.left,
                e.clientY - rect.top,
            );
            // Use the viewer's camera to convert screen → world
            const worldPos = viewer.viewport.camera.screen_to_world(screenPos);
            return { x: worldPos.x, y: worldPos.y };
        },
        [viewer, canvasElement],
    );

    // Start drag
    const onMouseDown = useCallback(
        (e: MouseEvent) => {
            if (!selectedRef || !viewer || e.button !== 0) return;

            const fp = design.footprints.find((f) => f.ref === selectedRef);
            if (!fp) return;

            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            dragRef.current = {
                ref: selectedRef,
                startX: worldPos.x,
                startY: worldPos.y,
                origX: fp.x,
                origY: fp.y,
            };
        },
        [selectedRef, viewer, design, getWorldPos],
    );

    // Drag in progress
    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            const drag = dragRef.current;
            if (!drag || !viewer) return;

            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            const dx = worldPos.x - drag.startX;
            const dy = worldPos.y - drag.startY;

            const previewX = snapToGrid(drag.origX + dx, GRID_SNAP);
            const previewY = snapToGrid(drag.origY + dy, GRID_SNAP);

            // Draw drag preview crosshair on overlay
            viewer.paintOverlay((gfx) => {
                const size = 2;
                const color = Color.white;
                gfx.line(
                    new Polyline(
                        [
                            new Vec2(previewX - size, previewY),
                            new Vec2(previewX + size, previewY),
                        ],
                        0.2,
                        color,
                    ),
                );
                gfx.line(
                    new Polyline(
                        [
                            new Vec2(previewX, previewY - size),
                            new Vec2(previewX, previewY + size),
                        ],
                        0.2,
                        color,
                    ),
                );
            });
        },
        [viewer, getWorldPos],
    );

    // End drag
    const onMouseUp = useCallback(
        (e: MouseEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            dragRef.current = null;

            if (!viewer) return;
            viewer.clearOverlay();

            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            const dx = worldPos.x - drag.startX;
            const dy = worldPos.y - drag.startY;
            const toX = snapToGrid(drag.origX + dx, GRID_SNAP);
            const toY = snapToGrid(drag.origY + dy, GRID_SNAP);

            // Only commit if actually moved
            if (toX === drag.origX && toY === drag.origY) return;

            const cmd = new MoveFootprintCommand(
                drag.ref,
                drag.origX,
                drag.origY,
                toX,
                toY,
            );
            const newDesign = undoStack.execute(cmd, design);
            onDesignChange(newDesign);
        },
        [viewer, design, undoStack, onDesignChange, getWorldPos],
    );

    // Keyboard shortcuts
    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!selectedRef) return;

            // R: Rotate 90° CCW
            if (e.key === "r" || e.key === "R") {
                e.preventDefault();
                const cmd = new RotateFootprintCommand(selectedRef, 90);
                const newDesign = undoStack.execute(cmd, design);
                onDesignChange(newDesign);
                return;
            }

            // F: Flip
            if (e.key === "f" || e.key === "F") {
                e.preventDefault();
                const cmd = new FlipFootprintCommand(selectedRef);
                const newDesign = undoStack.execute(cmd, design);
                onDesignChange(newDesign);
                return;
            }

            // Delete/Backspace: Delete selected
            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                const fp = design.footprints.find(
                    (f) => f.ref === selectedRef,
                );
                if (fp) {
                    const cmd = new DeleteItemsCommand(new Set([fp.uuid]));
                    const newDesign = undoStack.execute(cmd, design);
                    onDesignChange(newDesign);
                }
                return;
            }

            // Ctrl+Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                const result = undoStack.undo(design);
                if (result) onDesignChange(result);
                return;
            }

            // Ctrl+Shift+Z or Ctrl+Y: Redo
            if (
                ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) ||
                ((e.ctrlKey || e.metaKey) && e.key === "y")
            ) {
                e.preventDefault();
                const result = undoStack.redo(design);
                if (result) onDesignChange(result);
                return;
            }
        },
        [selectedRef, design, undoStack, onDesignChange],
    );

    // Attach/detach event listeners
    useEffect(() => {
        if (!canvasElement) return;

        canvasElement.addEventListener("mousedown", onMouseDown);
        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            canvasElement.removeEventListener("mousedown", onMouseDown);
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [canvasElement, onMouseDown, onMouseMove, onMouseUp, onKeyDown]);

    return {
        isDragging: dragRef.current !== null,
    };
}
