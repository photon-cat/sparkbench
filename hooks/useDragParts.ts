"use client";

import { useCallback, useRef, MutableRefObject } from "react";

const UNIT_PX = 9.6; // 0.1 inch in CSS pixels (96 dpi)
function snapToGrid(v: number): number {
  return Math.round(v / UNIT_PX) * UNIT_PX;
}

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
    wrapper.style.cursor = "grab";

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
      wrapper.style.cursor = "grabbing";
      wrapper.style.zIndex = "100";
    });

    wrapper.addEventListener("pointermove", (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.wrapper !== wrapper) return;

      const zoom = zoomRef.current;
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;

      wrapper.style.left = `${snapToGrid(drag.origLeft + dx)}px`;
      wrapper.style.top = `${snapToGrid(drag.origTop + dy)}px`;
    });

    wrapper.addEventListener("pointerup", (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.wrapper !== wrapper) return;

      const zoom = zoomRef.current;
      const dx = (e.clientX - drag.startX) / zoom;
      const dy = (e.clientY - drag.startY) / zoom;

      wrapper.releasePointerCapture(e.pointerId);
      wrapper.style.cursor = "grab";
      wrapper.style.zIndex = "1";
      dragRef.current = null;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        // Actual drag — report move
        onPartMoveRef.current?.(
          partId,
          snapToGrid(drag.origTop + dy),
          snapToGrid(drag.origLeft + dx),
        );
      } else {
        // Click without drag — select the part
        onPartSelectRef.current?.(partId);
      }
    });
  }, [zoomRef]);

  return { attachDragHandlers };
}
