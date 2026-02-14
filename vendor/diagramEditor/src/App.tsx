import { useState, useCallback, useEffect } from "react";
import type { Diagram, DiagramPart, DiagramConnection } from "./lib/diagram-types";
import { importWokwi, exportToWokwi } from "./lib/diagram-io";
import { useUndoRedo } from "./hooks/useUndoRedo";
import type { ToolType } from "./hooks/useWireDrawing";
import DiagramCanvas from "./components/DiagramCanvas";
import Toolbar from "./components/Toolbar";
import ToolPalette from "./components/ToolPalette";
import PartCatalog from "./components/PartCatalog";
import PartAttributePanel from "./components/PartAttributePanel";
import WireAttributePanel from "./components/WireAttributePanel";
import EXAMPLE_DIAGRAM from "../diagram.json";

const DEFAULT_DIAGRAM: Diagram = importWokwi(EXAMPLE_DIAGRAM);

let partCounter = 1;

function generatePartId(type: string): string {
  const base = type.replace("wokwi-", "").replace(/-/g, "");
  return `${base}${partCounter++}`;
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

  // Initialize part counter from existing diagram
  useEffect(() => {
    let max = 0;
    for (const p of diagram.parts) {
      const match = p.id.match(/(\d+)$/);
      if (match) max = Math.max(max, parseInt(match[1], 10));
    }
    partCounter = max + 1;
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

        <ToolPalette activeTool={activeTool} onToolChange={setActiveTool} />

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
