"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Toolbar from "@/components/Toolbar";
import Workbench from "@/components/Workbench";
import { parseDiagram, type Diagram, type DiagramPart, type DiagramConnection, type DiagramLabel } from "@/lib/diagram-parser";
import { useSimulation } from "@/hooks/useSimulation";
import { fetchDiagram, fetchSketch, saveDiagram, saveSketch } from "@/lib/api";

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>();

  const [diagram, setDiagram] = useState<Diagram | null>(null);
  const [sketchCode, setSketchCode] = useState("");
  const [diagramJson, setDiagramJson] = useState("");
  const [projectFiles, setProjectFiles] = useState<{ name: string; content: string }[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [dirty, setDirty] = useState(false);

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

    setDiagram((prev) => {
      if (!prev) return prev;
      const id = nextId(new Set(prev.parts.map((p) => p.id)));
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

  const handleSave = useCallback(async () => {
    if (!slug) return;

    try {
      await Promise.all([
        saveDiagram(slug, diagramJson),
        saveSketch(slug, sketchCode),
      ]);
      setLastSaved(new Date());
      setDirty(false);
    } catch (err) {
      console.error("Save error:", err);
    }
  }, [slug, diagramJson, sketchCode]);

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
        onStart={handleStart}
        onStop={handleStop}
        onPause={handlePause}
        onResume={handleResume}
        onRestart={handleRestart}
        onSketchChange={handleSketchChange}
        onDiagramChange={handleDiagramChange}
        onAddPart={handleAddPart}
        onPartMove={handlePartMove}
        onAddConnection={handleAddConnection}
        onAddLabel={handleAddLabel}
      />
    </div>
  );
}
