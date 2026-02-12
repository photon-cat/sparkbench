/**
 * EditableBoardViewer — Subclass of KiCanvas BoardViewer for PCB editing.
 *
 * Key differences from read-only BoardViewer:
 * - on_pick() selects any item type (pad > footprint > trace > via > zone)
 * - loadBoard() / updateBoard() accept KicadPCB objects directly
 * - paintOverlay() draws transient editing graphics (drag preview, routing rubber-band)
 * - Exposes painter and renderer for external use
 */

import { BBox, Vec2 } from "@kicanvas/base/math";
import { Color, Polyline, Renderer } from "@kicanvas/graphics";
import type { BoardTheme } from "@kicanvas/kicad";
import * as board_items from "@kicanvas/kicad/board";
import { BoardViewer } from "@kicanvas/viewers/board/viewer";
import type { ViewLayer } from "@kicanvas/viewers/board/layers";
import { LayerNames } from "@kicanvas/viewers/board/layers";

export class EditableBoardViewer extends BoardViewer {
    constructor(canvas: HTMLCanvasElement, theme: BoardTheme) {
        super(canvas, true, theme);
    }

    /** Expose painter for external use (e.g. net highlighting) */
    get board_painter() {
        return this.painter;
    }

    /** Expose renderer for external overlay drawing */
    get gfx() {
        return this.renderer;
    }

    /**
     * Load a KicadPCB object and position the camera.
     * Use this for the initial load.
     */
    async loadBoard(board: board_items.KicadPCB) {
        await this.load(board);
    }

    /**
     * Update the board without resetting the camera.
     * Use this after edits (the KicadPCB is rebuilt from JSON each time).
     */
    updateBoard(board: board_items.KicadPCB) {
        this.document = board;
        this.paint();
        this.draw();
    }

    /**
     * Override on_pick to select any item type, not just Footprints.
     *
     * Selection priority (highest first):
     *   Pad > Footprint > LineSegment/ArcSegment > Via > Zone
     */
    protected override on_pick(
        mouse: Vec2,
        items: Generator<{ layer: ViewLayer; bbox: BBox }, void, unknown>,
    ): void {
        let bestBBox: BBox | null = null;
        let bestPriority = -1;

        for (const { layer: _, bbox } of items) {
            const ctx = bbox.context;
            let priority = 0;

            if (ctx instanceof board_items.Pad) {
                priority = 5;
            } else if (ctx instanceof board_items.Footprint) {
                priority = 4;
            } else if (
                ctx instanceof board_items.LineSegment ||
                ctx instanceof board_items.ArcSegment
            ) {
                priority = 3;
            } else if (ctx instanceof board_items.Via) {
                priority = 2;
            } else if (ctx instanceof board_items.Zone) {
                priority = 1;
            }

            if (priority > bestPriority) {
                bestPriority = priority;
                bestBBox = bbox;
            }
        }

        this.selected = bestBBox;
    }

    /**
     * Override select to accept any board item as a BBox.
     * BoardViewer.select() only handles Footprint | string | BBox — we bypass
     * that and go straight to the base Viewer behavior.
     */
    override select(item: board_items.Footprint | string | BBox | null) {
        if (item instanceof BBox) {
            // Set directly — triggers Viewer._set_selected → event + paint_selected
            this.selected = item;
        } else if (typeof item === "string") {
            // Find footprint by UUID/ref, then select its bbox
            const fp = this.board.find_footprint(item);
            this.selected = fp?.bbox ?? null;
        } else if (item instanceof board_items.Footprint) {
            this.selected = item.bbox;
        } else {
            this.selected = null;
        }
    }

    /**
     * Paint transient items on the overlay layer.
     * Used for drag previews, routing rubber-bands, DRC markers, etc.
     *
     * The callback receives the renderer and overlay layer — draw whatever
     * you need, and it will be composited on top.
     */
    paintOverlay(
        callback: (gfx: Renderer, overlay: ViewLayer) => void,
    ) {
        const overlay = this.layers.overlay;
        overlay.clear();
        this.renderer.start_layer(overlay.name);
        callback(this.renderer, overlay);
        overlay.graphics = this.renderer.end_layer();
        overlay.graphics.composite_operation = "overlay";
        this.draw();
    }

    /** Clear the overlay layer (remove drag preview, rubber-band, etc.) */
    clearOverlay() {
        const overlay = this.layers.overlay;
        overlay.clear();
        this.draw();
    }

    /** Zoom the camera to fit the board outline with some padding */
    override zoom_to_board() {
        const edge_cuts = this.layers.by_name(LayerNames.edge_cuts);
        if (edge_cuts) {
            const board_bbox = edge_cuts.bbox;
            this.viewport.camera.bbox = board_bbox.grow(board_bbox.w * 0.1);
        }
    }
}
