"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Toolbar from "@/components/Toolbar";
import Workbench from "@/components/Workbench";
import { parseDiagram, type Diagram, type DiagramPart, type DiagramConnection, type DiagramLabel } from "@/lib/diagram-parser";
import { useSimulation } from "@/hooks/useSimulation";
import { fetchDiagram, fetchSketch, saveDiagram, saveSketch, fetchPCB, savePCB } from "@/lib/api";
import { importWokwi, exportToWokwi } from "@/lib/diagram-io";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();

  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [sketchCode, setSketchCode] = useState("");
  const [diagramJson, setDiagramJson] = useState("");
  const [pcbText, setPcbText] = useState<string | null>(null);
  const [projectFiles, setProjectFiles] = useState<{ name: string; content: string }[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [placingPartId, setPlacingPartId] = useState<string | null>(null);
  const [placingLabelId, setPlacingLabelId] = useState<string | null>(null);
  const labelCounterRef = useRef(1);

  const loadedRef = useRef(false);

  const {
    status,
    serialOutput,
    runner,
    handleStart,
    handleStop,
    handlePause,
    handleResume,
    handleRestart,
  } = useSimulation({ slug, diagram, sketchCode, projectFiles });

  // Load diagram and sketch on mount (or when slug changes)
  useEffect(() => {
    if (!slug) return;

    fetchDiagram(slug)
      .then((data) => {
        setDiagram(parseDiagram(data.diagram));
        setDiagramJson(JSON.stringify(data.diagram, null, 2));
        if (data.lastModified) setLastSaved(new Date(data.lastModified));
        loadedRef.current = true;
        setDirty(false);
      })
      .catch((err) => console.error("Failed to load diagram:", err));

    fetchSketch(slug)
      .then((data) => {
        setSketchCode(data.sketch || "");
        setProjectFiles(data.files || []);
      })
      .catch((err) => console.error("Failed to load sketch:", err));

    fetchPCB(slug)
      .then((data) => {
        setPcbText(data?.pcbText ?? null);
      })
      .catch((err) => console.error("Failed to load PCB:", err));
  }, [slug]);

  const handleSketchChange = useCallback((code: string) => {
    setSketchCode(code);
    if (loadedRef.current) setDirty(true);
  }, []);

  const handleAddPart = useCallback((partType: string) => {
    // Handle netlabel placement separately
    if (partType === "netlabel") {
      const id = `label-${Date.now()}`;
      const name = `NET${labelCounterRef.current++}`;
      const label: DiagramLabel = { id, name, pinRef: "", x: -9999, y: -9999 };

      setDiagram((prev) => {
        if (!prev) return prev;
        return { ...prev, labels: [...(prev.labels ?? []), label] };
      });

      setDiagramJson((prev) => {
        try {
          const obj = JSON.parse(prev);
          if (!obj.labels) obj.labels = [];
          obj.labels.push(label);
          return JSON.stringify(obj, null, 2);
        } catch {
          return prev;
        }
      });

      setPlacingLabelId(id);
      setSelectedLabelId(id);
      setSelectedPartId(null);
      setDirty(true);
      return;
    }

    const base = partType.replace(/^wokwi-/, "").replace(/-/g, "");

    const defaultAttrs: Record<string, Record<string, string>> = {
      "wokwi-led": { color: "red" },
      "wokwi-resistor": { value: "1000" },
      "wokwi-lcd1602": { pins: "i2c" },
      "wokwi-lcd2004": { pins: "i2c" },
    };
    const attrs = defaultAttrs[partType] ?? {};

    function nextId(existingIds: Set<string>) {
      let n = 1;
      while (existingIds.has(base + n)) n++;
      return base + n;
    }

    let placedId = "";

    setDiagram((prev) => {
      if (!prev) return prev;
      const id = nextId(new Set(prev.parts.map((p) => p.id)));
      placedId = id;
      const newPart: DiagramPart = { type: partType, id, top: 200, left: 200, attrs };
      return { ...prev, parts: [...prev.parts, newPart] };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (!obj.parts) obj.parts = [];
        const id = nextId(new Set(obj.parts.map((p: any) => p.id)));
        obj.parts.push({ type: partType, id, top: 200, left: 200, attrs });
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    if (placedId) {
      setPlacingPartId(placedId);
      setSelectedPartId(placedId);
    }
    setDirty(true);
  }, []);

  const handlePartMove = useCallback((partId: string, top: number, left: number) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        parts: prev.parts.map((p) =>
          p.id === partId ? { ...p, top, left } : p,
        ),
      };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (obj.parts) {
          const part = obj.parts.find((p: any) => p.id === partId);
          if (part) {
            part.top = top;
            part.left = left;
          }
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handleAddConnection = useCallback((conn: DiagramConnection) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      return { ...prev, connections: [...prev.connections, conn] };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (!obj.connections) obj.connections = [];
        obj.connections.push(conn);
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handleDeleteConnection = useCallback((index: number) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      const conns = [...prev.connections];
      conns.splice(index, 1);
      return { ...prev, connections: conns };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (obj.connections) {
          obj.connections.splice(index, 1);
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handleUpdateConnection = useCallback((index: number, conn: DiagramConnection) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      const conns = [...prev.connections];
      conns[index] = conn;
      return { ...prev, connections: conns };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (obj.connections && index < obj.connections.length) {
          obj.connections[index] = conn;
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handleWireColorChange = useCallback((index: number, color: string) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      const conns = [...prev.connections];
      if (index < conns.length) {
        const conn = [...conns[index]] as DiagramConnection;
        conn[2] = color;
        conns[index] = conn;
      }
      return { ...prev, connections: conns };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (obj.connections && index < obj.connections.length) {
          obj.connections[index][2] = color;
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handleUpdateLabel = useCallback((labelId: string, name: string) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labels: (prev.labels ?? []).map((l) =>
          l.id === labelId ? { ...l, name } : l,
        ),
      };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (obj.labels) {
          const label = obj.labels.find((l: any) => l.id === labelId);
          if (label) label.name = name;
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handleAddLabel = useCallback((label: DiagramLabel) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      return { ...prev, labels: [...(prev.labels ?? []), label] };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (!obj.labels) obj.labels = [];
        obj.labels.push(label);
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handleDiagramChange = useCallback(
    (json: string) => {
      setDiagramJson(json);
      if (loadedRef.current) setDirty(true);
      try {
        const parsed = JSON.parse(json);
        setDiagram(parseDiagram(parsed));
      } catch {
        // Invalid JSON, ignore
      }
    },
    [],
  );

  const handlePartSelect = useCallback((partId: string | null) => {
    setSelectedPartId(partId);
    if (partId) setSelectedLabelId(null);
  }, []);

  const handleLabelSelect = useCallback((labelId: string | null) => {
    setSelectedLabelId(labelId);
    if (labelId) setSelectedPartId(null);
  }, []);

  const handleDeleteLabel = useCallback((labelId: string) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      return { ...prev, labels: (prev.labels ?? []).filter((l) => l.id !== labelId) };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (obj.labels) {
          obj.labels = obj.labels.filter((l: any) => l.id !== labelId);
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setSelectedLabelId(null);
    setDirty(true);
  }, []);

  const handleMoveLabel = useCallback((labelId: string, x: number, y: number) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labels: (prev.labels ?? []).map((l) =>
          l.id === labelId ? { ...l, x, y } : l,
        ),
      };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (obj.labels) {
          const label = obj.labels.find((l: any) => l.id === labelId);
          if (label) { label.x = x; label.y = y; }
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handleDeletePart = useCallback((partId: string) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        parts: prev.parts.filter((p) => p.id !== partId),
        connections: prev.connections.filter((conn) => {
          return !conn[0].startsWith(partId + ":") && !conn[1].startsWith(partId + ":");
        }),
        labels: (prev.labels ?? []).filter((l) => !l.pinRef?.startsWith(partId + ":")),
      };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        obj.parts = (obj.parts ?? []).filter((p: any) => p.id !== partId);
        obj.connections = (obj.connections ?? []).filter((c: any) => {
          return !c[0]?.startsWith(partId + ":") && !c[1]?.startsWith(partId + ":");
        });
        if (obj.labels) {
          obj.labels = obj.labels.filter((l: any) => !l.pinRef?.startsWith(partId + ":"));
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setSelectedPartId(null);
    setDirty(true);
  }, []);

  const handlePartRotate = useCallback((partId: string, angle: number) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        parts: prev.parts.map((p) =>
          p.id === partId ? { ...p, rotate: ((p.rotate ?? 0) + angle) % 360 } : p,
        ),
      };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        const part = (obj.parts ?? []).find((p: any) => p.id === partId);
        if (part) part.rotate = ((part.rotate ?? 0) + angle) % 360;
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handlePartAttrChange = useCallback((partId: string, attr: string, value: string) => {
    // Handle first-class fields: __value and __footprint
    if (attr === "__value" || attr === "__footprint") {
      const field = attr === "__value" ? "value" : "footprint";
      setDiagram((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          parts: prev.parts.map((p) =>
            p.id === partId ? { ...p, [field]: value || undefined } : p,
          ),
        };
      });
      setDiagramJson((prev) => {
        try {
          const obj = JSON.parse(prev);
          const part = (obj.parts ?? []).find((p: any) => p.id === partId);
          if (part) {
            if (value) {
              part[field] = value;
            } else {
              delete part[field];
            }
          }
          return JSON.stringify(obj, null, 2);
        } catch {
          return prev;
        }
      });
      setDirty(true);
      return;
    }

    setDiagram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        parts: prev.parts.map((p) => {
          if (p.id !== partId) return p;
          const newAttrs = { ...p.attrs };
          if (value === "") {
            delete newAttrs[attr];
          } else {
            newAttrs[attr] = value;
          }
          return { ...p, attrs: newAttrs };
        }),
      };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        const part = (obj.parts ?? []).find((p: any) => p.id === partId);
        if (part) {
          if (!part.attrs) part.attrs = {};
          if (value === "") {
            delete part.attrs[attr];
          } else {
            part.attrs[attr] = value;
          }
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handlePcbChange = useCallback((text: string) => {
    setPcbText(text);
    if (loadedRef.current) setDirty(true);
  }, []);

  const handlePcbSave = useCallback(async (text: string) => {
    if (!slug) return;
    try {
      await savePCB(slug, text);
      setPcbText(text);
    } catch (err) {
      console.error("PCB save error:", err);
    }
  }, [slug]);

  const handleFinishPlacing = useCallback(() => {
    setPlacingPartId(null);
  }, []);

  const handleFinishPlacingLabel = useCallback(() => {
    setPlacingLabelId(null);
  }, []);

  const handlePlaceLabelAt = useCallback((labelId: string, pinRef: string, x: number, y: number) => {
    setDiagram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        labels: (prev.labels ?? []).map((l) =>
          l.id === labelId ? { ...l, pinRef, x, y } : l,
        ),
      };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (obj.labels) {
          const label = obj.labels.find((l: any) => l.id === labelId);
          if (label) { label.pinRef = pinRef; label.x = x; label.y = y; }
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handleCancelPlacingLabel = useCallback(() => {
    // Delete the temporary label
    const lid = placingLabelId;
    if (!lid) return;
    setDiagram((prev) => {
      if (!prev) return prev;
      return { ...prev, labels: (prev.labels ?? []).filter((l) => l.id !== lid) };
    });
    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (obj.labels) obj.labels = obj.labels.filter((l: any) => l.id !== lid);
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });
    setPlacingLabelId(null);
    setSelectedLabelId(null);
  }, [placingLabelId]);

  const handleInitPCB = useCallback(async () => {
    if (!diagram) return;
    // Dynamic imports to avoid SSR issues with KiCanvas window access
    const [{ extractNetlist }, { initPCBFromSchematic }, { buildKicadPCBTree }, { serializeSExpr }] = await Promise.all([
      import("@/lib/netlist"),
      import("@/lib/pcb-parser"),
      import("@/lib/kicanvas-factory"),
      import("@/lib/sexpr-serializer"),
    ]);

    const netlist = extractNetlist(diagram);
    const design = initPCBFromSchematic(diagram, netlist);
    const tree = buildKicadPCBTree(design);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const text = serializeSExpr(tree as any);

    setPcbText(text);
    if (slug) {
      await savePCB(slug, text);
    }
  }, [diagram, slug]);

  const handleSave = useCallback(async () => {
    if (!slug) return;

    try {
      const promises: Promise<void>[] = [
        saveDiagram(slug, diagramJson),
        saveSketch(slug, sketchCode),
      ];
      if (pcbText !== null) {
        promises.push(savePCB(slug, pcbText));
      }
      await Promise.all(promises);
      setLastSaved(new Date());
      setDirty(false);
    } catch (err) {
      console.error("Save error:", err);
    }
  }, [slug, diagramJson, sketchCode, pcbText]);

  const handleImportWokwi = useCallback((json: unknown) => {
    const imported = importWokwi(json);
    setDiagram(imported);
    setDiagramJson(JSON.stringify(json, null, 2));
    setDirty(true);
  }, []);

  const handleExportWokwi = useCallback(() => {
    if (!diagram) return;
    const wokwi = exportToWokwi(diagram);
    const json = JSON.stringify(wokwi, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [diagram]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar projectName={slug} onSave={handleSave} onImportWokwi={handleImportWokwi} onExportWokwi={handleExportWokwi} lastSaved={lastSaved} dirty={dirty} />
      <Workbench
        diagram={diagram}
        runner={runner}
        status={status}
        serialOutput={serialOutput}
        sketchCode={sketchCode}
        diagramJson={diagramJson}
        pcbText={pcbText}
        onStart={handleStart}
        onStop={handleStop}
        onPause={handlePause}
        onResume={handleResume}
        onRestart={handleRestart}
        onSketchChange={handleSketchChange}
        onDiagramChange={handleDiagramChange}
        onPcbChange={handlePcbChange}
        onPcbSave={handlePcbSave}
        onAddPart={handleAddPart}
        onPartMove={handlePartMove}
        onAddConnection={handleAddConnection}
        onUpdateConnection={handleUpdateConnection}
        onDeleteConnection={handleDeleteConnection}
        onWireColorChange={handleWireColorChange}
        onAddLabel={handleAddLabel}
        onUpdateLabel={handleUpdateLabel}
        onDeleteLabel={handleDeleteLabel}
        onMoveLabel={handleMoveLabel}
        selectedPartId={selectedPartId}
        selectedLabelId={selectedLabelId}
        onPartSelect={handlePartSelect}
        onLabelSelect={handleLabelSelect}
        onDeletePart={handleDeletePart}
        onPartRotate={handlePartRotate}
        onPartAttrChange={handlePartAttrChange}
        placingPartId={placingPartId}
        onFinishPlacing={handleFinishPlacing}
        placingLabelId={placingLabelId}
        onFinishPlacingLabel={handleFinishPlacingLabel}
        onCancelPlacingLabel={handleCancelPlacingLabel}
        onPlaceLabelAt={handlePlaceLabelAt}
        onInitPCB={handleInitPCB}
      />
    </div>
  );
}
