/**
 * Helpers for finding and modifying nodes in a KiCad S-expression tree.
 *
 * The tree is a nested array produced by KiCanvas's tokenizer.listify().
 * Each node is: [tag, ...children] where children are strings, numbers, or sub-lists.
 */

import type { List } from "@kicanvas/kicad/tokenizer";

type SNode = string | number | List;

// ── Finding nodes ─────────────────────────────────────────────────

/**
 * Find the first child sub-list whose first element (tag) equals `tag`.
 * Example: findChild(footprintNode, "at") → ["at", 10, 20, 90]
 */
export function findChild(node: List, tag: string): List | null {
  for (const child of node) {
    if (Array.isArray(child) && child[0] === tag) {
      return child as List;
    }
  }
  return null;
}

/**
 * Find ALL child sub-lists whose tag equals `tag`.
 */
export function findChildren(node: List, tag: string): List[] {
  const result: List[] = [];
  for (const child of node) {
    if (Array.isArray(child) && child[0] === tag) {
      result.push(child as List);
    }
  }
  return result;
}

/**
 * Find a footprint node by reference designator.
 *
 * KiCad stores reference in either:
 * - (fp_text reference "R1" ...) — older format
 * - (property "Reference" "R1" ...) — newer format
 */
export function findFootprintByRef(tree: List, ref: string): List | null {
  const footprints = findChildren(tree, "footprint");
  for (const fp of footprints) {
    // Check fp_text reference
    for (const child of fp) {
      if (!Array.isArray(child)) continue;
      const c = child as List;
      if (c[0] === "fp_text" && c[1] === "reference" && c[2] === ref) {
        return fp;
      }
      if (c[0] === "property" && c[1] === "Reference" && c[2] === ref) {
        return fp;
      }
    }
  }
  return null;
}

/**
 * Find a footprint node by UUID.
 */
export function findFootprintByUUID(tree: List, uuid: string): List | null {
  const footprints = findChildren(tree, "footprint");
  for (const fp of footprints) {
    if (getUUID(fp) === uuid) return fp;
  }
  return null;
}

/**
 * Get the string value of a (uuid "xxx") child, or null.
 */
export function getUUID(node: List): string | null {
  const uuidNode = findChild(node, "uuid");
  if (uuidNode && typeof uuidNode[1] === "string") return uuidNode[1];
  // Also check tstamp for older format
  const tstampNode = findChild(node, "tstamp");
  if (tstampNode && typeof tstampNode[1] === "string") return tstampNode[1];
  return null;
}

// ── Reading values ────────────────────────────────────────────────

/**
 * Get position from an (at X Y [rot]) node within a parent.
 */
export function getAt(node: List): { x: number; y: number; rotation: number } | null {
  const atNode = findChild(node, "at");
  if (!atNode) return null;
  const x = typeof atNode[1] === "number" ? atNode[1] : 0;
  const y = typeof atNode[2] === "number" ? atNode[2] : 0;
  const rotation = typeof atNode[3] === "number" ? atNode[3] : 0;
  return { x, y, rotation };
}

/**
 * Get a pair value: find (tag value) and return value.
 */
export function getPairValue(node: List, tag: string): SNode | null {
  const child = findChild(node, tag);
  if (!child || child.length < 2) return null;
  return child[1] as SNode;
}

/**
 * Get the layer string from a (layer "F.Cu") child.
 */
export function getLayer(node: List): string | null {
  const val = getPairValue(node, "layer");
  return typeof val === "string" ? val : null;
}

/**
 * Get reference designator from a footprint node.
 */
export function getFootprintRef(fp: List): string | null {
  // Check fp_text reference
  for (const child of fp) {
    if (!Array.isArray(child)) continue;
    const c = child as List;
    if (c[0] === "fp_text" && c[1] === "reference" && typeof c[2] === "string") {
      return c[2];
    }
    if (c[0] === "property" && c[1] === "Reference" && typeof c[2] === "string") {
      return c[2];
    }
  }
  return null;
}

// ── Modifying values ──────────────────────────────────────────────

/**
 * Update the (at X Y [rot]) node within a parent.
 * Creates it if it doesn't exist.
 */
