import { useState, useCallback, useEffect, useRef } from "react";
import type { Diagram, DiagramPart, DiagramConnection } from "./lib/diagram-types";
import { importWokwi, exportToWokwi } from "./lib/diagram-io";
import { useUndoRedo } from "./hooks/useUndoRedo";
import type { ToolType } from "./hooks/useWireDrawing";
import DiagramCanvas from "./components/DiagramCanvas";
import Toolbar from "./components/Toolbar";
import PartCatalog from "./components/PartCatalog";
import PartAttributePanel from "./components/PartAttributePanel";
import WireAttributePanel from "./components/WireAttributePanel";
import EXAMPLE_DIAGRAM from "../diagram.json";

const DEFAULT_DIAGRAM: Diagram = importWokwi(EXAMPLE_DIAGRAM);

// Per-prefix counters for generating unique IDs
const prefixCounters: Record<string, number> = {};

// Short prefix overrides for types where the generic name is too long
const SHORT_PREFIX: Record<string, string> = {
  "wokwi-pushbutton": "btn",
  "wokwi-pushbutton-6mm": "btn",
  "wokwi-resistor": "r",
  "wokwi-clock-generator": "clk",
  "wokwi-junction": "j",
};

/** Derive a short ID prefix from the part type. */
function typeToPrefix(type: string): string {
  if (SHORT_PREFIX[type]) return SHORT_PREFIX[type];
  return type
    .replace(/^wokwi-/, "")
    .replace(/^board-/, "")
    .replace(/-\d+$/, "")  // drop trailing variant numbers (e.g. -2, -8)
    .replace(/-/g, "");
}

function generatePartId(type: string): string {
  const prefix = typeToPrefix(type);
  prefixCounters[prefix] = (prefixCounters[prefix] || 0) + 1;
  return `${prefix}${prefixCounters[prefix]}`;
}

