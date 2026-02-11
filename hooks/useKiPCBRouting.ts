/**
 * Interactive trace routing hook.
 *
 * State machine: IDLE → ROUTING → IDLE
 *
 * 1. Click pad → identify net + layer, enter ROUTING
 * 2. Mousemove → rubber-band preview on overlay (45°/90° segments)
 * 3. Click → place waypoint (add segment)
 * 4. V key → insert via, switch layer, continue routing
 * 5. Click destination pad (same net) → complete trace
 * 6. Escape → cancel
 * 7. / key → toggle routing angle mode
 */

import { useRef, useCallback, useEffect } from "react";
import { Vec2 } from "@kicanvas/base/math";
import { Color, Polyline } from "@kicanvas/graphics";
import type { PCBDesign, PCBTrace, PCBTraceSegment, PCBVia, CopperLayerId } from "@/lib/pcb-types";
import { generateUUID } from "@/lib/pcb-types";
import { PCBUndoStack, AddTraceCommand, AddViaCommand } from "@/lib/pcb-undo";
import type { EditableBoardViewer } from "@/lib/editable-board-viewer";

const TRACE_WIDTH = 0.25; // mm
const VIA_DIAMETER = 0.8; // mm
const VIA_DRILL = 0.4; // mm
const GRID_SNAP = 0.1; // mm

type RoutingMode = "ortho_h" | "ortho_v" | "diagonal";

interface RoutingState {
    net: string;
    layer: CopperLayerId;
    waypoints: { x: number; y: number }[];
    segments: PCBTraceSegment[];
    vias: PCBVia[];
    mode: RoutingMode;
}

function snap(v: number): number {
    return Math.round(v / GRID_SNAP) * GRID_SNAP;
}

/**
 * Compute a routed path from `from` to `to` using the current routing mode.
 * Returns 1 or 2 segments (bend point for 90° routes).
 */
function computeRouteSegments(
    from: { x: number; y: number },
    to: { x: number; y: number },
    mode: RoutingMode,
): { x: number; y: number }[] {
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (mode === "diagonal") {
        // 45° routing: go diagonal then straight
        const adx = Math.abs(dx);
        const ady = Math.abs(dy);
        const diag = Math.min(adx, ady);
        if (adx > ady) {
            // Diagonal then horizontal
            const midX = from.x + Math.sign(dx) * diag;
            const midY = from.y + Math.sign(dy) * diag;
            return [from, { x: midX, y: midY }, to];
        } else {
            // Diagonal then vertical
            const midX = from.x + Math.sign(dx) * diag;
            const midY = from.y + Math.sign(dy) * diag;
            return [from, { x: midX, y: midY }, to];
        }
    }

    if (mode === "ortho_h") {
        // Horizontal first, then vertical
        const mid = { x: to.x, y: from.y };
        if (Math.abs(dx) < 0.01) return [from, to];
        if (Math.abs(dy) < 0.01) return [from, to];
        return [from, mid, to];
    }

    // ortho_v: Vertical first, then horizontal
    const mid = { x: from.x, y: to.y };
    if (Math.abs(dx) < 0.01) return [from, to];
    if (Math.abs(dy) < 0.01) return [from, to];
    return [from, mid, to];
}

export interface UseKiPCBRoutingOptions {
    viewer: EditableBoardViewer | null;
    design: PCBDesign;
    undoStack: PCBUndoStack;
    activeLayer: CopperLayerId;
    onDesignChange: (design: PCBDesign) => void;
    onLayerChange: (layer: CopperLayerId) => void;
    canvasElement: HTMLCanvasElement | null;
    active: boolean;
}

