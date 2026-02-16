/**
 * Hook for dragging footprints and the board outline on the PCB canvas.
 *
 * Operates on S-expression trees (List) rather than PCBDesign.
 *
 * Footprint drag:
 * - Mousedown on a selected footprint starts drag
 * - Mousemove computes world-space delta, paints preview on overlay
 * - Mouseup snaps to grid, checks courtyard overlap, commits or reverts
 *
 * Board outline drag:
 * - Mousedown near an Edge.Cuts line (no footprint selected) starts outline drag
 * - All Edge.Cuts gr_line nodes move together
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
    findChildren,
    findChild,
    getAt,
    setAt,
    getLayer,
    rotateFootprint,
    flipFootprint,
    removeChildren,
    getFootprintRef,
    checkCourtyardOverlap,
    type BBoxRect,
    getFootprintCourtyard,
} from "@/lib/sexpr-mutate";
import type { SExprUndoStack } from "@/lib/sexpr-undo";
import type { EditableBoardViewer } from "@/lib/editable-board-viewer";

const GRID_SNAP = 0.5; // mm

function snapToGrid(v: number, grid: number): number {
    return Math.round(v / grid) * grid;
}

interface FootprintDragState {
    kind: "footprint";
    ref: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
}

interface OutlineDragState {
    kind: "outline";
    startX: number;
    startY: number;
}

type DragState = FootprintDragState | OutlineDragState;

export interface UseKiPCBDragOptions {
    viewer: EditableBoardViewer | null;
    pcbTree: List;
    undoStack: SExprUndoStack;
    selectedRef: string | null;
    onTreeChange: (tree: List) => void;
    onSelectRef?: (ref: string | null) => void;
    canvasElement: HTMLCanvasElement | null;
}

/** Get all Edge.Cuts gr_line start/end points for hit testing. */
function getEdgeCutsBBox(tree: List): BBoxRect | null {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;
    for (const tag of ["gr_line", "gr_arc", "gr_rect"]) {
        const nodes = findChildren(tree, tag);
        for (const node of nodes) {
            if (getLayer(node) !== "Edge.Cuts") continue;
            found = true;
            const start = findChild(node, "start");
            const end = findChild(node, "end");
            if (start) {
                const sx = typeof start[1] === "number" ? start[1] : 0;
                const sy = typeof start[2] === "number" ? start[2] : 0;
                minX = Math.min(minX, sx); minY = Math.min(minY, sy);
                maxX = Math.max(maxX, sx); maxY = Math.max(maxY, sy);
            }
            if (end) {
                const ex = typeof end[1] === "number" ? end[1] : 0;
                const ey = typeof end[2] === "number" ? end[2] : 0;
                minX = Math.min(minX, ex); minY = Math.min(minY, ey);
                maxX = Math.max(maxX, ex); maxY = Math.max(maxY, ey);
            }
        }
    }
    return found ? { x1: minX, y1: minY, x2: maxX, y2: maxY } : null;
}

/** Check if a point is near any Edge.Cuts line (within threshold mm). */
function isNearEdgeCuts(tree: List, wx: number, wy: number, threshold: number): boolean {
    for (const tag of ["gr_line", "gr_arc"]) {
        const nodes = findChildren(tree, tag);
        for (const node of nodes) {
            if (getLayer(node) !== "Edge.Cuts") continue;
            const start = findChild(node, "start");
            const end = findChild(node, "end");
            if (!start || !end) continue;
            const sx = typeof start[1] === "number" ? start[1] : 0;
            const sy = typeof start[2] === "number" ? start[2] : 0;
            const ex = typeof end[1] === "number" ? end[1] : 0;
            const ey = typeof end[2] === "number" ? end[2] : 0;
            if (distToSegment(wx, wy, sx, sy, ex, ey) < threshold) return true;
        }
    }
    return false;
}

function distToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Rotate a local offset (lx,ly) by the footprint rotation (degrees) around its origin. */
function rotatePoint(lx: number, ly: number, angleDeg: number): { x: number; y: number } {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    return { x: lx * cos - ly * sin, y: lx * sin + ly * cos };
}

/** Check if a world-space point is near any pad of a footprint. */
function isNearFootprintPad(fp: List, wx: number, wy: number, threshold: number): boolean {
    const at = getAt(fp);
    if (!at) return false;

    const rot = at.rotation ?? 0;
    const pads = findChildren(fp, "pad");
    for (const pad of pads) {
        const padAt = getAt(pad);
        if (!padAt) continue;
        const sizeNode = findChild(pad, "size");
        const pw = sizeNode && typeof sizeNode[1] === "number" ? sizeNode[1] : 1;
        const ph = sizeNode && typeof sizeNode[2] === "number" ? sizeNode[2] : 1;
        const padRadius = Math.max(pw, ph) / 2 + threshold;
        // Apply footprint rotation to pad local offset
        const rp = rotatePoint(padAt.x, padAt.y, rot);
        const dx = wx - (at.x + rp.x);
        const dy = wy - (at.y + rp.y);
        if (dx * dx + dy * dy <= padRadius * padRadius) return true;
    }
    return false;
}

