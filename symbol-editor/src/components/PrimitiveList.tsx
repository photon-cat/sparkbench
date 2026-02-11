import React from "react";
import type { EditorState, EditorAction } from "../state/editor-state";

interface PrimitiveListProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

function primLabel(prim: { type: string }, index: number): string {
  return `${index}: ${prim.type}`;
}

export const PrimitiveList: React.FC<PrimitiveListProps> = ({ state, dispatch }) => {
  const { symbol, selectedIds, simTags } = state;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        Layers ({symbol.primitives.length})
      </div>
      <div style={styles.list}>
        {symbol.primitives.map((prim, i) => {
          const selected = selectedIds.has(i);
          const tag = simTags[i];
          return (
            <div
              key={i}
              onClick={() => dispatch({ type: "SELECT", ids: new Set([i]) })}
              style={{
                ...styles.item,
                background: selected ? "#0078ff33" : "transparent",
                borderLeft: selected ? "3px solid #0078ff" : "3px solid transparent",
              }}
            >
              <span style={styles.itemLabel}>{primLabel(prim, i)}</span>
              {tag && <span style={styles.tag}>{tag.role}</span>}
              <div style={styles.actions}>
                {i > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "REORDER_PRIMITIVE", from: i, to: i - 1 });
                    }}
                    style={styles.actionBtn}
                    title="Move up"
                  >
                    ^
                  </button>
                )}
                {i < symbol.primitives.length - 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "REORDER_PRIMITIVE", from: i, to: i + 1 });
                    }}
                    style={styles.actionBtn}
                    title="Move down"
                  >
                    v
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: "REMOVE_PRIMITIVES", indices: [i] });
                  }}
                  style={{ ...styles.actionBtn, color: "#f44" }}
                  title="Delete"
                >
                  x
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {symbol.ports.length > 0 && (
        <>
          <div style={{ ...styles.header, borderTop: "1px solid #333" }}>
            Ports ({symbol.ports.length})
          </div>
          <div style={styles.list}>
            {symbol.ports.map((port, i) => (
              <div key={`p${i}`} style={styles.item}>
                <span style={styles.itemLabel}>
                  Port {i}: {port.labels.join(", ") || "(no label)"}
                </span>
                <div style={styles.actions}>
                  <button
                    onClick={() => dispatch({ type: "REMOVE_PORT", index: i })}
                    style={{ ...styles.actionBtn, color: "#f44" }}
                    title="Delete port"
                  >
                    x
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 200,
    background: "#252526",
    color: "#eee",
    flexShrink: 0,
    overflow: "auto",
    fontSize: 12,
    borderRight: "1px solid #333",
  },
  header: {
    padding: "8px 10px",
    fontWeight: 600,
    borderBottom: "1px solid #333",
    fontSize: 12,
  },
  list: {
    display: "flex",
    flexDirection: "column",
  },
  item: {
    display: "flex",
    alignItems: "center",
    padding: "4px 6px",
    cursor: "pointer",
    gap: 4,
  },
  itemLabel: {
    flex: 1,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  tag: {
    fontSize: 9,
    background: "#0078ff44",
    color: "#8cf",
    padding: "1px 4px",
    borderRadius: 3,
  },
  actions: {
    display: "flex",
    gap: 2,
  },
  actionBtn: {
    background: "transparent",
    border: "none",
    color: "#888",
    cursor: "pointer",
    padding: "0 3px",
    fontSize: 11,
    lineHeight: 1,
  },
};
