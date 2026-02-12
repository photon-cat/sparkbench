"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Toolbar from "@/components/Toolbar";
import Workbench from "@/components/Workbench";
import { parseDiagram, type Diagram, type DiagramPart, type DiagramConnection, type DiagramLabel } from "@/lib/diagram-parser";
import { useSimulation } from "@/hooks/useSimulation";
import { fetchDiagram, fetchSketch, saveDiagram, saveSketch, fetchPCB, savePCB } from "@/lib/api";

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
  const [placingPartId, setPlacingPartId] = useState<string | null>(null);

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

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar projectName={slug} onSave={handleSave} lastSaved={lastSaved} dirty={dirty} />
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
        onAddLabel={handleAddLabel}
        selectedPartId={selectedPartId}
        onPartSelect={handlePartSelect}
        onDeletePart={handleDeletePart}
        onPartRotate={handlePartRotate}
        onPartAttrChange={handlePartAttrChange}
        placingPartId={placingPartId}
        onFinishPlacing={handleFinishPlacing}
        onInitPCB={handleInitPCB}
      />
    </div>
  );
}
