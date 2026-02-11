import { useCallback, useRef } from "react";
import type { Viewport } from "../types";
import type { EditorAction } from "../state/editor-state";

export function useViewport(
  viewport: Viewport,
  dispatch: React.Dispatch<EditorAction>
) {
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const onWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cw = rect.width;
      const ch = rect.height;

      // Mouse position in symbol space before zoom
      const symX = (mx - cw / 2) / viewport.zoom + viewport.offsetX;
      const symY = (my - ch / 2) / viewport.zoom + viewport.offsetY;

      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(50, Math.min(5000, viewport.zoom * factor));

      // Adjust offset so the symbol point under cursor stays fixed
      const newOffsetX = symX - (mx - cw / 2) / newZoom;
      const newOffsetY = symY - (my - ch / 2) / newZoom;

      dispatch({
        type: "SET_VIEWPORT",
        viewport: { offsetX: newOffsetX, offsetY: newOffsetY, zoom: newZoom },
      });
    },
    [viewport, dispatch]
  );

  const startPan = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        isPanning.current = true;
        panStart.current = {
          x: e.clientX,
          y: e.clientY,
          ox: viewport.offsetX,
          oy: viewport.offsetY,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [viewport]
  );

  const movePan = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!isPanning.current) return false;
      const dx = (e.clientX - panStart.current.x) / viewport.zoom;
      const dy = (e.clientY - panStart.current.y) / viewport.zoom;
      dispatch({
        type: "SET_VIEWPORT",
        viewport: {
          ...viewport,
          offsetX: panStart.current.ox - dx,
          offsetY: panStart.current.oy - dy,
        },
      });
      return true;
    },
    [viewport, dispatch]
  );

  const endPan = useCallback(() => {
    isPanning.current = false;
  }, []);

  return { onWheel, startPan, movePan, endPan, isPanning };
}
