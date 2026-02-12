/**
 * Hook for dragging footprints on the PCB canvas.
 *
 * Operates on S-expression trees (List) rather than PCBDesign.
 *
 * Handles mousedown → mousemove → mouseup cycle:
 * - Mousedown on a selected footprint starts drag
 * - Mousemove computes world-space delta, paints preview on overlay
 * - Mouseup snaps to grid and commits move via tree mutation
 *
 * Also handles:
 * - R key: rotate 90° CCW
 * - F key: flip F.Cu↔B.Cu
 * - Delete/Backspace: delete selected footprint
 * - Ctrl+Z / Ctrl+Shift+Z: undo/redo
 */

import { useRef, useCallback, useEffect } from "react";
import { Vec2 } from "@kicanvas/base/math";
import { Color, Polyline } from "@kicanvas/graphics";
import type { List } from "@kicanvas/kicad/tokenizer";
import {
    findFootprintByRef,
    getAt,
    setAt,
    rotateFootprint,
    flipFootprint,
    removeChildren,
    getFootprintRef,
} from "@/lib/sexpr-mutate";
import type { SExprUndoStack } from "@/lib/sexpr-undo";
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
    pcbTree: List;
    undoStack: SExprUndoStack;
    selectedRef: string | null;
    onTreeChange: (tree: List) => void;
    canvasElement: HTMLCanvasElement | null;
}

export function useKiPCBDrag({
    viewer,
    pcbTree,
    undoStack,
    selectedRef,
    onTreeChange,
    canvasElement,
}: UseKiPCBDragOptions) {
    const dragRef = useRef<DragState | null>(null);

    // Keep latest refs for callbacks
    const pcbTreeRef = useRef(pcbTree);
    pcbTreeRef.current = pcbTree;
    const selectedRefRef = useRef(selectedRef);
    selectedRefRef.current = selectedRef;
    const onTreeChangeRef = useRef(onTreeChange);
    onTreeChangeRef.current = onTreeChange;
    const undoStackRef = useRef(undoStack);
    undoStackRef.current = undoStack;

    // Mouse → world coordinate conversion
    const getWorldPos = useCallback(
        (e: MouseEvent): { x: number; y: number } | null => {
            if (!viewer || !canvasElement) return null;
            const rect = canvasElement.getBoundingClientRect();
            const screenPos = new Vec2(
                e.clientX - rect.left,
                e.clientY - rect.top,
            );
            const worldPos = viewer.viewport.camera.screen_to_world(screenPos);
            return { x: worldPos.x, y: worldPos.y };
        },
        [viewer, canvasElement],
    );

    // Start drag
    const onMouseDown = useCallback(
        (e: MouseEvent) => {
            const sel = selectedRefRef.current;
            if (!sel || !viewer || e.button !== 0) return;

            const fp = findFootprintByRef(pcbTreeRef.current, sel);
            if (!fp) return;

            const at = getAt(fp);
            if (!at) return;

            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            dragRef.current = {
                ref: sel,
                startX: worldPos.x,
                startY: worldPos.y,
                origX: at.x,
                origY: at.y,
            };
        },
        [viewer, getWorldPos],
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

            const tree = pcbTreeRef.current;
            undoStackRef.current.pushSnapshot(tree);
            const newTree = structuredClone(tree);
            const fp = findFootprintByRef(newTree, drag.ref);
            if (fp) {
                const at = getAt(fp);
                setAt(fp, toX, toY, at?.rotation);
            }
            onTreeChangeRef.current(newTree);
        },
        [viewer, getWorldPos],
    );

    // Keyboard shortcuts
    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            const sel = selectedRefRef.current;
            if (!sel) return;

            // R: Rotate 90° CCW
            if (e.key === "r" || e.key === "R") {
                if (e.ctrlKey || e.metaKey) return;
                e.preventDefault();
                const tree = pcbTreeRef.current;
                undoStackRef.current.pushSnapshot(tree);
                const newTree = structuredClone(tree);
                const fp = findFootprintByRef(newTree, sel);
                if (fp) rotateFootprint(fp, 90);
                onTreeChangeRef.current(newTree);
                return;
            }

            // F: Flip
            if (e.key === "f" || e.key === "F") {
                if (e.ctrlKey || e.metaKey) return;
                e.preventDefault();
                const tree = pcbTreeRef.current;
                undoStackRef.current.pushSnapshot(tree);
                const newTree = structuredClone(tree);
                const fp = findFootprintByRef(newTree, sel);
                if (fp) flipFootprint(fp);
                onTreeChangeRef.current(newTree);
                return;
            }

            // Delete/Backspace: Delete selected footprint
            if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                const tree = pcbTreeRef.current;
                undoStackRef.current.pushSnapshot(tree);
                const newTree = structuredClone(tree);
                removeChildren(newTree, "footprint", (fp) => {
                    return getFootprintRef(fp) === sel;
                });
                onTreeChangeRef.current(newTree);
                return;
            }

            // Ctrl+Z: Undo
            if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
                e.preventDefault();
                const result = undoStackRef.current.undo(pcbTreeRef.current);
                if (result) onTreeChangeRef.current(result);
                return;
            }

            // Ctrl+Shift+Z or Ctrl+Y: Redo
            if (
                ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) ||
                ((e.ctrlKey || e.metaKey) && e.key === "y")
            ) {
                e.preventDefault();
                const result = undoStackRef.current.redo(pcbTreeRef.current);
                if (result) onTreeChangeRef.current(result);
                return;
            }
        },
        [],
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
