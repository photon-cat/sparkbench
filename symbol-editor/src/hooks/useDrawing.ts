import { useCallback } from "react";
import type { Point, Primitive, Port, Tool, DrawingState } from "../types";
import type { EditorAction } from "../state/editor-state";

interface UseDrawingOpts {
  activeTool: Tool;
  drawingState: DrawingState | null;
  dispatch: React.Dispatch<EditorAction>;
  snapPoint: (p: Point) => Point;
}

export function useDrawing({ activeTool, drawingState, dispatch, snapPoint }: UseDrawingOpts) {
  const handleCanvasClick = useCallback(
    (symbolPt: Point, e: React.PointerEvent) => {
      const pt = snapPoint(symbolPt);

      switch (activeTool) {
        case "path": {
          if (drawingState?.tool === "path") {
            // Add point to existing path
            dispatch({
              type: "SET_DRAWING",
              drawing: { tool: "path", points: [...drawingState.points, pt] },
            });
          } else {
            // Start new path
            dispatch({
              type: "SET_DRAWING",
              drawing: { tool: "path", points: [pt] },
            });
          }
          break;
        }

        case "circle": {
          if (!drawingState) {
            dispatch({
              type: "SET_DRAWING",
              drawing: { tool: "circle", start: pt, current: pt },
            });
          }
          break;
        }

        case "box": {
          if (!drawingState) {
            dispatch({
              type: "SET_DRAWING",
              drawing: { tool: "box", start: pt, current: pt },
            });
          }
          break;
        }

        case "text": {
          const text = prompt("Text content:", "{REF}");
          if (text) {
            const prim: Primitive = {
              type: "text",
              text,
              x: pt.x,
              y: pt.y,
              fontSize: 0.1,
              anchor: "middle",
              color: "#000",
            };
            dispatch({ type: "ADD_PRIMITIVE", primitive: prim });
          }
          break;
        }

        case "port": {
          const labelStr = prompt("Port labels (comma-separated):", "1");
          if (labelStr !== null) {
            const labels = labelStr
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean);
            const port: Port = { x: pt.x, y: pt.y, labels };
            dispatch({ type: "ADD_PORT", port });
          }
          break;
        }

        case "select": {
          // Selection is handled in Canvas directly
          break;
        }
      }
      void e;
    },
    [activeTool, drawingState, dispatch, snapPoint]
  );

  const handleCanvasMove = useCallback(
    (symbolPt: Point) => {
      const pt = snapPoint(symbolPt);
      if (!drawingState) return;
      if (drawingState.tool === "circle" || drawingState.tool === "box") {
        dispatch({
          type: "SET_DRAWING",
          drawing: { ...drawingState, current: pt },
        });
      }
    },
    [drawingState, dispatch, snapPoint]
  );

  const handleCanvasDoubleClick = useCallback(() => {
    if (activeTool === "path" && drawingState?.tool === "path") {
      if (drawingState.points.length >= 2) {
        const prim: Primitive = {
          type: "path",
          points: drawingState.points,
          color: "#000",
          fill: false,
          closed: false,
        };
        dispatch({ type: "ADD_PRIMITIVE", primitive: prim });
      }
      dispatch({ type: "SET_DRAWING", drawing: null });
    }
  }, [activeTool, drawingState, dispatch]);

  const handleCanvasPointerUp = useCallback(
    (symbolPt: Point) => {
      const pt = snapPoint(symbolPt);
      if (!drawingState) return;

      if (drawingState.tool === "circle") {
        const r = Math.sqrt(
          (pt.x - drawingState.start.x) ** 2 + (pt.y - drawingState.start.y) ** 2
        );
        if (r > 0.005) {
          const prim: Primitive = {
            type: "circle",
            x: drawingState.start.x,
            y: drawingState.start.y,
            radius: Math.round(r * 100) / 100,
            color: "#000",
            fill: false,
          };
          dispatch({ type: "ADD_PRIMITIVE", primitive: prim });
        }
        dispatch({ type: "SET_DRAWING", drawing: null });
      }

      if (drawingState.tool === "box") {
        const x = Math.min(drawingState.start.x, pt.x);
        const y = Math.min(drawingState.start.y, pt.y);
        const w = Math.abs(pt.x - drawingState.start.x);
        const h = Math.abs(pt.y - drawingState.start.y);
        if (w > 0.005 && h > 0.005) {
          const prim: Primitive = {
            type: "box",
            x,
            y,
            width: Math.round(w * 100) / 100,
            height: Math.round(h * 100) / 100,
            color: "#000",
            fill: false,
          };
          dispatch({ type: "ADD_PRIMITIVE", primitive: prim });
        }
        dispatch({ type: "SET_DRAWING", drawing: null });
      }
    },
    [drawingState, dispatch, snapPoint]
  );

  const finishPath = useCallback(() => {
    if (drawingState?.tool === "path" && drawingState.points.length >= 2) {
      const prim: Primitive = {
        type: "path",
        points: drawingState.points,
        color: "#000",
        fill: false,
        closed: false,
      };
      dispatch({ type: "ADD_PRIMITIVE", primitive: prim });
    }
    dispatch({ type: "SET_DRAWING", drawing: null });
  }, [drawingState, dispatch]);

  const cancelDrawing = useCallback(() => {
    dispatch({ type: "SET_DRAWING", drawing: null });
  }, [dispatch]);

  return {
    handleCanvasClick,
    handleCanvasMove,
    handleCanvasDoubleClick,
    handleCanvasPointerUp,
    finishPath,
    cancelDrawing,
  };
}
