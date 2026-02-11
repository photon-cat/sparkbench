import React, { useState, useCallback } from "react";
import type { EditorState, EditorAction } from "../state/editor-state";
import type { SchSymbol, SimTag } from "../types";

interface JsonPanelProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

export const JsonPanel: React.FC<JsonPanelProps> = ({ state, dispatch }) => {
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [copied, setCopied] = useState(false);

  const exportJson = useCallback(() => {
    const output: Record<string, unknown> = {
      primitives: state.symbol.primitives,
      ports: state.symbol.ports,
      center: state.symbol.center,
      size: state.symbol.size,
    };
    if (Object.keys(state.simTags).length > 0) {
      output.simTags = state.simTags;
    }
    return JSON.stringify(output, null, 2);
  }, [state.symbol, state.simTags]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(exportJson());
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [exportJson]);

  const handleImport = useCallback(() => {
    try {
      const parsed = JSON.parse(importText);
      const symbol: SchSymbol = {
        primitives: parsed.primitives ?? [],
        ports: parsed.ports ?? [],
        center: parsed.center ?? { x: 0, y: 0 },
        size: parsed.size ?? { width: 1, height: 1 },
      };
      const simTags: Record<number, SimTag> = parsed.simTags ?? {};
      dispatch({ type: "LOAD_SYMBOL", symbol, simTags });
      setShowImport(false);
      setImportText("");
    } catch {
      alert("Invalid JSON");
    }
  }, [importText, dispatch]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        JSON
        <div style={styles.btnGroup}>
          <button onClick={handleCopy} style={styles.btn}>
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={() => setShowImport(!showImport)} style={styles.btn}>
            {showImport ? "Cancel" : "Import"}
          </button>
        </div>
      </div>

      {showImport ? (
        <div style={styles.importArea}>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste SchSymbol JSON here..."
            style={styles.textarea}
          />
          <button onClick={handleImport} style={{ ...styles.btn, width: "100%", marginTop: 4 }}>
            Load
          </button>
        </div>
      ) : (
        <textarea readOnly value={exportJson()} style={styles.textarea} />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: "1px solid #333",
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    flex: 1,
  },
  header: {
    padding: "8px 12px",
    fontWeight: 600,
    fontSize: 12,
    color: "#eee",
    borderBottom: "1px solid #333",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  btnGroup: {
    display: "flex",
    gap: 4,
  },
  btn: {
    background: "#333",
    color: "#eee",
    border: "1px solid #555",
    borderRadius: 3,
    padding: "2px 8px",
    fontSize: 10,
    cursor: "pointer",
  },
  importArea: {
    padding: 8,
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  textarea: {
    flex: 1,
    minHeight: 80,
    background: "#1a1a1a",
    color: "#8f8",
    border: "1px solid #333",
    borderRadius: 3,
    padding: 8,
    fontFamily: "monospace",
    fontSize: 10,
    resize: "none",
  },
};
