"use client";

import { useRef, useEffect, useCallback } from "react";
import type { PCBDesign } from "@/lib/pcb-types";
import { buildKicadPCB } from "@/lib/kicanvas-factory";
import { EditableBoardViewer } from "@/lib/editable-board-viewer";

// KiCanvas uses WebGL2 — this component must be client-side only
// The theme import resolves through @kicanvas path alias
import kicad_theme from "@kicanvas/kicanvas/themes/kicad-default";

export interface KiPCBCanvasProps {
    design: PCBDesign;
    onDesignChange?: (design: PCBDesign) => void;
    activeTool?: string;
    activeLayer?: string;
    onSelect?: (item: unknown) => void;
    onMouseMove?: (x: number, y: number) => void;
}

export default function KiPCBCanvas({
    design,
    onDesignChange,
    activeTool = "select",
    activeLayer = "F.Cu",
    onSelect,
    onMouseMove,
}: KiPCBCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const viewerRef = useRef<EditableBoardViewer | null>(null);
    const loadedRef = useRef(false);

    // Stable callbacks to avoid re-creating event listeners
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;
    const onMouseMoveRef = useRef(onMouseMove);
    onMouseMoveRef.current = onMouseMove;

    // Initialize viewer on mount
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

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
            const board = buildKicadPCB(design);
            viewer.loadBoard(board).then(() => {
                loadedRef.current = true;
                viewer.zoom_to_board();
                viewer.draw();
            });
        });

        return () => {
            selectDisposable.dispose();
            moveDisposable.dispose();
            viewer.dispose();
            viewerRef.current = null;
            loadedRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Update board when design changes (after initial load)
    useEffect(() => {
        const viewer = viewerRef.current;
        if (!viewer || !loadedRef.current) return;

        const board = buildKicadPCB(design);
        viewer.updateBoard(board);
    }, [design]);

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
}

/** Hook to access the viewer instance for advanced operations */
export function useKiPCBViewer(
    canvasRef: React.RefObject<HTMLCanvasElement | null>,
): EditableBoardViewer | null {
    const viewerRef = useRef<EditableBoardViewer | null>(null);
    return viewerRef.current;
}
