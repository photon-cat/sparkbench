"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import Toolbar from "@/components/Toolbar";
import Workbench from "@/components/Workbench";
import { parseDiagram, findMCUs, type Diagram, type DiagramPart, type DiagramConnection, type MCUInfo } from "@/lib/diagram-parser";
import { useSimulation } from "@/hooks/useSimulation";
import { fetchDiagram, fetchSketch, saveDiagram, saveSketch, fetchPCB, savePCB } from "@/lib/api";
import { importWokwi, exportToWokwi } from "@/lib/diagram-io";

// Short prefix overrides for generating unique part IDs
const SHORT_PREFIX: Record<string, string> = {
  "wokwi-pushbutton": "btn",
  "wokwi-pushbutton-6mm": "btn",
  "wokwi-resistor": "r",
  "wokwi-clock-generator": "clk",
  "wokwi-junction": "j",
  "sb-atmega328": "u",
  "sb-capacitor": "c",
  "sb-crystal": "y",
  "sb-diode": "d",
  "sb-usb-c": "j",
};

const prefixCounters: Record<string, number> = {};

function typeToPrefix(type: string): string {
  if (SHORT_PREFIX[type]) return SHORT_PREFIX[type];
  return type
    .replace(/^wokwi-/, "")
    .replace(/^sb-/, "")
    .replace(/^board-/, "")
    .replace(/-\d+$/, "")
    .replace(/-/g, "");
}

