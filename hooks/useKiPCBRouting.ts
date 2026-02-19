/**
 * Interactive trace routing + via placement hook.
 *
 * Works directly with S-expression trees (List) and KiCanvas viewer.
 *
 * Route tool (X):
 *   Click pad → rubber-band → click to place waypoints → click pad to finish
 *   / key toggles ortho_h / ortho_v / diagonal
 *   V key inserts via + switches layer mid-route
 *   W key cycles trace width through preset values
 *   Escape cancels
 *
 * Via tool (V):
 *   Click to place a via at cursor position (no net required)
 */

import { useRef, useCallback, useEffect } from "react";
import { Vec2 } from "@kicanvas/base/math";
import { Color, Polyline } from "@kicanvas/graphics";
import type { List } from "@kicanvas/kicad/tokenizer";
import type { KicadPCB } from "@kicanvas/kicad/board";
import {
    appendChild,
    buildSegmentNode,
    buildViaNode,
    getNetNumber,
} from "@/lib/sexpr-mutate";
import { generateUUID } from "@/lib/pcb-types";
import type { SExprUndoStack } from "@/lib/sexpr-undo";
import type { EditableBoardViewer } from "@/lib/editable-board-viewer";

// JLC-compatible standard sizes
export const TRACE_WIDTH_PRESETS = [0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.8, 1.0]; // mm
const VIA_DIAMETER = 0.8; // mm  (JLC min 0.5, standard 0.8)
const VIA_DRILL = 0.4;    // mm  (JLC min 0.3)
const GRID_SNAP = 0.1;    // mm

type RoutingMode = "ortho_h" | "ortho_v" | "diagonal";
type CopperLayer = "F.Cu" | "B.Cu";

interface RoutingState {
    net: string;
    layer: CopperLayer;
    waypoints: { x: number; y: number }[];
    committedSegs: { x1: number; y1: number; x2: number; y2: number; layer: CopperLayer }[];
    pendingVias: { x: number; y: number; net: string }[];
    mode: RoutingMode;
}

function snap(v: number): number {
    return Math.round(v / GRID_SNAP) * GRID_SNAP;
}

function computeRoutePoints(
    from: { x: number; y: number },
    to: { x: number; y: number },
    mode: RoutingMode,
): { x: number; y: number }[] {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return [from];
    if (Math.abs(dx) < 0.01 || Math.abs(dy) < 0.01) return [from, to];

    if (mode === "diagonal") {
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        const diag = Math.min(adx, ady);
        const midX = from.x + Math.sign(dx) * diag;
        const midY = from.y + Math.sign(dy) * diag;
        return [from, { x: midX, y: midY }, to];
    }

    // 45° chamfered routing for ortho modes
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);
    // Chamfer length: min of half the shorter leg, 2mm max
    const shorterLeg = Math.min(adx, ady);
    const chamfer = Math.min(shorterLeg, 2.0);

    if (chamfer < 0.05) {
        // Too short for chamfer, fall back to simple ortho
        if (mode === "ortho_h") {
            return [from, { x: to.x, y: from.y }, to];
        }
        return [from, { x: from.x, y: to.y }, to];
    }

    if (mode === "ortho_h") {
        // Horizontal first, then 45° bend, then vertical
        const cornerX = to.x;
        const cornerY = from.y;
        // Insert chamfer: shorten the horizontal leg and the vertical leg
        const chamferStartX = cornerX - Math.sign(dx) * chamfer;
        const chamferEndY = cornerY + Math.sign(dy) * chamfer;
        return [
            from,
            { x: chamferStartX, y: from.y },
            { x: cornerX, y: chamferEndY },
            to,
        ];
    }

    // ortho_v: Vertical first, then 45° bend, then horizontal
    const cornerX = from.x;
    const cornerY = to.y;
    const chamferStartY = cornerY - Math.sign(dy) * chamfer;
    const chamferEndX = cornerX + Math.sign(dx) * chamfer;
    return [
        from,
        { x: from.x, y: chamferStartY },
        { x: chamferEndX, y: cornerY },
        to,
    ];
}

export interface UseKiPCBRoutingOptions {
    viewer: EditableBoardViewer | null;
    pcbTree: List;
    undoStack: SExprUndoStack;
    activeLayer: CopperLayer;
    onTreeChange: (newTree: List) => void;
    onLayerChange: (layer: CopperLayer) => void;
    canvasElement: HTMLCanvasElement | null;
    activeRoute: boolean;
    activeVia: boolean;
    traceWidth?: number;
    onTraceWidthChange?: (width: number) => void;
}