/** Find the footprint whose pad is closest to (wx,wy), within threshold. Returns its ref or null. */
function findFootprintByPadHit(tree: List, wx: number, wy: number, threshold: number): string | null {
    const footprints = findChildren(tree, "footprint");
    let bestDist = threshold * threshold;
    let bestRef: string | null = null;

    for (const fp of footprints) {
        const at = getAt(fp);
        if (!at) continue;
        const rot = at.rotation ?? 0;
        const ref = getFootprintRef(fp);
        if (!ref) continue;

        const pads = findChildren(fp, "pad");
        for (const pad of pads) {
            const padAt = getAt(pad);
            if (!padAt) continue;
            const sizeNode = findChild(pad, "size");
            const pw = sizeNode && typeof sizeNode[1] === "number" ? sizeNode[1] : 1;
            const ph = sizeNode && typeof sizeNode[2] === "number" ? sizeNode[2] : 1;
            const padRadius = Math.max(pw, ph) / 2;
            const rp = rotatePoint(padAt.x, padAt.y, rot);
            const absPadX = at.x + rp.x;
            const absPadY = at.y + rp.y;
            const dx = wx - absPadX;
            const dy = wy - absPadY;
            const distSq = dx * dx + dy * dy;
            const hitRadius = padRadius + threshold;
            if (distSq <= hitRadius * hitRadius && distSq < bestDist) {
                bestDist = distSq;
                bestRef = ref;
            }
        }
    }
    return bestRef;
}

/** Move all Edge.Cuts gr_line/gr_arc nodes by dx, dy. */
function moveEdgeCuts(tree: List, dx: number, dy: number): void {
    for (const tag of ["gr_line", "gr_arc"]) {
        const nodes = findChildren(tree, tag);
        for (const node of nodes) {
            if (getLayer(node) !== "Edge.Cuts") continue;
            const start = findChild(node, "start");
            const end = findChild(node, "end");
            if (start && typeof start[1] === "number" && typeof start[2] === "number") {
                start[1] = snapToGrid(start[1] + dx, GRID_SNAP);
                start[2] = snapToGrid(start[2] + dy, GRID_SNAP);
            }
            if (end && typeof end[1] === "number" && typeof end[2] === "number") {
                end[1] = snapToGrid(end[1] + dx, GRID_SNAP);
                end[2] = snapToGrid(end[2] + dy, GRID_SNAP);
            }
        }
    }
}