function generatePartId(type: string, existingIds?: Set<string>): string {
  const prefix = typeToPrefix(type);
  prefixCounters[prefix] = (prefixCounters[prefix] || 0) + 1;
  let id = `${prefix}${prefixCounters[prefix]}`;
  // Ensure uniqueness if existingIds provided
  if (existingIds) {
    while (existingIds.has(id)) {
      prefixCounters[prefix]++;
      id = `${prefix}${prefixCounters[prefix]}`;
    }
  }
  return id;
}

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
  const [showGrid, setShowGrid] = useState(true);
  const [mcuTarget, setMcuTarget] = useState<string | undefined>(undefined);
  const [mcuOptions, setMcuOptions] = useState<{ id: string; label: string }[]>([]);

  // Auto-detect MCUs when diagram changes
  useEffect(() => {
    if (!diagram) return;
    const mcus = findMCUs(diagram);
    const simulatable = mcus.filter((m) => m.simulatable);
    setMcuOptions(simulatable.map((m) => ({ id: m.id, label: m.label })));
    // If current target isn't in the list, pick first simulatable (Wokwi: first in parts order)
    if (!mcuTarget || !simulatable.find((m) => m.id === mcuTarget)) {
      setMcuTarget(simulatable[0]?.id);
    }
  }, [diagram, mcuTarget]);

  // Get board ID for the selected MCU target
  const mcuBoardId = (() => {
    if (!diagram || !mcuTarget) return "uno";
    const mcus = findMCUs(diagram);
    const target = mcus.find((m) => m.id === mcuTarget);
    return target?.boardId || "uno";
  })();

  // Undo/redo history for diagram state
  const MAX_HISTORY = 50;
  const undoStackRef = useRef<{ diagram: Diagram; json: string }[]>([]);
  const redoStackRef = useRef<{ diagram: Diagram; json: string }[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const skipHistoryRef = useRef(false);

  /** Push current diagram state to undo stack before making a change. */
  const pushUndo = useCallback(() => {
    if (skipHistoryRef.current) return;
    const currentDiagram = diagramRef.current;
    const currentJson = diagramJsonRef.current;
    if (!currentDiagram) return;
    undoStackRef.current.push({ diagram: currentDiagram, json: currentJson });
    if (undoStackRef.current.length > MAX_HISTORY) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const diagramRef = useRef<Diagram | null>(diagram);
  diagramRef.current = diagram;
  const diagramJsonRef = useRef(diagramJson);
  diagramJsonRef.current = diagramJson;

  /** Wrapped setDiagram that pushes undo history. */
  const setDiagramWithUndo = useCallback((updater: (prev: Diagram | null) => Diagram | null) => {
    pushUndo();
    setDiagram(updater);
  }, [pushUndo]);

  const handleUndo = useCallback(() => {
    const entry = undoStackRef.current.pop();
    if (!entry) return;
    const currentDiagram = diagramRef.current;
    const currentJson = diagramJsonRef.current;
    if (currentDiagram) {
      redoStackRef.current.push({ diagram: currentDiagram, json: currentJson });
    }
    skipHistoryRef.current = true;
    setDiagram(entry.diagram);
    setDiagramJson(entry.json);
    skipHistoryRef.current = false;
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    setDirty(true);
  }, []);

  const handleRedo = useCallback(() => {
    const entry = redoStackRef.current.pop();
    if (!entry) return;
    const currentDiagram = diagramRef.current;
    const currentJson = diagramJsonRef.current;
    if (currentDiagram) {
      undoStackRef.current.push({ diagram: currentDiagram, json: currentJson });
    }
    skipHistoryRef.current = true;
    setDiagram(entry.diagram);
    setDiagramJson(entry.json);
    skipHistoryRef.current = false;
    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    setDirty(true);
  }, []);

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
  } = useSimulation({ slug, diagram, sketchCode, projectFiles, board: mcuBoardId });

  // Load diagram and sketch on mount (or when slug changes)
  useEffect(() => {
    if (!slug) return;

    fetchDiagram(slug)
      .then((data) => {
        const parsed = parseDiagram(data.diagram);
        setDiagram(parsed);
        setDiagramJson(JSON.stringify(data.diagram, null, 2));
        if (data.lastModified) setLastSaved(new Date(data.lastModified));
        loadedRef.current = true;
        setDirty(false);

        // Initialize prefix counters from loaded parts
        for (const p of parsed.parts) {
          const match = p.id.match(/^([a-zA-Z_]+)(\d+)$/);
          if (match) {
            const prefix = match[1];
            const num = parseInt(match[2], 10);
            prefixCounters[prefix] = Math.max(prefixCounters[prefix] || 0, num);
          }
        }
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
    pushUndo();
    const defaultAttrs: Record<string, Record<string, string>> = {
      "wokwi-led": { color: "red" },
      "wokwi-resistor": { value: "1000" },
      "wokwi-lcd1602": { pins: "i2c" },
      "wokwi-lcd2004": { pins: "i2c" },
    };
    const attrs = defaultAttrs[partType] ?? {};

    let placedId = "";

    setDiagram((prev) => {
      if (!prev) return prev;
      const existingIds = new Set(prev.parts.map((p) => p.id));
      const id = generatePartId(partType, existingIds);
      placedId = id;
      const newPart: DiagramPart = { type: partType, id, top: 0, left: 0, attrs };
      return { ...prev, parts: [...prev.parts, newPart] };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        if (!obj.parts) obj.parts = [];
        const existingIds = new Set<string>(obj.parts.map((p: any) => p.id));
        const id = generatePartId(partType, existingIds);
        obj.parts.push({ type: partType, id, top: 0, left: 0, attrs });
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
    pushUndo();
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
    pushUndo();
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
    pushUndo();
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
    pushUndo();
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
    pushUndo();
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
    pushUndo();
    setDiagram((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        parts: prev.parts.filter((p) => p.id !== partId),
        connections: prev.connections.filter((conn) => {
          return !conn[0].startsWith(partId + ":") && !conn[1].startsWith(partId + ":");
        }),
      };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        obj.parts = (obj.parts ?? []).filter((p: any) => p.id !== partId);
        obj.connections = (obj.connections ?? []).filter((c: any) => {
          return !c[0]?.startsWith(partId + ":") && !c[1]?.startsWith(partId + ":");
        });
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setSelectedPartId(null);
    setDirty(true);
  }, []);

  const handlePartRotate = useCallback((partId: string, angle: number) => {
    pushUndo();
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

  const handleDuplicatePart = useCallback((partId: string) => {
    pushUndo();
    setDiagram((prev) => {
      if (!prev) return prev;
      const part = prev.parts.find((p) => p.id === partId);
      if (!part) return prev;
      const existingIds = new Set(prev.parts.map((p) => p.id));
      const newId = generatePartId(part.type, existingIds);
      const newPart: DiagramPart = {
        ...part,
        id: newId,
        top: part.top + 20,
        left: part.left + 20,
      };
      setSelectedPartId(newId);
      return { ...prev, parts: [...prev.parts, newPart] };
    });

    setDiagramJson((prev) => {
      try {
        const obj = JSON.parse(prev);
        const part = (obj.parts ?? []).find((p: any) => p.id === partId);
        if (part) {
          const existingIds = new Set<string>((obj.parts ?? []).map((p: any) => p.id));
          const newId = generatePartId(part.type, existingIds);
          obj.parts.push({
            ...part,
            id: newId,
            top: (part.top ?? 0) + 20,
            left: (part.left ?? 0) + 20,
          });
        }
        return JSON.stringify(obj, null, 2);
      } catch {
        return prev;
      }
    });

    setDirty(true);
  }, []);

  const handlePartAttrChange = useCallback((partId: string, attr: string, value: string) => {
    pushUndo();
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

  const handleAddFile = useCallback((name: string) => {
    setProjectFiles((prev) => [...prev, { name, content: "" }]);
    setDirty(true);
  }, []);

  const handleDeleteFile = useCallback((name: string) => {
    setProjectFiles((prev) => prev.filter((f) => f.name !== name));
    setDirty(true);
  }, []);

  const handleRenameFile = useCallback((oldName: string, newName: string) => {
    setProjectFiles((prev) =>
      prev.map((f) => (f.name === oldName ? { ...f, name: newName } : f)),
    );
    setDirty(true);
  }, []);

  const handleFileContentChange = useCallback((name: string, content: string) => {
    setProjectFiles((prev) =>
      prev.map((f) => (f.name === name ? { ...f, content } : f)),
    );
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

  const handleUpdatePCBFromDiagram = useCallback(async () => {
    if (!diagram) return;
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

  const handleSaveOutline = useCallback(async (svgText: string) => {
    // Add/update outline.svg in project files so it appears in the sidebar
    setProjectFiles((prev) => {
      const existing = prev.findIndex((f) => f.name === "outline.svg");
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { name: "outline.svg", content: svgText };
        return updated;
      }
      return [...prev, { name: "outline.svg", content: svgText }];
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!slug) return;

    try {
      const promises: Promise<void>[] = [
        saveDiagram(slug, diagramJson),
        saveSketch(slug, sketchCode, projectFiles),
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
  }, [slug, diagramJson, sketchCode, pcbText, projectFiles]);

  const handleImportWokwi = useCallback((json: unknown) => {
    const imported = importWokwi(json);
    setDiagram(imported);
    setDiagramJson(JSON.stringify(json, null, 2));
    setDirty(true);

    // Re-init prefix counters from imported parts
    for (const p of imported.parts) {
      const match = p.id.match(/^([a-zA-Z_]+)(\d+)$/);
      if (match) {
        const prefix = match[1];
        const num = parseInt(match[2], 10);
        prefixCounters[prefix] = Math.max(prefixCounters[prefix] || 0, num);
      }
    }
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

  const handleDownloadZip = useCallback(async () => {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    zip.file("diagram.json", diagramJson);
    zip.file("sketch.ino", sketchCode);
    for (const f of projectFiles) {
      zip.file(f.name, f.content);
    }
    if (pcbText) {
      zip.file("board.kicad_pcb", pcbText);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [diagramJson, sketchCode, projectFiles, pcbText, slug]);

  // Copy/Paste via native clipboard events — Wokwi-compatible format
  const selectedPartIdRef = useRef(selectedPartId);
  selectedPartIdRef.current = selectedPartId;

  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      const el = e.target as HTMLElement;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (el.isContentEditable || el.closest(".monaco-editor")) return;

      const pid = selectedPartIdRef.current;
      if (!pid) return;
      const diag = diagramRef.current;
      if (!diag) return;
      const parts = diag.parts.filter((p) => p.id === pid);
      if (parts.length === 0) return;

      const partIds = new Set(parts.map((p: DiagramPart) => p.id));
      const connections = diag.connections.filter((c: DiagramConnection) => {
        const fromId = c[0].split(":")[0];
        const toId = c[1].split(":")[0];
        return partIds.has(fromId) && partIds.has(toId);
      });

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
      const el = e.target as HTMLElement;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (el.isContentEditable || el.closest(".monaco-editor")) return;

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
      if (!diag) return;
      const existingIds = new Set(diag.parts.map((p) => p.id));
      const idMap = new Map<string, string>();
      const newParts: DiagramPart[] = [];
      for (const p of parsed.parts as any[]) {
        const newId = generatePartId(p.type, existingIds);
        existingIds.add(newId);
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

      const newDiag = {
        ...diag,
        parts: [...diag.parts, ...newParts],
        connections: [...diag.connections, ...newConns],
      };
      setDiagram(newDiag);
      setDiagramJson(JSON.stringify(exportToWokwi(newDiag), null, 2));
      if (newParts.length === 1) {
        setSelectedPartId(newParts[0].id);
      }
      setDirty(true);
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, []);

  // App-level keyboard shortcuts: A = catalog, G = grid
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (el.isContentEditable || el.closest(".monaco-editor")) return;

      if ((e.key === "z" || e.key === "Z") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }
      if ((e.key === "y" || e.key === "Y") && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (e.key === "g" || e.key === "G") {
        if (!e.ctrlKey && !e.metaKey) {
          setShowGrid((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleUndo, handleRedo]);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <Toolbar projectName={slug} onSave={handleSave} onImportWokwi={handleImportWokwi} onExportWokwi={handleExportWokwi} onDownloadZip={handleDownloadZip} lastSaved={lastSaved} dirty={dirty} />
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
        projectFiles={projectFiles}
        onSketchChange={handleSketchChange}
        onDiagramChange={handleDiagramChange}
        onPcbChange={handlePcbChange}
        onPcbSave={handlePcbSave}
        onAddFile={handleAddFile}
        onDeleteFile={handleDeleteFile}
        onRenameFile={handleRenameFile}
        onFileContentChange={handleFileContentChange}
        onAddPart={handleAddPart}
        onPartMove={handlePartMove}
        onAddConnection={handleAddConnection}
        onUpdateConnection={handleUpdateConnection}
        onDeleteConnection={handleDeleteConnection}
        onWireColorChange={handleWireColorChange}
        selectedPartId={selectedPartId}
        onPartSelect={handlePartSelect}
        onDeletePart={handleDeletePart}
        onPartRotate={handlePartRotate}
        onDuplicatePart={handleDuplicatePart}
        onPartAttrChange={handlePartAttrChange}
        placingPartId={placingPartId}
        onFinishPlacing={handleFinishPlacing}
        showGrid={showGrid}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onToggleGrid={() => setShowGrid((v) => !v)}
        onUpdateFromDiagram={handleUpdatePCBFromDiagram}
        onSaveOutline={handleSaveOutline}
        mcuId={mcuTarget}
        mcuOptions={mcuOptions}
        onMcuChange={setMcuTarget}
      />
    </div>
  );
}