export function useKiPCBRouting({
    viewer,
    design,
    undoStack,
    activeLayer,
    onDesignChange,
    onLayerChange,
    canvasElement,
    active,
}: UseKiPCBRoutingOptions) {
    const routingRef = useRef<RoutingState | null>(null);

    // Find which net a pad belongs to
    const findPadNet = useCallback(
        (worldX: number, worldY: number): { net: string; padId: string } | null => {
            // Search footprint pads for one near the click
            const threshold = 1.0; // mm
            for (const fp of design.footprints) {
                for (const pad of fp.pads) {
                    const px = fp.x + pad.x;
                    const py = fp.y + pad.y;
                    const dist = Math.hypot(worldX - px, worldY - py);
                    if (dist < threshold && pad.net) {
                        return { net: pad.net, padId: pad.id };
                    }
                }
            }
            return null;
        },
        [design],
    );

    const getWorldPos = useCallback(
        (e: MouseEvent): { x: number; y: number } | null => {
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

    // Draw routing rubber-band on overlay
    const drawPreview = useCallback(
        (cursorX: number, cursorY: number) => {
            const routing = routingRef.current;
            if (!routing || !viewer) return;

            const lastWp = routing.waypoints[routing.waypoints.length - 1]!;
            const points = computeRouteSegments(lastWp, { x: cursorX, y: cursorY }, routing.mode);

            viewer.paintOverlay((gfx) => {
                const color = routing.layer === "F.Cu"
                    ? Color.from_css("rgb(200, 52, 52)")
                    : Color.from_css("rgb(77, 127, 196)");

                // Draw committed segments
                for (const seg of routing.segments) {
                    gfx.line(
                        new Polyline(
                            [new Vec2(seg.x1, seg.y1), new Vec2(seg.x2, seg.y2)],
                            TRACE_WIDTH,
                            color,
                        ),
                    );
                }

                // Draw rubber-band preview
                for (let i = 0; i < points.length - 1; i++) {
                    const a = points[i]!;
                    const b = points[i + 1]!;
                    gfx.line(
                        new Polyline(
                            [new Vec2(a.x, a.y), new Vec2(b.x, b.y)],
                            TRACE_WIDTH,
                            Color.from_css("rgba(255, 255, 255, 0.6)"),
                        ),
                    );
                }
            });
        },
        [viewer],
    );

    // Handle click during routing
    const onClick = useCallback(
        (e: MouseEvent) => {
            if (!active || !viewer) return;

            const worldPos = getWorldPos(e);
            if (!worldPos) return;

            const routing = routingRef.current;

            if (!routing) {
                // Not routing — check if we clicked a pad to start
                const padInfo = findPadNet(worldPos.x, worldPos.y);
                if (!padInfo) return;

                routingRef.current = {
                    net: padInfo.net,
                    layer: activeLayer,
                    waypoints: [worldPos],
                    segments: [],
                    vias: [],
                    mode: "ortho_h",
                };
                return;
            }

            // Check if we clicked a destination pad (same net → complete)
            const padInfo = findPadNet(worldPos.x, worldPos.y);
            if (padInfo && padInfo.net === routing.net) {
                // Complete: add final segments to destination
                const lastWp = routing.waypoints[routing.waypoints.length - 1]!;
                const points = computeRouteSegments(lastWp, worldPos, routing.mode);

                for (let i = 0; i < points.length - 1; i++) {
                    routing.segments.push({
                        uuid: generateUUID(),
                        x1: points[i]!.x,
                        y1: points[i]!.y,
                        x2: points[i + 1]!.x,
                        y2: points[i + 1]!.y,
                    });
                }

                // Commit the trace
                const trace: PCBTrace = {
                    net: routing.net,
                    layer: routing.layer,
                    width: TRACE_WIDTH,
                    segments: routing.segments,
                };
                const cmd = new AddTraceCommand(trace);
                let newDesign = undoStack.execute(cmd, design);

                // Also add any vias
                for (const via of routing.vias) {
                    const viaCmd = new AddViaCommand(via);
                    newDesign = undoStack.execute(viaCmd, newDesign);
                }

                onDesignChange(newDesign);
                routingRef.current = null;
                viewer.clearOverlay();
                return;
            }

            // Place waypoint
            const lastWp = routing.waypoints[routing.waypoints.length - 1]!;
            const points = computeRouteSegments(lastWp, worldPos, routing.mode);

            for (let i = 0; i < points.length - 1; i++) {
                routing.segments.push({
                    uuid: generateUUID(),
                    x1: points[i]!.x,
                    y1: points[i]!.y,
                    x2: points[i + 1]!.x,
                    y2: points[i + 1]!.y,
                });
            }

            routing.waypoints.push(worldPos);
        },
        [active, viewer, getWorldPos, findPadNet, activeLayer, design, undoStack, onDesignChange],
    );

    // Handle mousemove for rubber-band
    const onMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!routingRef.current || !active) return;
            const worldPos = getWorldPos(e);
            if (worldPos) drawPreview(worldPos.x, worldPos.y);
        },
        [active, getWorldPos, drawPreview],
    );

    // Handle keyboard
    const onKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (!active) return;
            const routing = routingRef.current;

            // Escape: cancel routing
            if (e.key === "Escape" && routing) {
                e.preventDefault();
                routingRef.current = null;
                viewer?.clearOverlay();
                return;
            }

            // V: Insert via and switch layer
            if ((e.key === "v" || e.key === "V") && routing) {
                e.preventDefault();
                const lastWp = routing.waypoints[routing.waypoints.length - 1]!;

                // Create via at last waypoint
                const via: PCBVia = {
                    uuid: generateUUID(),
                    x: lastWp.x,
                    y: lastWp.y,
                    diameter: VIA_DIAMETER,
                    drill: VIA_DRILL,
                    net: routing.net,
                    layers: ["F.Cu", "B.Cu"],
                };
                routing.vias.push(via);

                // Switch layer
                const newLayer: CopperLayerId =
                    routing.layer === "F.Cu" ? "B.Cu" : "F.Cu";
                routing.layer = newLayer;
                onLayerChange(newLayer);
                return;
            }

            // /: Toggle routing mode
            if (e.key === "/" && routing) {
                e.preventDefault();
                const modes: RoutingMode[] = ["ortho_h", "ortho_v", "diagonal"];
                const idx = modes.indexOf(routing.mode);
                routing.mode = modes[(idx + 1) % modes.length]!;
                return;
            }
        },
        [active, viewer, onLayerChange],
    );

    // Attach/detach event listeners
    useEffect(() => {
        if (!canvasElement || !active) return;

        canvasElement.addEventListener("click", onClick);
        canvasElement.addEventListener("mousemove", onMouseMove);
        window.addEventListener("keydown", onKeyDown);

        return () => {
            canvasElement.removeEventListener("click", onClick);
            canvasElement.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("keydown", onKeyDown);
            // Cancel any in-progress routing on deactivate
            routingRef.current = null;
        };
    }, [canvasElement, active, onClick, onMouseMove, onKeyDown]);

    return {
        isRouting: routingRef.current !== null,
        routingNet: routingRef.current?.net ?? null,
        routingLayer: routingRef.current?.layer ?? null,
    };
}