export function setAt(
  node: List,
  x: number,
  y: number,
  rotation?: number,
): boolean {
  const atNode = findChild(node, "at");
  if (!atNode) {
    // Create (at X Y) or (at X Y rot)
    const newAt: List = rotation !== undefined
      ? ["at", x, y, rotation]
      : ["at", x, y];
    appendChild(node, newAt);
    return true;
  }
  atNode[1] = x;
  atNode[2] = y;
  if (rotation !== undefined) {
    atNode[3] = rotation;
  }
  return true;
}

/**
 * Set a pair value: find (tag oldValue) and replace with (tag newValue).
 * Creates the pair if it doesn't exist.
 */
export function setPairValue(
  node: List,
  tag: string,
  value: SNode,
): boolean {
  const child = findChild(node, tag);
  if (child) {
    child[1] = value;
    return true;
  }
  appendChild(node, [tag, value] as List);
  return true;
}

/**
 * Set the layer of a footprint or other node.
 */
export function setLayer(node: List, layer: string): boolean {
  return setPairValue(node, "layer", layer);
}

// ── Adding / removing children ────────────────────────────────────

/**
 * Append a child sub-list to a node.
 */
export function appendChild(parent: List, child: List): void {
  parent.push(child);
}

/**
 * Remove all children matching a tag and optional predicate.
 * Returns the number of children removed.
 */
export function removeChildren(
  parent: List,
  tag: string,
  predicate?: (child: List) => boolean,
): number {
  let removed = 0;
  for (let i = parent.length - 1; i >= 0; i--) {
    const child = parent[i];
    if (!Array.isArray(child)) continue;
    if (child[0] !== tag) continue;
    if (predicate && !predicate(child as List)) continue;
    parent.splice(i, 1);
    removed++;
  }
  return removed;
}

/**
 * Remove a single child at a given index.
 */
export function removeChildAt(parent: List, index: number): void {
  parent.splice(index, 1);
}

// ── Higher-level mutations ────────────────────────────────────────

/**
 * Rotate a footprint by a delta angle (degrees, CCW).
 */
export function rotateFootprint(fp: List, deltaAngle: number): void {
  const at = getAt(fp);
  if (!at) return;
  const newRotation = ((at.rotation || 0) + deltaAngle) % 360;
  setAt(fp, at.x, at.y, newRotation);
}

/**
 * Flip a footprint between F.Cu and B.Cu.
 * Also flips pad layers and silkscreen layer references.
 */
export function flipFootprint(fp: List): void {
  const currentLayer = getLayer(fp);
  const newLayer = currentLayer === "F.Cu" ? "B.Cu" : "F.Cu";
  setLayer(fp, newLayer);

  // Flip pad layers
  const pads = findChildren(fp, "pad");
  for (const pad of pads) {
    const layersNode = findChild(pad, "layers");
    if (layersNode) {
      for (let i = 1; i < layersNode.length; i++) {
        if (layersNode[i] === "F.Cu") layersNode[i] = "B.Cu";
        else if (layersNode[i] === "B.Cu") layersNode[i] = "F.Cu";
        else if (layersNode[i] === "F.Mask") layersNode[i] = "B.Mask";
        else if (layersNode[i] === "B.Mask") layersNode[i] = "F.Mask";
        else if (layersNode[i] === "F.Paste") layersNode[i] = "B.Paste";
        else if (layersNode[i] === "B.Paste") layersNode[i] = "F.Paste";
        else if (layersNode[i] === "F.SilkS") layersNode[i] = "B.SilkS";
        else if (layersNode[i] === "B.SilkS") layersNode[i] = "F.SilkS";
      }
    }
  }

  // Flip silkscreen and fab drawings
  const drawingTags = ["fp_line", "fp_arc", "fp_circle", "fp_poly", "fp_rect", "fp_text"];
  for (const tag of drawingTags) {
    const drawings = findChildren(fp, tag);
    for (const d of drawings) {
      const dLayer = getLayer(d);
      if (dLayer === "F.SilkS") setLayer(d, "B.SilkS");
      else if (dLayer === "B.SilkS") setLayer(d, "F.SilkS");
      else if (dLayer === "F.Fab") setLayer(d, "B.Fab");
      else if (dLayer === "B.Fab") setLayer(d, "F.Fab");
    }
  }
}

// ── Courtyard / overlap helpers ───────────────────────────────────

