"use client";

import { useCallback, useRef } from "react";

const MM_PX = 3.7795275591; // 1 mm in CSS pixels (96 dpi)
function snapToGrid(v: number): number {
  return Math.round(v / MM_PX) * MM_PX;
}

export interface UseDragPartsOptions {
  onPartMove?: (partId: string, top: number, left: number) => void;
}

export function useDragParts({ onPartMove }: UseDragPartsOptions) {
  const onPartMoveRef = useRef(onPartMove);
  onPartMoveRef.current = onPartMove;

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

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      wrapper.style.left = `${snapToGrid(drag.origLeft + dx)}px`;
      wrapper.style.top = `${snapToGrid(drag.origTop + dy)}px`;
    });

    wrapper.addEventListener("pointerup", (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.wrapper !== wrapper) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      wrapper.releasePointerCapture(e.pointerId);
      wrapper.style.cursor = "grab";
      wrapper.style.zIndex = "1";
      dragRef.current = null;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        onPartMoveRef.current?.(
          partId,
          snapToGrid(drag.origTop + dy),
          snapToGrid(drag.origLeft + dx),
        );
      }
    });
  }, []);

  return { attachDragHandlers };
}
