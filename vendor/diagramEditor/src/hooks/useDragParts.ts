import { useCallback, useRef, MutableRefObject } from "react";
import { UNIT_PX } from "../lib/constants";

export interface UseDragPartsOptions {
  onPartMove?: (partId: string, top: number, left: number) => void;
  onPartSelect?: (partId: string) => void;
  zoomRef: MutableRefObject<number>;
}

export function useDragParts({ onPartMove, onPartSelect, zoomRef }: UseDragPartsOptions) {
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
  } | null>(null);

  const attachDragHandlers = useCallback((wrapper: HTMLElement, partId: string) => {
    wrapper.style.cursor = "pointer";

    wrapper.addEventListener("pointerdown", (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const currentTop = parseFloat(wrapper.style.top) || 0;
      const currentLeft = parseFloat(wrapper.style.left) || 0;

      dragRef.current = {
        wrapper,
        partId,
        startX: e.clientX,
        startY: e.clientY,
        origTop: currentTop,
        origLeft: currentLeft,
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

      // FIX: Snap the delta, not the absolute position.
      // This prevents parts at non-grid positions from jumping on drag start.
      const snappedDx = Math.round(dx / UNIT_PX) * UNIT_PX;
      const snappedDy = Math.round(dy / UNIT_PX) * UNIT_PX;
      wrapper.style.left = `${drag.origLeft + snappedDx}px`;
      wrapper.style.top = `${drag.origTop + snappedDy}px`;
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
        // Actual drag — snap final position to grid
        const finalLeft = Math.round((drag.origLeft + dx) / UNIT_PX) * UNIT_PX;
        const finalTop = Math.round((drag.origTop + dy) / UNIT_PX) * UNIT_PX;
        onPartMoveRef.current?.(partId, finalTop, finalLeft);
      } else {
        // Click without drag — select the part
        onPartSelectRef.current?.(partId);
      }
    });
  }, [zoomRef]);

  return { attachDragHandlers };
}
