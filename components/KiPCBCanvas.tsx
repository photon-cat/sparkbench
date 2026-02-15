"use client";

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import type { List } from "@kicanvas/kicad/tokenizer";
import { KicadPCB } from "@kicanvas/kicad/board";
import { EditableBoardViewer } from "@/lib/editable-board-viewer";
import { computeRatsnestFromBoard } from "@/lib/ratsnest";
import { Vec2 } from "@kicanvas/base/math";
import { Color } from "@kicanvas/graphics";

// KiCanvas uses WebGL2 — this component must be client-side only
import kicad_theme from "@kicanvas/kicanvas/themes/kicad-default";

export interface KiPCBCanvasHandle {
    viewer: EditableBoardViewer | null;
    canvas: HTMLCanvasElement | null;
    paintRatsnest: () => void;
}

export interface KiPCBCanvasProps {
    pcbTree: List;
    showRatsnest?: boolean;
    onSelect?: (item: unknown) => void;
    onMouseMove?: (x: number, y: number) => void;
    onBoardLoaded?: () => void;
}


const KiPCBCanvas = forwardRef<KiPCBCanvasHandle, KiPCBCanvasProps>(
    function KiPCBCanvas({ pcbTree, showRatsnest = true, onSelect, onMouseMove, onBoardLoaded }, ref) {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const viewerRef = useRef<EditableBoardViewer | null>(null);
        const loadedRef = useRef(false);

        // Stable callbacks to avoid re-creating event listeners
        const onSelectRef = useRef(onSelect);
        onSelectRef.current = onSelect;
        const onMouseMoveRef = useRef(onMouseMove);
        onMouseMoveRef.current = onMouseMove;
        const onBoardLoadedRef = useRef(onBoardLoaded);
        onBoardLoadedRef.current = onBoardLoaded;
        const showRatsnestRef = useRef(showRatsnest);
        showRatsnestRef.current = showRatsnest;

        // Update the persistent ratsnest overlay callback
        const paintRatsnest = useRef(() => {
            const viewer = viewerRef.current;
            if (!viewer || !loadedRef.current) return;

            if (!showRatsnestRef.current) {
                viewer.setOverlayCallback(null);
                viewer.clearOverlay();
                return;
            }

            const board = viewer.board;
            if (!board) return;

            const ratsnestLines = computeRatsnestFromBoard(board);

            if (ratsnestLines.length === 0) {
                viewer.setOverlayCallback(null);
                viewer.clearOverlay();
                return;
            }

            // Register persistent callback so ratsnest survives selection changes
            viewer.setOverlayCallback((gfx) => {
                const color = new Color(0.2, 0.6, 1.0, 0.7);
                for (const line of ratsnestLines) {
                    gfx.line(
                        [new Vec2(line.x1, line.y1), new Vec2(line.x2, line.y2)],
                        0.15,
                        color,
                    );
                }
            });
            // Trigger a repaint to show the new ratsnest
            viewer.clearOverlay();
        });

        // Expose viewer + canvas + paintRatsnest to parent
        useImperativeHandle(ref, () => ({
            get viewer() { return viewerRef.current; },
            get canvas() { return canvasRef.current; },
            paintRatsnest: () => paintRatsnest.current(),
        }));

        // Initialize viewer on mount
        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            let aborted = false;
            const viewer = new EditableBoardViewer(canvas, kicad_theme.board);
            viewerRef.current = viewer;

            // Listen for selection events
            const selectDisposable = viewer.addEventListener(
                "kicanvas:select",
                (e: any) => {
                    onSelectRef.current?.(e.detail?.item ?? null);
                },
            );

            // Listen for mouse move events
            const moveDisposable = viewer.addEventListener(
                "kicanvas:mousemove",
                (e: any) => {
                    onMouseMoveRef.current?.(e.detail?.x ?? 0, e.detail?.y ?? 0);
                },
            );

            // Setup WebGL renderer and load initial board
            viewer.setup().then(() => {
                if (aborted) return;
                console.log("[KiPCBCanvas] WebGL setup complete, parsing board...");
                try {
                    const board = new KicadPCB("board.kicad_pcb", pcbTree);
                    console.log("[KiPCBCanvas] Board parsed:", board.footprints.length, "fp,", board.segments.length, "seg,", board.nets.length, "nets");
                    viewer.loadBoard(board).then(() => {
                        if (aborted) return;
                        loadedRef.current = true;
                        console.log("[KiPCBCanvas] Board loaded, zooming to board...");
                        viewer.zoom_to_board();
                        viewer.draw();
                        paintRatsnest.current();
                        onBoardLoadedRef.current?.();
                    });
                } catch (err) {
                    console.error("[KiPCBCanvas] Failed to parse PCB tree:", err);
                }
            }).catch((err: unknown) => {
                if (!aborted) {
                    console.error("[KiPCBCanvas] WebGL setup failed:", err);
                }
            });

            return () => {
                aborted = true;
                selectDisposable.dispose();
                moveDisposable.dispose();
                viewer.dispose();
                viewerRef.current = null;
                loadedRef.current = false;
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        // Update board when tree changes (after initial load)
        useEffect(() => {
            const viewer = viewerRef.current;
            if (!viewer || !loadedRef.current) return;

            try {
                const board = new KicadPCB("board.kicad_pcb", pcbTree);
                viewer.updateBoard(board);
                paintRatsnest.current();
            } catch (err) {
                console.error("Failed to parse PCB tree:", err);
            }
        }, [pcbTree]);

        // Repaint ratsnest when visibility toggles
        useEffect(() => {
            paintRatsnest.current();
        }, [showRatsnest]);

        return (
            <canvas
                ref={canvasRef}
                style={{
                    width: "100%",
                    height: "100%",
                    display: "block",
                    touchAction: "none",
                }}
            />
        );
    },
);

export default KiPCBCanvas;
