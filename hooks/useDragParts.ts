import { useCallback, useRef, MutableRefObject } from "react";
import { UNIT_PX, FINE_UNIT_PX, getSnapMode, type SnapMode } from "@/lib/constants";

export interface UseDragPartsOptions {
  onPartMove?: (partId: string, top: number, left: number) => void;
  onPartSelect?: (partId: string) => void;
  zoomRef: MutableRefObject<number>;
  lockedRef?: MutableRefObject<boolean>;
}

/**
 * Get the first pin's offset from the part wrapper origin.
 * This is used as the "anchor" so that snapping aligns a real pin to the grid
 * rather than the arbitrary top-left corner of the component SVG.
 */
function getAnchorPinOffset(wrapper: HTMLElement): { px: number; py: number } {
  const el = wrapper.firstElementChild as any;
  const pins = el?.pinInfo;
  if (pins && pins.length > 0) {
    return { px: pins[0].x, py: pins[0].y };
  }
  return { px: 0, py: 0 };
}

/**
 * Snap a part position so that its anchor pin lands on a grid point.
 * anchorPos = partPos + pinOffset → snap anchorPos → partPos = snapped - pinOffset
 */
function snapPartPos(partPos: number, pinOffset: number, mode: SnapMode): number {
  if (mode === "none") return partPos;
  const step = mode === "fine" ? FINE_UNIT_PX : UNIT_PX;
  const anchorPos = partPos + pinOffset;
  const snappedAnchor = Math.round(anchorPos / step) * step;
  return snappedAnchor - pinOffset;
}

export function useDragParts({ onPartMove, onPartSelect, zoomRef, lockedRef }: UseDragPartsOptions) {
  const onPartMoveRef = useRef(onPartMove);
  onPartMoveRef.current = onPartMove;
  const onPartSelectRef = useRef(onPartSelect);
  onPartSelectRef.current = onPartSelect;

  const dragRef = useRef<{
    wrapper: HTMLElement;
    partId: string;
    startX: number;
    startY: number;
    origTop: number;
    origLeft: number;
    pinOffsetX: number;
    pinOffsetY: number;
  } | null>(null);

  const attachDragHandlers = useCallback((wrapper: HTMLElement, partId: string) => {
    wrapper.style.cursor = "pointer";

    wrapper.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (lockedRef?.current) return;
      e.stopPropagation();

      const currentTop = parseFloat(wrapper.style.top) || 0;
      const currentLeft = parseFloat(wrapper.style.left) || 0;
      const anchor = getAnchorPinOffset(wrapper);

      dragRef.current = {
        wrapper,
        partId,
        startX: e.clientX,
        startY: e.clientY,
        origTop: currentTop,
        origLeft: currentLeft,
        pinOffsetX: anchor.px,
        pinOffsetY: anchor.py,
      };

      wrapper.setPointerCapture(e.pointerId);
      wrapper.style.cursor = "move";
      wrapper.style.zIndex = "100";
    });

    wrapper.addEventListener("pointermove", (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.wrapper !== wrapper) return;

      const zoom = zoomRef.current;
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;

      const mode = getSnapMode(e);
      const rawLeft = drag.origLeft + dx;
      const rawTop = drag.origTop + dy;
      const snappedLeft = snapPartPos(rawLeft, drag.pinOffsetX, mode);
      const snappedTop = snapPartPos(rawTop, drag.pinOffsetY, mode);
      wrapper.style.left = `${snappedLeft}px`;
      wrapper.style.top = `${snappedTop}px`;
    });

    wrapper.addEventListener("pointerup", (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.wrapper !== wrapper) return;

      const zoom = zoomRef.current;
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;

      wrapper.releasePointerCapture(e.pointerId);
      wrapper.style.cursor = "pointer";
      wrapper.style.zIndex = "1";
      dragRef.current = null;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        const mode = getSnapMode(e);
        const rawLeft = drag.origLeft + dx;
        const rawTop = drag.origTop + dy;
        const finalLeft = snapPartPos(rawLeft, drag.pinOffsetX, mode);
        const finalTop = snapPartPos(rawTop, drag.pinOffsetY, mode);
        onPartMoveRef.current?.(partId, finalTop, finalLeft);
      } else {
        onPartSelectRef.current?.(partId);
      }
    });
  }, [zoomRef]);

  return { attachDragHandlers };
}