export interface BBoxRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Extract the courtyard bounding box of a footprint in board-space.
 * Looks for fp_rect on F.CrtYd or B.CrtYd layers.
 * Returns null if no courtyard rect exists — footprints without a courtyard
 * (e.g. Arduino shields) allow other components to be placed inside them.
 */
export function getFootprintCourtyard(fp: List): BBoxRect | null {
  const at = getAt(fp);
  if (!at) return null;

  const rot = at.rotation ?? 0;

  // Look for fp_rect on CrtYd layer
  const rects = findChildren(fp, "fp_rect");
  for (const rect of rects) {
    const layer = getLayer(rect);
    if (layer === "F.CrtYd" || layer === "B.CrtYd") {
      const startNode = findChild(rect, "start");
      const endNode = findChild(rect, "end");
      if (startNode && endNode) {
        const sx = typeof startNode[1] === "number" ? startNode[1] : 0;
        const sy = typeof startNode[2] === "number" ? startNode[2] : 0;
        const ex = typeof endNode[1] === "number" ? endNode[1] : 0;
        const ey = typeof endNode[2] === "number" ? endNode[2] : 0;

        // Rotate all 4 corners by footprint rotation, then compute axis-aligned bbox
        const rad = (rot * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const corners = [
          { x: sx * cos - sy * sin, y: sx * sin + sy * cos },
          { x: ex * cos - sy * sin, y: ex * sin + sy * cos },
          { x: ex * cos - ey * sin, y: ex * sin + ey * cos },
          { x: sx * cos - ey * sin, y: sx * sin + ey * cos },
        ];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const c of corners) {
          minX = Math.min(minX, c.x);
          minY = Math.min(minY, c.y);
          maxX = Math.max(maxX, c.x);
          maxY = Math.max(maxY, c.y);
        }
        return {
          x1: at.x + minX,
          y1: at.y + minY,
          x2: at.x + maxX,
          y2: at.y + maxY,
        };
      }
    }
  }

  // No courtyard rect found — this footprint has no placement restriction.
  return null;
}

/**
 * Check if two bounding boxes overlap.
 */
export function bboxOverlaps(a: BBoxRect, b: BBoxRect): boolean {
  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
}

/**
 * Check if moving a footprint to a new position would cause courtyard overlap
 * with any other footprint in the board.
 * Returns the ref of the first overlapping footprint, or null if no overlap.
 */
export function checkCourtyardOverlap(
  tree: List,
  movedRef: string,
  newX: number,
  newY: number,
): string | null {
  // Get moved footprint's courtyard at new position
  const movedFp = findFootprintByRef(tree, movedRef);
  if (!movedFp) return null;

  const movedCy = getFootprintCourtyard(movedFp);
  if (!movedCy) return null;

  // Recompute courtyard at new position
  const currentAt = getAt(movedFp);
  if (!currentAt) return null;
  const dx = newX - currentAt.x;
  const dy = newY - currentAt.y;
  const movedBox: BBoxRect = {
    x1: movedCy.x1 + dx,
    y1: movedCy.y1 + dy,
    x2: movedCy.x2 + dx,
    y2: movedCy.y2 + dy,
  };

  // Check against all other footprints
  const footprints = findChildren(tree, "footprint");
  for (const fp of footprints) {
    const ref = getFootprintRef(fp);
    if (ref === movedRef) continue;

    const otherCy = getFootprintCourtyard(fp);
    if (!otherCy) continue;

    if (bboxOverlaps(movedBox, otherCy)) {
      return ref;
    }
  }

  return null;
}

// ── Edge.Cuts helpers ────────────────────────────────────────────

/**
 * Remove all Edge.Cuts graphical items (gr_line, gr_arc, gr_rect, gr_poly)
 * and insert new ones.
 */
export function replaceEdgeCuts(tree: List, newEdgeCutNodes: List[]): void {
  const edgeCutsTags = ["gr_line", "gr_arc", "gr_rect", "gr_poly"];
  for (const tag of edgeCutsTags) {
    removeChildren(tree, tag, (child) => {
      const layer = getLayer(child);
      return layer === "Edge.Cuts";
    });
  }
  for (const node of newEdgeCutNodes) {
    appendChild(tree, node);
  }
}
