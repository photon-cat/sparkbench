import React from "react";
import { useEditorState } from "./state/editor-state";
import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { PropertyPanel } from "./components/PropertyPanel";
import { PrimitiveList } from "./components/PrimitiveList";
import { PreviewPanel } from "./components/PreviewPanel";
import { SimPreview } from "./components/SimPreview";
import { JsonPanel } from "./components/JsonPanel";

export const App: React.FC = () => {
  const { state, dispatch, snapPoint } = useEditorState();

  return (
    <div style={styles.root}>
      {/* Left: Toolbar */}
      <Toolbar activeTool={state.activeTool} gridSnap={state.gridSnap} dispatch={dispatch} />

      {/* Center-left: Primitive list */}
      <PrimitiveList state={state} dispatch={dispatch} />

      {/* Center: Canvas */}
      <div style={styles.canvasArea}>
        <Canvas state={state} dispatch={dispatch} snapPoint={snapPoint} />
      </div>

      {/* Right: Panels */}
      <div style={styles.rightPanel}>
        <PropertyPanel state={state} dispatch={dispatch} />
        <PreviewPanel symbol={state.symbol} />
        <SimPreview symbol={state.symbol} simTags={state.simTags} />
        <JsonPanel state={state} dispatch={dispatch} />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    width: "100%",
    height: "100%",
  },
  canvasArea: {
    flex: 1,
    minWidth: 0,
    position: "relative",
  },
  rightPanel: {
    width: 260,
    flexShrink: 0,
    background: "#1e1e1e",
    display: "flex",
    flexDirection: "column",
    overflow: "auto",
    borderLeft: "1px solid #333",
  },
};
