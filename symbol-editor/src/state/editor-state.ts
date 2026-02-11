import { useReducer, useCallback } from "react";
import type {
  SchSymbol,
  Tool,
  Viewport,
  DrawingState,
  SimTag,
  Primitive,
  Port,
  Point,
} from "../types";

export interface EditorState {
  symbol: SchSymbol;
  selectedIds: Set<number>;
  activeTool: Tool;
  viewport: Viewport;
  gridSnap: number;
  drawingState: DrawingState | null;
  simTags: Record<number, SimTag>;
}

const defaultSymbol: SchSymbol = {
  primitives: [],
  ports: [],
  center: { x: 0, y: 0 },
  size: { width: 1, height: 1 },
};

export const initialState: EditorState = {
  symbol: defaultSymbol,
  selectedIds: new Set(),
  activeTool: "select",
  viewport: { offsetX: 0, offsetY: 0, zoom: 400 },
  gridSnap: 0.05,
  drawingState: null,
  simTags: {},
};

export type EditorAction =
  | { type: "SET_TOOL"; tool: Tool }
  | { type: "SET_VIEWPORT"; viewport: Viewport }
  | { type: "SET_GRID_SNAP"; snap: number }
  | { type: "SET_DRAWING"; drawing: DrawingState | null }
  | { type: "ADD_PRIMITIVE"; primitive: Primitive }
  | { type: "UPDATE_PRIMITIVE"; index: number; primitive: Primitive }
  | { type: "REMOVE_PRIMITIVES"; indices: number[] }
  | { type: "MOVE_PRIMITIVES"; indices: number[]; dx: number; dy: number }
  | { type: "REORDER_PRIMITIVE"; from: number; to: number }
  | { type: "SELECT"; ids: Set<number> }
  | { type: "ADD_PORT"; port: Port }
  | { type: "UPDATE_PORT"; index: number; port: Port }
  | { type: "REMOVE_PORT"; index: number }
  | { type: "SET_SIM_TAG"; index: number; tag: SimTag | null }
  | { type: "LOAD_SYMBOL"; symbol: SchSymbol; simTags?: Record<number, SimTag> }
  | { type: "SET_SYMBOL_SIZE"; width: number; height: number }
  | { type: "SET_SYMBOL_CENTER"; center: Point };

function movePrimitive(p: Primitive, dx: number, dy: number): Primitive {
  switch (p.type) {
    case "path":
      return { ...p, points: p.points.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) };
    case "circle":
      return { ...p, x: p.x + dx, y: p.y + dy };
    case "text":
      return { ...p, x: p.x + dx, y: p.y + dy };
    case "box":
      return { ...p, x: p.x + dx, y: p.y + dy };
  }
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "SET_TOOL":
      return { ...state, activeTool: action.tool, drawingState: null };

    case "SET_VIEWPORT":
      return { ...state, viewport: action.viewport };

    case "SET_GRID_SNAP":
      return { ...state, gridSnap: action.snap };

    case "SET_DRAWING":
      return { ...state, drawingState: action.drawing };

    case "ADD_PRIMITIVE":
      return {
        ...state,
        symbol: {
          ...state.symbol,
          primitives: [...state.symbol.primitives, action.primitive],
        },
      };

    case "UPDATE_PRIMITIVE": {
      const prims = [...state.symbol.primitives];
      prims[action.index] = action.primitive;
      return { ...state, symbol: { ...state.symbol, primitives: prims } };
    }

    case "REMOVE_PRIMITIVES": {
      const removeSet = new Set(action.indices);
      const prims = state.symbol.primitives.filter((_, i) => !removeSet.has(i));
      // Remap sim tags
      const newTags: Record<number, SimTag> = {};
      let newIdx = 0;
      for (let i = 0; i < state.symbol.primitives.length; i++) {
        if (!removeSet.has(i)) {
          if (state.simTags[i]) newTags[newIdx] = state.simTags[i];
          newIdx++;
        }
      }
      return {
        ...state,
        symbol: { ...state.symbol, primitives: prims },
        selectedIds: new Set(),
        simTags: newTags,
      };
    }

    case "MOVE_PRIMITIVES": {
      const prims = [...state.symbol.primitives];
      for (const i of action.indices) {
        prims[i] = movePrimitive(prims[i], action.dx, action.dy);
      }
      return { ...state, symbol: { ...state.symbol, primitives: prims } };
    }

    case "REORDER_PRIMITIVE": {
      const prims = [...state.symbol.primitives];
      const [item] = prims.splice(action.from, 1);
      prims.splice(action.to, 0, item);
      // Remap sim tags
      const newTags: Record<number, SimTag> = {};
      const oldTags = { ...state.simTags };
      // Build index mapping
      const mapping: number[] = [];
      for (let i = 0; i < state.symbol.primitives.length; i++) mapping.push(i);
      const [moved] = mapping.splice(action.from, 1);
      mapping.splice(action.to, 0, moved);
      for (let newI = 0; newI < mapping.length; newI++) {
        const oldI = mapping[newI];
        if (oldTags[oldI]) newTags[newI] = oldTags[oldI];
      }
      return { ...state, symbol: { ...state.symbol, primitives: prims }, simTags: newTags };
    }

    case "SELECT":
      return { ...state, selectedIds: action.ids };

    case "ADD_PORT":
      return {
        ...state,
        symbol: { ...state.symbol, ports: [...state.symbol.ports, action.port] },
      };

    case "UPDATE_PORT": {
      const ports = [...state.symbol.ports];
      ports[action.index] = action.port;
      return { ...state, symbol: { ...state.symbol, ports } };
    }

    case "REMOVE_PORT": {
      const ports = state.symbol.ports.filter((_, i) => i !== action.index);
      return { ...state, symbol: { ...state.symbol, ports } };
    }

    case "SET_SIM_TAG": {
      const tags = { ...state.simTags };
      if (action.tag === null) {
        delete tags[action.index];
      } else {
        tags[action.index] = action.tag;
      }
      return { ...state, simTags: tags };
    }

    case "LOAD_SYMBOL":
      return {
        ...state,
        symbol: action.symbol,
        simTags: action.simTags ?? {},
        selectedIds: new Set(),
        drawingState: null,
      };

    case "SET_SYMBOL_SIZE":
      return {
        ...state,
        symbol: { ...state.symbol, size: { width: action.width, height: action.height } },
      };

    case "SET_SYMBOL_CENTER":
      return {
        ...state,
        symbol: { ...state.symbol, center: action.center },
      };

    default:
      return state;
  }
}

export function useEditorState() {
  const [state, dispatch] = useReducer(editorReducer, initialState);

  const snap = useCallback(
    (v: number) => {
      if (state.gridSnap <= 0) return v;
      return Math.round(v / state.gridSnap) * state.gridSnap;
    },
    [state.gridSnap]
  );

  const snapPoint = useCallback(
    (p: { x: number; y: number }) => ({ x: snap(p.x), y: snap(p.y) }),
    [snap]
  );

  return { state, dispatch, snap, snapPoint };
}