export function useKiPCBRouting({
    viewer,
    pcbTree,
    undoStack,
    activeLayer,
    onTreeChange,
    onLayerChange,
    canvasElement,
    activeRoute,
    activeVia,
    traceWidth = 0.25,
    onTraceWidthChange,
}: UseKiPCBRoutingOptions) {
    const routingRef = useRef<RoutingState | null>(null);
    const pcbTreeRef = useRef(pcbTree);
    pcbTreeRef.current = pcbTree;
    const onTreeChangeRef = useRef(onTreeChange);
    onTreeChangeRef.current = onTreeChange;
    const traceWidthRef = useRef(traceWidth);
    traceWidthRef.current = traceWidth;
    const onTraceWidthChangeRef = useRef(onTraceWidthChange);
    onTraceWidthChangeRef.current = onTraceWidthChange;

    const getWorldPos = useCallback(
        (e: MouseEvent): { x: number; y: number } | null => {
            if (!viewer || !canvasElement) return null;
            const rect = canvasElement.getBoundingClientRect();
            const screenPos = new Vec2(e.clientX - rect.left, e.clientY - rect.top);
            const worldPos = viewer.viewport.camera.screen_to_world(screenPos);
            return { x: snap(worldPos.x), y: snap(worldPos.y) };
        },
        [viewer, canvasElement],
    );

    // Find pad near world position using KiCanvas board model
    const findPadAt = useCallback(
        (wx: number, wy: number): { net: string; x: number; y: number } | null => {
            if (!viewer?.board) return null;
            const board = viewer.board as KicadPCB;
            const threshold = 1.0;

            for (const fp of board.footprints) {
                const fpPos = fp.at?.position;
                const fpRot = fp.at?.rotation ?? 0;
                if (!fpPos) continue;
                const rad = (fpRot * Math.PI) / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                for (const pad of fp.pads) {
                    const netName = pad.net?.name;
                    if (!netName) continue;
                    const px = pad.at?.position?.x ?? 0;
                    const py = pad.at?.position?.y ?? 0;
                    const absX = fpPos.x + px * cos - py * sin;
                    const absY = fpPos.y + px * sin + py * cos;
                    if (Math.hypot(wx - absX, wy - absY) < threshold) {
                        return { net: netName, x: absX, y: absY };
                    }
                }
            }
            return null;
        },
        [viewer],
    );

    // Draw rubber-band preview
    const drawPreview = useCallback(
        (cursorX: number, cursorY: number) => {
            const routing = routingRef.current;
            if (!routing || !viewer) return;

            const tw = traceWidthRef.current;
            const lastWp = routing.waypoints[routing.waypoints.length - 1]!;
            const previewPts = computeRoutePoints(lastWp, { x: cursorX, y: cursorY }, routing.mode);

            viewer.paintOverlay((gfx) => {
                const frontColor = Color.from_css("rgb(200, 52, 52)");
                const backColor = Color.from_css("rgb(77, 127, 196)");
                const previewColor = Color.from_css("rgba(255, 255, 255, 0.6)");

                // Committed segments — each with its own layer color
                for (const seg of routing.committedSegs) {
                    const layerColor = seg.layer === "F.Cu" ? frontColor : backColor;
                    gfx.line(
                        new Polyline(
                            [new Vec2(seg.x1, seg.y1), new Vec2(seg.x2, seg.y2)],
                            tw,
                            layerColor,
                        ),
                    );
                }

                // Pending vias
                for (const v of routing.pendingVias) {
                    gfx.circle(new Vec2(v.x, v.y), VIA_DIAMETER / 2, Color.from_css("rgba(200,200,200,0.8)"));
                }

                // Rubber-band
                for (let i = 0; i < previewPts.length - 1; i++) {
                    const a = previewPts[i]!;
                    const b = previewPts[i + 1]!;
                    gfx.line(
                        new Polyline(
                            [new Vec2(a.x, a.y), new Vec2(b.x, b.y)],
                            tw,
                            previewColor,
                        ),
                    );
                }
            });
        },
        [viewer],
    );

    // Commit routing: add segments and vias to pcbTree
    const commitRoute = useCallback(
        (routing: RoutingState) => {
            const tree = pcbTreeRef.current;
            const netNum = getNetNumber(tree, routing.net);
            const tw = traceWidthRef.current;

            undoStack.pushSnapshot(tree);
            const newTree = structuredClone(tree);

            // Add segments — each segment uses its own layer
            for (const seg of routing.committedSegs) {
                appendChild(newTree, buildSegmentNode(
                    seg.x1, seg.y1, seg.x2, seg.y2,
                    tw, seg.layer, netNum, generateUUID(),
                ));
            }

            // Add vias
            for (const v of routing.pendingVias) {
                const vNetNum = getNetNumber(tree, v.net);
                appendChild(newTree, buildViaNode(
                    v.x, v.y, VIA_DIAMETER, VIA_DRILL,
                    ["F.Cu", "B.Cu"], vNetNum, generateUUID(),
                ));
            }

            onTreeChangeRef.current(newTree);
        },
        [undoStack],
    );

    // --- Route tool click ---
    const onRouteClick = useCallback(
        (e: MouseEvent) => {
            if (!viewer) return;
            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            const routing = routingRef.current;

            if (!routing) {
                // Start: must click a pad
                const padInfo = findPadAt(worldPos.x, worldPos.y);
                if (!padInfo) return;

                routingRef.current = {
                    net: padInfo.net,
                    layer: activeLayer,
                    waypoints: [{ x: snap(padInfo.x), y: snap(padInfo.y) }],
                    committedSegs: [],
                    pendingVias: [],
                    mode: "ortho_h",
                };
                return;
            }

            // Check if clicking destination pad (same net → complete)
            const padInfo = findPadAt(worldPos.x, worldPos.y);
            if (padInfo && padInfo.net === routing.net) {
                const lastWp = routing.waypoints[routing.waypoints.length - 1]!;
                const dest = { x: snap(padInfo.x), y: snap(padInfo.y) };
                const pts = computeRoutePoints(lastWp, dest, routing.mode);
                for (let i = 0; i < pts.length - 1; i++) {
                    routing.committedSegs.push({
                        x1: pts[i]!.x, y1: pts[i]!.y,
                        x2: pts[i + 1]!.x, y2: pts[i + 1]!.y,
                        layer: routing.layer,
                    });
                }
                commitRoute(routing);
                routingRef.current = null;
                viewer.clearOverlay();
                return;
            }

            // Place waypoint
            const lastWp = routing.waypoints[routing.waypoints.length - 1]!;
            const pts = computeRoutePoints(lastWp, worldPos, routing.mode);
            for (let i = 0; i < pts.length - 1; i++) {
                routing.committedSegs.push({
                    x1: pts[i]!.x, y1: pts[i]!.y,
                    x2: pts[i + 1]!.x, y2: pts[i + 1]!.y,
                    layer: routing.layer,
                });
            }
            routing.waypoints.push(worldPos);
        },
        [viewer, getWorldPos, findPadAt, activeLayer, commitRoute],
    );

    // --- Via tool click ---
    const onViaClick = useCallback(
        (e: MouseEvent) => {
            if (!viewer) return;
            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            const tree = pcbTreeRef.current;

            // Try to find a pad/net at this position
            const padInfo = findPadAt(worldPos.x, worldPos.y);
            const netName = padInfo?.net ?? "";
            const netNum = netName ? getNetNumber(tree, netName) : 0;

            undoStack.pushSnapshot(tree);
            const newTree = structuredClone(tree);
            appendChild(newTree, buildViaNode(
                worldPos.x, worldPos.y, VIA_DIAMETER, VIA_DRILL,
                ["F.Cu", "B.Cu"], netNum, generateUUID(),
            ));
            onTreeChangeRef.current(newTree);
        },
        [viewer, getWorldPos, findPadAt, undoStack],
    );

    // --- Mouse move for rubber-band ---
    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!routingRef.current) return;
            const worldPos = getWorldPos(e);
            if (worldPos) drawPreview(worldPos.x, worldPos.y);
        },
        [getWorldPos, drawPreview],
    );

    // --- Keyboard ---
    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const routing = routingRef.current;

            // Escape: cancel routing
            if (e.key === "Escape" && routing) {
                e.preventDefault();
                routingRef.current = null;
                viewer?.clearOverlay();
                return;
            }

            // W during routing: cycle trace width
            if ((e.key === "w" || e.key === "W") && routing && activeRoute) {
                e.preventDefault();
                const currentWidth = traceWidthRef.current;
                const idx = TRACE_WIDTH_PRESETS.indexOf(currentWidth);
                const nextIdx = (idx + 1) % TRACE_WIDTH_PRESETS.length;
                onTraceWidthChangeRef.current?.(TRACE_WIDTH_PRESETS[nextIdx]!);
                return;
            }

            // V during routing: insert via + switch layer
            if ((e.key === "v" || e.key === "V") && routing && activeRoute) {
                e.preventDefault();
                const lastWp = routing.waypoints[routing.waypoints.length - 1]!;
                routing.pendingVias.push({ x: lastWp.x, y: lastWp.y, net: routing.net });
                const newLayer: CopperLayer = routing.layer === "F.Cu" ? "B.Cu" : "F.Cu";
                routing.layer = newLayer;
                onLayerChange(newLayer);
                return;
            }

            // / : toggle routing mode
            if (e.key === "/" && routing) {
                e.preventDefault();
                const modes: RoutingMode[] = ["ortho_h", "ortho_v", "diagonal"];
                const idx = modes.indexOf(routing.mode);
                routing.mode = modes[(idx + 1) % modes.length]!;
                return;
            }
        },
        [activeRoute, viewer, onLayerChange],
    );

    // Attach/detach event listeners
    useEffect(() => {
        if (!canvasElement) return;
        const active = activeRoute || activeVia;
        if (!active) {
            // Cancel in-progress routing when switching away
            if (routingRef.current) {
                routingRef.current = null;
                viewer?.clearOverlay();
            }
            return;
        }

        const handleClick = (e: MouseEvent) => {
            if (activeRoute) onRouteClick(e);
            else if (activeVia) onViaClick(e);
        };

        canvasElement.addEventListener("click", handleClick);
        canvasElement.addEventListener("mousemove", onMouseMove);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            canvasElement.removeEventListener("click", handleClick);
            canvasElement.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [canvasElement, activeRoute, activeVia, onRouteClick, onViaClick, onMouseMove, onKeyDown, viewer]);

    return {
        isRouting: routingRef.current !== null,
    };
}