export default function App() {
  const { state: diagram, set: setDiagram, undo, redo, canUndo, canRedo } = useUndoRedo<Diagram>(DEFAULT_DIAGRAM);
  const [activeTool, setActiveTool] = useState<ToolType>("cursor");
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedWireIdx, setSelectedWireIdx] = useState<number | null>(null);
  const [showPartCatalog, setShowPartCatalog] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [placingPartId, setPlacingPartId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize per-prefix counters from existing diagram parts
  useEffect(() => {
    for (const p of diagram.parts) {
      const match = p.id.match(/^([a-zA-Z_]+)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10);
        prefixCounters[prefix] = Math.max(prefixCounters[prefix] || 0, num);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Part mutations
  const handlePartMove = useCallback((partId: string, top: number, left: number) => {
    setDiagram({
      ...diagram,
      parts: diagram.parts.map((p) =>
        p.id === partId ? { ...p, top, left } : p
      ),
    });
  }, [diagram, setDiagram]);

  const handlePartRotate = useCallback((partId: string, angle: number) => {
    setDiagram({
      ...diagram,
      parts: diagram.parts.map((p) =>
        p.id === partId ? { ...p, rotate: ((p.rotate || 0) + angle) % 360 } : p
      ),
    });
  }, [diagram, setDiagram]);

  const handleDeletePart = useCallback((partId: string) => {
    setDiagram({
      ...diagram,
      parts: diagram.parts.filter((p) => p.id !== partId),
      connections: diagram.connections.filter(
        (c) => !c[0].startsWith(partId + ":") && !c[1].startsWith(partId + ":")
      ),
    });
    setSelectedPartId(null);
  }, [diagram, setDiagram]);

  const handleDuplicatePart = useCallback((partId: string) => {
    const part = diagram.parts.find((p) => p.id === partId);
    if (!part) return;
    const newId = generatePartId(part.type);
    const newPart: DiagramPart = {
      ...part,
      id: newId,
      top: part.top + 20,
      left: part.left + 20,
    };
    setDiagram({
      ...diagram,
      parts: [...diagram.parts, newPart],
    });
    setSelectedPartId(newId);
  }, [diagram, setDiagram]);

  const handlePartAttrChange = useCallback((attr: string, value: string) => {
    if (!selectedPartId) return;
    setDiagram({
      ...diagram,
      parts: diagram.parts.map((p) => {
        if (p.id !== selectedPartId) return p;
        if (attr === "__value") return { ...p, value };
        return { ...p, attrs: { ...p.attrs, [attr]: value } };
      }),
    });
  }, [diagram, setDiagram, selectedPartId]);

  const handleAddPart = useCallback((type: string) => {
    const id = generatePartId(type);
    const newPart: DiagramPart = {
      type,
      id,
      top: 0,
      left: 0,
      attrs: {},
    };
    setDiagram({
      ...diagram,
      parts: [...diagram.parts, newPart],
    });
    setShowPartCatalog(false);
    setPlacingPartId(id);
    setSelectedPartId(null);
  }, [diagram, setDiagram]);

  // Wire mutations
  const handleAddConnection = useCallback((conn: DiagramConnection) => {
    setDiagram({
      ...diagram,
      connections: [...diagram.connections, conn],
    });
  }, [diagram, setDiagram]);

  const handleUpdateConnection = useCallback((index: number, conn: DiagramConnection) => {
    setDiagram({
      ...diagram,
      connections: diagram.connections.map((c, i) => i === index ? conn : c),
    });
  }, [diagram, setDiagram]);

  const handleDeleteConnection = useCallback((index: number) => {
    setDiagram({
      ...diagram,
      connections: diagram.connections.filter((_, i) => i !== index),
    });
    setSelectedWireIdx(null);
  }, [diagram, setDiagram]);

  const handleWireColorChange = useCallback((index: number, color: string) => {
    setDiagram({
      ...diagram,
      connections: diagram.connections.map((c, i) =>
        i === index ? [c[0], c[1], color, c[3]] : c
      ),
    });
  }, [diagram, setDiagram]);

  // Save
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const exported = exportToWokwi(diagram);
      const res = await fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(exported),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.error("Failed to save diagram:", err);
    } finally {
      setIsSaving(false);
    }
  }, [diagram]);

  // Import diagram.json from file
  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const json = JSON.parse(reader.result as string);
          const imported = importWokwi(json);
          setDiagram(imported);
          setSelectedPartId(null);
          setSelectedWireIdx(null);
          // Re-init prefix counters from imported parts
          for (const p of imported.parts) {
            const match = p.id.match(/^([a-zA-Z_]+)(\d+)$/);
            if (match) {
              const prefix = match[1];
              const num = parseInt(match[2], 10);
              prefixCounters[prefix] = Math.max(prefixCounters[prefix] || 0, num);
            }
          }
        } catch (err) {
          console.error("Failed to import diagram:", err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [setDiagram]);

  // Export diagram.json as download
  const handleExport = useCallback(() => {
    const exported = exportToWokwi(diagram);
    const json = JSON.stringify(exported, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [diagram]);

  // Copy/Paste via native clipboard events — no permission prompt, Wokwi-compatible format
  const diagramRef = useRef(diagram);
  diagramRef.current = diagram;
  const selectedPartIdRef = useRef(selectedPartId);
  selectedPartIdRef.current = selectedPartId;

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const pid = selectedPartIdRef.current;
      if (!pid) return;
      const diag = diagramRef.current;
      const parts = diag.parts.filter((p) => p.id === pid);
      if (parts.length === 0) return;

      const partIds = new Set(parts.map((p: DiagramPart) => p.id));
      const connections = diag.connections.filter((c: DiagramConnection) => {
        const fromId = c[0].split(":")[0];
        const toId = c[1].split(":")[0];
        return partIds.has(fromId) && partIds.has(toId);
      });

      // Match Wokwi clipboard format
      const payload = JSON.stringify({
        version: 1,
        author: diag.author || "",
        editor: "wokwi",
        parts: parts.map((p: DiagramPart) => ({
          type: p.type,
          id: p.id,
          top: p.top,
          left: p.left,
          rotate: p.rotate ?? 0,
          hide: false,
          attrs: p.attrs || {},
        })),
        connections,
        dependencies: {},
      });

      e.preventDefault();
      e.clipboardData?.setData("text/plain", payload);
    };

    const handlePaste = (e: ClipboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const text = e.clipboardData?.getData("text/plain");
      if (!text) return;

      let parsed: { parts?: any[]; connections?: DiagramConnection[] };
      try {
        parsed = JSON.parse(text);
      } catch {
        return;
      }
      if (!parsed.parts || !Array.isArray(parsed.parts) || parsed.parts.length === 0) return;

      e.preventDefault();

      const diag = diagramRef.current;
      const idMap = new Map<string, string>();
      const newParts: DiagramPart[] = [];
      for (const p of parsed.parts as any[]) {
        const newId = generatePartId(p.type);
        idMap.set(p.id, newId);
        newParts.push({
          type: p.type,
          id: newId,
          top: (p.top ?? 0) + 30,
          left: (p.left ?? 0) + 30,
          rotate: p.rotate || undefined,
          attrs: p.attrs || {},
          value: p.value,
        });
      }

      const newConns: DiagramConnection[] = [];
      if (parsed.connections) {
        for (const c of parsed.connections) {
          const fromParts = c[0].split(":");
          const toParts = c[1].split(":");
          const newFrom = idMap.get(fromParts[0]);
          const newTo = idMap.get(toParts[0]);
          if (newFrom && newTo) {
            newConns.push([
              `${newFrom}:${fromParts.slice(1).join(":")}`,
              `${newTo}:${toParts.slice(1).join(":")}`,
              c[2],
              c[3],
            ]);
          }
        }
      }

      setDiagram({
        ...diag,
        parts: [...diag.parts, ...newParts],
        connections: [...diag.connections, ...newConns],
      });
      if (newParts.length === 1) {
        setSelectedPartId(newParts[0].id);
      }
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [setDiagram]);

  // Keyboard shortcuts handled at app level
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
        return;
      }
      if (e.key === "a" || e.key === "A") {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          setShowPartCatalog((v) => !v);
        }
      } else if (e.key === "g" || e.key === "G") {
        if (!e.ctrlKey && !e.metaKey) {
          setShowGrid((v) => !v);
        }
      } else if (e.key === "=" || e.key === "+") {
        // Zoom in handled by toolbar callback
      } else if (e.key === "-" || e.key === "_") {
        // Zoom out handled by toolbar callback
      } else if (e.key === "z" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.key === "y" && (e.ctrlKey || e.metaKey)) || (e.key === "z" && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo, handleSave]);

  const selectedPart = selectedPartId ? diagram.parts.find((p) => p.id === selectedPartId) ?? null : null;
  const selectedConnection = selectedWireIdx !== null ? diagram.connections[selectedWireIdx] : null;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Toolbar
        onAddPart={() => setShowPartCatalog((v) => !v)}
        onSave={handleSave}
        isSaving={isSaving}
        onZoomIn={() => {/* handled by canvas wheel */}}
        onZoomOut={() => {/* handled by canvas wheel */}}
        onFitToWindow={() => {/* TODO */}}
        onToggleGrid={() => setShowGrid((v) => !v)}
        showGrid={showGrid}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onImport={handleImport}
        onExport={handleExport}
      />

      <div style={{ position: "absolute", top: 44, left: 0, right: 0, bottom: 0 }}>
        <DiagramCanvas
          diagram={diagram}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onPartMove={handlePartMove}
          onAddConnection={handleAddConnection}
          onUpdateConnection={handleUpdateConnection}
          onDeleteConnection={handleDeleteConnection}
          onWireSelect={setSelectedWireIdx}
          selectedPartId={selectedPartId}
          onPartSelect={setSelectedPartId}
          onDeletePart={handleDeletePart}
          onPartRotate={handlePartRotate}
          onDuplicatePart={handleDuplicatePart}
          placingPartId={placingPartId}
          onFinishPlacing={() => setPlacingPartId(null)}
          showGrid={showGrid}
          onWireColorChange={handleWireColorChange}
        />

        {showPartCatalog && (
          <PartCatalog
            onSelect={handleAddPart}
            onClose={() => setShowPartCatalog(false)}
          />
        )}

        {selectedPart && !selectedConnection && (
          <PartAttributePanel
            part={selectedPart}
            onAttrChange={handlePartAttrChange}
            onRotate={(angle) => handlePartRotate(selectedPartId!, angle)}
            onDelete={() => handleDeletePart(selectedPartId!)}
            onClose={() => setSelectedPartId(null)}
          />
        )}

        {selectedConnection && selectedWireIdx !== null && (
          <WireAttributePanel
            connection={selectedConnection}
            connectionIndex={selectedWireIdx}
            onColorChange={handleWireColorChange}
            onDelete={handleDeleteConnection}
            onClose={() => setSelectedWireIdx(null)}
          />
        )}
      </div>
    </div>
  );
}
