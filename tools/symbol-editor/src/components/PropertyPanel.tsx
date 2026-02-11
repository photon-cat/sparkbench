import React from "react";
import type { EditorState, EditorAction } from "../state/editor-state";
import type { Primitive, PathPrimitive, CirclePrimitive, TextPrimitive, BoxPrimitive, SimTag } from "../types";

interface PropertyPanelProps {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
}

const colors = ["#000", "#f00", "#0a0", "#00f", "#f80", "#808", "#088", "#888"];

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ state, dispatch }) => {
  const { selectedIds, symbol, simTags } = state;
  const indices = Array.from(selectedIds);

  if (indices.length === 0) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>Properties</div>
        <div style={styles.empty}>Select a primitive to edit</div>
        <SymbolProps state={state} dispatch={dispatch} />
      </div>
    );
  }

  if (indices.length > 1) {
    return (
      <div style={styles.panel}>
        <div style={styles.header}>Properties</div>
        <div style={styles.empty}>{indices.length} items selected</div>
      </div>
    );
  }

  const idx = indices[0];
  const prim = symbol.primitives[idx];
  if (!prim) return null;

  const update = (p: Primitive) => dispatch({ type: "UPDATE_PRIMITIVE", index: idx, primitive: p });
  const tag = simTags[idx] ?? null;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Properties — {prim.type}</div>
      <div style={styles.body}>
        {prim.type === "path" && <PathProps prim={prim} update={update} />}
        {prim.type === "circle" && <CircleProps prim={prim} update={update} />}
        {prim.type === "text" && <TextProps prim={prim} update={update} />}
        {prim.type === "box" && <BoxProps prim={prim} update={update} />}

        <div style={styles.section}>
          <label style={styles.label}>Color</label>
          <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            {colors.map((c) => (
              <div
                key={c}
                onClick={() => update({ ...prim, color: c })}
                style={{
                  width: 20,
                  height: 20,
                  background: c,
                  border: prim.color === c ? "2px solid #0078ff" : "2px solid #444",
                  borderRadius: 3,
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
        </div>

        {"fill" in prim && (
          <div style={styles.row}>
            <label style={styles.label}>Fill</label>
            <input
              type="checkbox"
              checked={!!prim.fill}
              onChange={(e) => update({ ...prim, fill: e.target.checked })}
            />
          </div>
        )}

        <SimTagEditor index={idx} tag={tag} dispatch={dispatch} />
      </div>
    </div>
  );
};

function PathProps({ prim, update }: { prim: PathPrimitive; update: (p: Primitive) => void }) {
  return (
    <div style={styles.section}>
      <div style={styles.row}>
        <label style={styles.label}>Closed</label>
        <input
          type="checkbox"
          checked={!!prim.closed}
          onChange={(e) => update({ ...prim, closed: e.target.checked })}
        />
      </div>
      <label style={styles.label}>Points ({prim.points.length})</label>
      <div style={{ maxHeight: 200, overflow: "auto" }}>
        {prim.points.map((pt, i) => (
          <div key={i} style={{ display: "flex", gap: 4, marginBottom: 2 }}>
            <input
              type="number"
              step={0.01}
              value={pt.x}
              onChange={(e) => {
                const points = [...prim.points];
                points[i] = { ...points[i], x: parseFloat(e.target.value) || 0 };
                update({ ...prim, points });
              }}
              style={styles.numInput}
            />
            <input
              type="number"
              step={0.01}
              value={pt.y}
              onChange={(e) => {
                const points = [...prim.points];
                points[i] = { ...points[i], y: parseFloat(e.target.value) || 0 };
                update({ ...prim, points });
              }}
              style={styles.numInput}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CircleProps({ prim, update }: { prim: CirclePrimitive; update: (p: Primitive) => void }) {
  return (
    <div style={styles.section}>
      <Row label="X" value={prim.x} onChange={(v) => update({ ...prim, x: v })} />
      <Row label="Y" value={prim.y} onChange={(v) => update({ ...prim, y: v })} />
      <Row label="Radius" value={prim.radius} onChange={(v) => update({ ...prim, radius: v })} />
    </div>
  );
}

function TextProps({ prim, update }: { prim: TextPrimitive; update: (p: Primitive) => void }) {
  return (
    <div style={styles.section}>
      <div style={styles.row}>
        <label style={styles.label}>Text</label>
        <input
          type="text"
          value={prim.text}
          onChange={(e) => update({ ...prim, text: e.target.value })}
          style={styles.textInput}
        />
      </div>
      <Row label="X" value={prim.x} onChange={(v) => update({ ...prim, x: v })} />
      <Row label="Y" value={prim.y} onChange={(v) => update({ ...prim, y: v })} />
      <Row label="Font Size" value={prim.fontSize ?? 0.1} onChange={(v) => update({ ...prim, fontSize: v })} />
      <div style={styles.row}>
        <label style={styles.label}>Anchor</label>
        <select
          value={prim.anchor}
          onChange={(e) => update({ ...prim, anchor: e.target.value as "start" | "middle" | "end" })}
          style={styles.selectInput}
        >
          <option value="start">start</option>
          <option value="middle">middle</option>
          <option value="end">end</option>
        </select>
      </div>
    </div>
  );
}

function BoxProps({ prim, update }: { prim: BoxPrimitive; update: (p: Primitive) => void }) {
  return (
    <div style={styles.section}>
      <Row label="X" value={prim.x} onChange={(v) => update({ ...prim, x: v })} />
      <Row label="Y" value={prim.y} onChange={(v) => update({ ...prim, y: v })} />
      <Row label="Width" value={prim.width} onChange={(v) => update({ ...prim, width: v })} />
      <Row label="Height" value={prim.height} onChange={(v) => update({ ...prim, height: v })} />
    </div>
  );
}

function Row({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div style={styles.row}>
      <label style={styles.label}>{label}</label>
      <input
        type="number"
        step={0.01}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={styles.numInput}
      />
    </div>
  );
}

function SimTagEditor({
  index,
  tag,
  dispatch,
}: {
  index: number;
  tag: SimTag | null;
  dispatch: React.Dispatch<EditorAction>;
}) {
  const role = tag?.role ?? "none";

  return (
    <div style={styles.section}>
      <label style={styles.label}>Sim Tag</label>
      <select
        value={role}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "none") {
            dispatch({ type: "SET_SIM_TAG", index, tag: null });
          } else if (v === "glow") {
            dispatch({ type: "SET_SIM_TAG", index, tag: { role: "glow", color: "#ff0" } });
          } else if (v === "voltage-text") {
            dispatch({ type: "SET_SIM_TAG", index, tag: { role: "voltage-text" } });
          } else if (v === "current-color") {
            dispatch({ type: "SET_SIM_TAG", index, tag: { role: "current-color" } });
          } else if (v === "segment") {
            dispatch({ type: "SET_SIM_TAG", index, tag: { role: "segment", index: 0 } });
          } else if (v === "display-area") {
            dispatch({ type: "SET_SIM_TAG", index, tag: { role: "display-area" } });
          }
        }}
        style={styles.selectInput}
      >
        <option value="none">None</option>
        <option value="glow">Glow</option>
        <option value="voltage-text">Voltage Text</option>
        <option value="current-color">Current Color</option>
        <option value="segment">Segment</option>
        <option value="display-area">Display Area</option>
      </select>

      {tag?.role === "glow" && (
        <div style={styles.row}>
          <label style={styles.label}>Glow Color</label>
          <input
            type="color"
            value={tag.color}
            onChange={(e) =>
              dispatch({ type: "SET_SIM_TAG", index, tag: { role: "glow", color: e.target.value } })
            }
          />
        </div>
      )}

      {tag?.role === "segment" && (
        <div style={styles.row}>
          <label style={styles.label}>Segment #</label>
          <input
            type="number"
            min={0}
            max={7}
            value={tag.index}
            onChange={(e) =>
              dispatch({
                type: "SET_SIM_TAG",
                index,
                tag: { role: "segment", index: parseInt(e.target.value) || 0 },
              })
            }
            style={styles.numInput}
          />
        </div>
      )}
    </div>
  );
}

function SymbolProps({ state, dispatch }: { state: EditorState; dispatch: React.Dispatch<EditorAction> }) {
  const { symbol } = state;
  return (
    <div style={{ ...styles.section, marginTop: 16, paddingTop: 8, borderTop: "1px solid #333" }}>
      <label style={{ ...styles.label, fontWeight: 600 }}>Symbol Size</label>
      <Row label="Width" value={symbol.size.width} onChange={(v) => dispatch({ type: "SET_SYMBOL_SIZE", width: v, height: symbol.size.height })} />
      <Row label="Height" value={symbol.size.height} onChange={(v) => dispatch({ type: "SET_SYMBOL_SIZE", width: symbol.size.width, height: v })} />
      <label style={{ ...styles.label, fontWeight: 600, marginTop: 8 }}>Center</label>
      <Row label="X" value={symbol.center.x} onChange={(v) => dispatch({ type: "SET_SYMBOL_CENTER", center: { x: v, y: symbol.center.y } })} />
      <Row label="Y" value={symbol.center.y} onChange={(v) => dispatch({ type: "SET_SYMBOL_CENTER", center: { x: symbol.center.x, y: v } })} />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 240,
    background: "#1e1e1e",
    color: "#eee",
    flexShrink: 0,
    overflow: "auto",
    fontSize: 12,
  },
  header: {
    padding: "10px 12px",
    fontWeight: 600,
    borderBottom: "1px solid #333",
    fontSize: 13,
  },
  body: {
    padding: "8px 12px",
  },
  empty: {
    padding: "16px 12px",
    color: "#888",
    fontSize: 12,
  },
  section: {
    marginBottom: 12,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 11,
    color: "#aaa",
    minWidth: 50,
  },
  numInput: {
    width: 70,
    background: "#2d2d2d",
    color: "#eee",
    border: "1px solid #444",
    borderRadius: 3,
    padding: "2px 4px",
    fontSize: 11,
  },
  textInput: {
    flex: 1,
    background: "#2d2d2d",
    color: "#eee",
    border: "1px solid #444",
    borderRadius: 3,
    padding: "2px 4px",
    fontSize: 11,
  },
  selectInput: {
    background: "#2d2d2d",
    color: "#eee",
    border: "1px solid #444",
    borderRadius: 3,
    padding: "2px 4px",
    fontSize: 11,
    width: "100%",
  },
};