export function useKiPCBDrag({
    viewer,
    pcbTree,
    undoStack,
    selectedRef,
    onTreeChange,
    onSelectRef: onSelectRefCb,
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
    const onSelectRefCbRef = useRef(onSelectRefCb);
    onSelectRefCbRef.current = onSelectRefCb;
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
            if (!viewer || e.button !== 0) return;

            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            const sel = selectedRefRef.current;

            // Try footprint drag — only if click lands on a pad of the selected footprint
            if (sel) {
                const fp = findFootprintByRef(pcbTreeRef.current, sel);
                if (fp && isNearFootprintPad(fp, worldPos.x, worldPos.y, 1)) {
                    const at = getAt(fp);
                    if (at) {
                        dragRef.current = {
                            kind: "footprint",
                            ref: sel,
                            startX: worldPos.x,
                            startY: worldPos.y,
                            origX: at.x,
                            origY: at.y,
                        };
                        return;
                    }
                }
            }

            // Try selecting a different footprint by clicking near any pad
            const hitRef = findFootprintByPadHit(pcbTreeRef.current, worldPos.x, worldPos.y, 2);
            if (hitRef && hitRef !== sel) {
                onSelectRefCbRef.current?.(hitRef);
                // Also start drag immediately on the newly selected footprint
                const fp = findFootprintByRef(pcbTreeRef.current, hitRef);
                if (fp) {
                    const at = getAt(fp);
                    if (at) {
                        dragRef.current = {
                            kind: "footprint",
                            ref: hitRef,
                            startX: worldPos.x,
                            startY: worldPos.y,
                            origX: at.x,
                            origY: at.y,
                        };
                        return;
                    }
                }
            }

            // Try outline drag: click near an Edge.Cuts line
            if (isNearEdgeCuts(pcbTreeRef.current, worldPos.x, worldPos.y, 2)) {
                dragRef.current = {
                    kind: "outline",
                    startX: worldPos.x,
                    startY: worldPos.y,
                };
            }
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

            if (drag.kind === "footprint") {
                const dx = worldPos.x - drag.startX;
                const dy = worldPos.y - drag.startY;
                const previewX = snapToGrid(drag.origX + dx, GRID_SNAP);
                const previewY = snapToGrid(drag.origY + dy, GRID_SNAP);

                // Check overlap at preview position
                const overlappingRef = checkCourtyardOverlap(
                    pcbTreeRef.current, drag.ref, previewX, previewY,
                );
                const color = overlappingRef ? new Color(1, 0.2, 0.2, 1) : Color.white;

                // Draw drag preview crosshair + courtyard preview
                viewer.paintOverlay((gfx) => {
                    const size = 2;
                    gfx.line(
                        new Polyline(
                            [new Vec2(previewX - size, previewY), new Vec2(previewX + size, previewY)],
                            0.2, color,
                        ),
                    );
                    gfx.line(
                        new Polyline(
                            [new Vec2(previewX, previewY - size), new Vec2(previewX, previewY + size)],
                            0.2, color,
                        ),
                    );

                    // Draw courtyard preview rectangle
                    const movedFp = findFootprintByRef(pcbTreeRef.current, drag.ref);
                    if (movedFp) {
                        const cy = getFootprintCourtyard(movedFp);
                        if (cy) {
                            const currentAt = getAt(movedFp);
                            if (currentAt) {
                                const ddx = previewX - currentAt.x;
                                const ddy = previewY - currentAt.y;
                                const r = {
                                    x1: cy.x1 + ddx, y1: cy.y1 + ddy,
                                    x2: cy.x2 + ddx, y2: cy.y2 + ddy,
                                };
                                gfx.line(new Polyline([
                                    new Vec2(r.x1, r.y1), new Vec2(r.x2, r.y1),
                                    new Vec2(r.x2, r.y2), new Vec2(r.x1, r.y2),
                                    new Vec2(r.x1, r.y1),
                                ], 0.15, color));
                            }
                        }
                    }
                });
            } else if (drag.kind === "outline") {
                const dx = worldPos.x - drag.startX;
                const dy = worldPos.y - drag.startY;
                const bbox = getEdgeCutsBBox(pcbTreeRef.current);
                if (bbox) {
                    const previewColor = new Color(1, 1, 0, 0.7);
                    const nx1 = snapToGrid(bbox.x1 + dx, GRID_SNAP);
                    const ny1 = snapToGrid(bbox.y1 + dy, GRID_SNAP);
                    const nx2 = nx1 + (bbox.x2 - bbox.x1);
                    const ny2 = ny1 + (bbox.y2 - bbox.y1);
                    viewer.paintOverlay((gfx) => {
                        gfx.line(new Polyline([
                            new Vec2(nx1, ny1), new Vec2(nx2, ny1),
                            new Vec2(nx2, ny2), new Vec2(nx1, ny2),
                            new Vec2(nx1, ny1),
                        ], 0.2, previewColor));
                    });
                }
            }
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

            if (drag.kind === "footprint") {
                const dx = worldPos.x - drag.startX;
                const dy = worldPos.y - drag.startY;
                const toX = snapToGrid(drag.origX + dx, GRID_SNAP);
                const toY = snapToGrid(drag.origY + dy, GRID_SNAP);

                // Only commit if actually moved
                if (toX === drag.origX && toY === drag.origY) return;

                // Check for courtyard overlap
                const overlap = checkCourtyardOverlap(
                    pcbTreeRef.current, drag.ref, toX, toY,
                );
                if (overlap) {
                    // Flash red overlay briefly to indicate rejection
                    viewer.paintOverlay((gfx) => {
                        const movedFp = findFootprintByRef(pcbTreeRef.current, drag.ref);
                        if (movedFp) {
                            const cy = getFootprintCourtyard(movedFp);
                            if (cy) {
                                const red = new Color(1, 0, 0, 0.8);
                                gfx.line(new Polyline([
                                    new Vec2(cy.x1, cy.y1), new Vec2(cy.x2, cy.y1),
                                    new Vec2(cy.x2, cy.y2), new Vec2(cy.x1, cy.y2),
                                    new Vec2(cy.x1, cy.y1),
                                ], 0.3, red));
                            }
                        }
                    });
                    setTimeout(() => viewer.clearOverlay(), 500);
                    return;
                }

                const tree = pcbTreeRef.current;
                undoStackRef.current.pushSnapshot(tree);
                const newTree = structuredClone(tree);
                const fp = findFootprintByRef(newTree, drag.ref);
                if (fp) {
                    const at = getAt(fp);
                    setAt(fp, toX, toY, at?.rotation);
                }
                onTreeChangeRef.current(newTree);
            } else if (drag.kind === "outline") {
                const dx = worldPos.x - drag.startX;
                const dy = worldPos.y - drag.startY;
                const snapDx = snapToGrid(dx, GRID_SNAP);
                const snapDy = snapToGrid(dy, GRID_SNAP);

                if (snapDx === 0 && snapDy === 0) return;

                const tree = pcbTreeRef.current;
                undoStackRef.current.pushSnapshot(tree);
                const newTree = structuredClone(tree);
                moveEdgeCuts(newTree, snapDx, snapDy);
                onTreeChangeRef.current(newTree);
            }
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
