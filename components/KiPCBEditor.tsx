"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { List } from "@kicanvas/kicad/tokenizer";
import { listify } from "@kicanvas/kicad/tokenizer";
import { findChildren, replaceEdgeCuts } from "@/lib/sexpr-mutate";
import { SExprUndoStack } from "@/lib/sexpr-undo";
import { serializeSExpr } from "@/lib/sexpr-serializer";
import { parseSVGString, rectangleToSVG, svgPathToEdgeCuts } from "@/lib/svg-outline-import";
import { useKiPCBDrag } from "@/hooks/useKiPCBDrag";
import type { KiPCBCanvasHandle } from "./KiPCBCanvas";
import KiPCBToolPalette, { type PCBTool } from "./KiPCBToolPalette";
import KiPCBLayerPanel from "./KiPCBLayerPanel";

// Dynamic import for the WebGL canvas (no SSR)
const KiPCBCanvas = dynamic(() => import("./KiPCBCanvas"), {
    ssr: false,
    loading: () => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#888",
                fontFamily: "monospace",
            }}
        >
            Loading PCB viewer...
        </div>
    ),
});

/** Minimal empty KiCad PCB with a 100x80mm board outline */
const EMPTY_PCB_TEXT = `(kicad_pcb
  (version 20240108)
  (generator sparkbench)
  (generator_version "1.0")
  (general
    (thickness 1.6)
  )
  (paper A4)
  (layers
    (0 F.Cu signal)
    (31 B.Cu signal)
    (36 B.SilkS user)
    (37 F.SilkS user)
    (38 B.Mask user)
    (39 F.Mask user)
    (40 Dwgs.User user)
    (41 Cmts.User user)
    (44 Edge.Cuts user)
    (46 B.CrtYd user)
    (47 F.CrtYd user)
    (48 B.Fab user)
    (49 F.Fab user)
  )
  (setup
    (pad_to_mask_clearance 0)
    (pcbplotparams
      (layerselection 18678812770303)
      (outputformat 1)
      (outputdirectory "")
    )
  )
  (title_block
    (title "Sparkbench PCB Editor Alpha")
  )
  (net 0 "")
  (gr_line (start 0 0) (end 100 0) (layer Edge.Cuts) (stroke (width 0.05) (type solid)))
  (gr_line (start 100 0) (end 100 80) (layer Edge.Cuts) (stroke (width 0.05) (type solid)))
  (gr_line (start 100 80) (end 0 80) (layer Edge.Cuts) (stroke (width 0.05) (type solid)))
  (gr_line (start 0 80) (end 0 0) (layer Edge.Cuts) (stroke (width 0.05) (type solid)))
)`;

interface KiPCBEditorProps {
    initialPcbText: string | null;
    onSave?: (text: string) => void;
    onUpdateFromDiagram?: () => void;
    onSaveOutline?: (svgText: string) => void;
    slug?: string;
}

export default function KiPCBEditor({
    initialPcbText,
    onSave,
    onUpdateFromDiagram,
    onSaveOutline,
    slug,
}: KiPCBEditorProps) {
    // Parse initial text into S-expr tree, using empty board if null
    const [pcbTree, setPcbTree] = useState<List>(() =>
        listify(initialPcbText ?? EMPTY_PCB_TEXT)[0] as List,
    );
    const [activeTool, setActiveTool] = useState<PCBTool>("select");
    const [activeLayer, setActiveLayer] = useState("F.Cu");
    const [selectedItem, setSelectedItem] = useState<unknown>(null);
    const [selectedRef, setSelectedRef] = useState<string | null>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [boardLoaded, setBoardLoaded] = useState(false);
    const [showRatsnest, setShowRatsnest] = useState(true);

    // Board outline dimension inputs
    const [outlineWidth, setOutlineWidth] = useState("100");
    const [outlineHeight, setOutlineHeight] = useState("80");

    // DeepPCB autorouter state
    const [deeppcbStatus, setDeeppcbStatus] = useState<"idle" | "running" | "done" | "error">("idle");
    const [deeppcbMessage, setDeeppcbMessage] = useState("");
    const [deeppcbProgress, setDeeppcbProgress] = useState<number | null>(null);

    const canvasHandleRef = useRef<KiPCBCanvasHandle>(null);
    const undoStackRef = useRef(new SExprUndoStack());
    const fileInputRef = useRef<HTMLInputElement>(null);

    // When initialPcbText changes externally (e.g. after "Update from Diagram"),
    // re-parse the tree
    useEffect(() => {
        if (initialPcbText !== null) {
            const newTree = listify(initialPcbText)[0] as List;
            setPcbTree(newTree);
        }
    }, [initialPcbText]);

    // Extract selected footprint reference from KiCanvas selection
    const handleSelect = useCallback((item: unknown) => {
        setSelectedItem(item);
        const any = item as any;
        if (any?.reference) {
            setSelectedRef(any.reference);
        } else if (any?.parent?.reference) {
            setSelectedRef(any.parent.reference);
        } else {
            setSelectedRef(null);
        }
    }, []);

    // Handle tree changes from editing hooks
    const handleTreeChange = useCallback((newTree: List) => {
        setPcbTree(newTree);
    }, []);

    // Handle selection by pad click from drag hook
    const handleSelectByRef = useCallback((ref: string | null) => {
        setSelectedRef(ref);
        // Also update selectedItem by finding the footprint in the viewer's board
        if (ref && canvasHandleRef.current?.viewer?.board) {
            const fp = canvasHandleRef.current.viewer.board.find_footprint(ref);
            setSelectedItem(fp ?? null);
        } else {
            setSelectedItem(null);
        }
    }, []);

    // Wire up drag hook
    useKiPCBDrag({
        viewer: canvasHandleRef.current?.viewer ?? null,
        pcbTree,
        undoStack: undoStackRef.current,
        selectedRef,
        onTreeChange: handleTreeChange,
        onSelectRef: handleSelectByRef,
        canvasElement: canvasHandleRef.current?.canvas ?? null,
    });

    // Board stats from tree
    const footprintCount = findChildren(pcbTree, "footprint").length;
    const segmentCount = findChildren(pcbTree, "segment").length;
    const viaCount = findChildren(pcbTree, "via").length;
    const netCount = findChildren(pcbTree, "net").length;

    // Apply board outline from dimensions
    const handleSetOutlineDimensions = useCallback(() => {
        const w = parseFloat(outlineWidth);
        const h = parseFloat(outlineHeight);
        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return;

        const svgText = rectangleToSVG(w, h);
        const pathD = `M0,0 L${w},0 L${w},${h} L0,${h} Z`;
        const edgeCutNodes = svgPathToEdgeCuts(pathD);

        undoStackRef.current.pushSnapshot(pcbTree);
        const newTree = structuredClone(pcbTree) as List;
        replaceEdgeCuts(newTree, edgeCutNodes);
        setPcbTree(newTree);

        onSaveOutline?.(svgText);
        onSave?.(serializeSExpr(newTree));
    }, [outlineWidth, outlineHeight, pcbTree, onSaveOutline, onSave]);

    // Upload SVG outline
    const handleUploadSVG = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = () => {
            const svgText = reader.result as string;
            const edgeCutNodes = parseSVGString(svgText);
            if (edgeCutNodes.length === 0) return;

            undoStackRef.current.pushSnapshot(pcbTree);
            const newTree = structuredClone(pcbTree) as List;
            replaceEdgeCuts(newTree, edgeCutNodes);
            setPcbTree(newTree);

            onSaveOutline?.(svgText);
            onSave?.(serializeSExpr(newTree));
        };
        reader.readAsText(file);

        // Reset input so the same file can be re-selected
        e.target.value = "";
    }, [pcbTree, onSaveOutline, onSave]);

    const handleDownloadPCB = useCallback(() => {
        const text = serializeSExpr(pcbTree);
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "board.kicad_pcb";
        a.click();
        URL.revokeObjectURL(url);
    }, [pcbTree]);

    // DeepPCB autorouter handler
    const handleDeepPCBRoute = useCallback(async () => {
        if (!slug) return;
        setDeeppcbStatus("running");
        setDeeppcbMessage("Starting autorouter...");
        setDeeppcbProgress(null);

        try {
            // Save current board state first
            const currentPcb = serializeSExpr(pcbTree);
            onSave?.(currentPcb);

            const res = await fetch("/api/deeppcb", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug }),
            });

            if (!res.ok && !res.body) {
                const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
                throw new Error(err.error || `HTTP ${res.status}`);
            }

            if (!res.body) throw new Error("No response stream");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);
                        switch (event.type) {
                            case "progress":
                                setDeeppcbMessage(event.message);
                                if (event.percent != null) setDeeppcbProgress(event.percent);
                                break;
                            case "done":
                                setDeeppcbStatus("done");
                                setDeeppcbMessage(event.message);
                                // Reload the board from server
                                try {
                                    const pcbRes = await fetch(`/api/projects/${slug}/pcb`);
                                    if (pcbRes.ok) {
                                        const newPcbText = await pcbRes.text();
                                        const newTree = listify(newPcbText)[0] as List;
                                        setPcbTree(newTree);
                                    }
                                } catch {
                                    // Board reload failed, user can refresh manually
                                }
                                break;
                            case "error":
                                setDeeppcbStatus("error");
                                setDeeppcbMessage(event.message);
                                break;
                        }
                    } catch {
                        // skip malformed JSON lines
                    }
                }
            }
        } catch (err: unknown) {
            setDeeppcbStatus("error");
            setDeeppcbMessage(err instanceof Error ? err.message : String(err));
        }
    }, [slug, pcbTree, onSave]);

    // Keyboard shortcuts for tool switching + save
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            switch (e.key.toLowerCase()) {
                case "s":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("select");
                    break;
                case "x":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("route");
                    break;
                case "z":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("zone");
                    break;
                case "o":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("outline");
                    break;
                case "m":
                    if (!e.ctrlKey && !e.metaKey) setActiveTool("measure");
                    break;
            }

            // Ctrl+S: Save
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                onSave?.(serializeSExpr(pcbTree));
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [pcbTree, onSave]);

    const btnStyle: React.CSSProperties = {
        padding: "4px 8px",
        background: "#1a5c2a",
        border: "1px solid #2a8a42",
        borderRadius: 3,
        color: "#fff",
        fontSize: 10,
        cursor: "pointer",
        fontFamily: "monospace",
        fontWeight: 600,
        width: "100%",
    };

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "3px 6px",
        background: "#111",
        border: "1px solid #444",
        borderRadius: 3,
        color: "#ccc",
        fontSize: 11,
        fontFamily: "monospace",
    };

    return (
        <div
            style={{
                display: "flex",
                height: "100%",
                background: "#0a0a1e",
            }}
        >
            {/* Tool palette */}
            <KiPCBToolPalette
                activeTool={activeTool}
                onToolChange={setActiveTool}
            />

            {/* Main canvas area */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                {/* Status bar */}
                <div
                    style={{
                        padding: "4px 12px",
                        background: "#1a1a2e",
                        borderBottom: "1px solid #333",
                        display: "flex",
                        gap: 16,
                        alignItems: "center",
                        fontFamily: "monospace",
                        fontSize: 11,
                        color: "#aaa",
                    }}
                >
                    <span>
                        Tool:{" "}
                        <strong style={{ color: "#fff" }}>{activeTool}</strong>
                    </span>
                    <span>
                        Layer:{" "}
                        <strong style={{ color: "#fff" }}>
                            {activeLayer}
                        </strong>
                    </span>
                    <span>
                        ({mousePos.x.toFixed(2)}, {mousePos.y.toFixed(2)}) mm
                    </span>
                    {selectedRef && (
                        <span style={{ color: "#aaf" }}>
                            Selected: {selectedRef}
                        </span>
                    )}
                    <label style={{ marginLeft: "auto", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                        <input
                            type="checkbox"
                            checked={showRatsnest}
                            onChange={(e) => setShowRatsnest(e.target.checked)}
                            style={{ accentColor: "#4af" }}
                        />
                        Ratsnest
                    </label>
                    <span>
                        {footprintCount} fp, {segmentCount} seg, {viaCount} via, {netCount} net
                    </span>
                    {undoStackRef.current.canUndo && (
                        <span style={{ color: "#888" }}>
                            Undo available
                        </span>
                    )}
                </div>

                {/* Canvas */}
                <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                    <KiPCBCanvas
                        ref={canvasHandleRef}
                        pcbTree={pcbTree}
                        showRatsnest={showRatsnest}
                        onSelect={handleSelect}
                        onMouseMove={(x, y) => setMousePos({ x, y })}
                        onBoardLoaded={() => setBoardLoaded(true)}
                    />
                </div>
            </div>

            {/* Right panel: layers + properties + board outline */}
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: 220,
                }}
            >
                <KiPCBLayerPanel
                    viewer={boardLoaded ? canvasHandleRef.current?.viewer ?? null : null}
                    activeLayer={activeLayer}
                    onLayerChange={setActiveLayer}
                />
                <div
                    style={{
                        flex: 1,
                        overflow: "auto",
                        padding: "8px",
                        background: "#1a1a2e",
                        borderLeft: "1px solid #333",
                        fontSize: 12,
                        fontFamily: "monospace",
                        color: "#ccc",
                    }}
                >
                    {/* Update from Diagram */}
                    <div style={{ marginBottom: 10 }}>
                        <button
                            onClick={onUpdateFromDiagram}
                            style={btnStyle}
                        >
                            Update from Diagram
                        </button>
                    </div>

                    {/* Board Outline */}
                    <div style={{ marginBottom: 10, borderTop: "1px solid #333", paddingTop: 8 }}>
                        <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>
                            Board Outline
                        </div>
                        <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: "#666", fontSize: 9 }}>W (mm)</div>
                                <input
                                    type="number"
                                    value={outlineWidth}
                                    onChange={(e) => setOutlineWidth(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ color: "#666", fontSize: 9 }}>H (mm)</div>
                                <input
                                    type="number"
                                    value={outlineHeight}
                                    onChange={(e) => setOutlineHeight(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSetOutlineDimensions}
                            style={{ ...btnStyle, marginBottom: 4 }}
                        >
                            Set Rectangle Outline
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".svg"
                            onChange={handleUploadSVG}
                            style={{ display: "none" }}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{ ...btnStyle, background: "#2a3a5c", borderColor: "#3a5a8a" }}
                        >
                            Upload SVG Outline
                        </button>
                        <button
                            onClick={handleDownloadPCB}
                            style={{ ...btnStyle, background: "#2a3a5c", borderColor: "#3a5a8a" }}
                        >
                            Download .kicad_pcb
                        </button>
                    </div>

                    {/* DeepPCB Autorouter */}
                    {slug && (
                        <div style={{ marginBottom: 10, borderTop: "1px solid #333", paddingTop: 8 }}>
                            <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>
                                Autorouter
                            </div>
                            <button
                                onClick={handleDeepPCBRoute}
                                disabled={deeppcbStatus === "running"}
                                style={{
                                    ...btnStyle,
                                    background: deeppcbStatus === "running" ? "#333" : "#5c2a1a",
                                    borderColor: deeppcbStatus === "running" ? "#555" : "#8a3a2a",
                                    cursor: deeppcbStatus === "running" ? "not-allowed" : "pointer",
                                }}
                            >
                                {deeppcbStatus === "running" ? "Routing..." : "Route with DeepPCB"}
                            </button>
                            {deeppcbStatus !== "idle" && (
                                <div
                                    style={{
                                        marginTop: 4,
                                        fontSize: 10,
                                        color:
                                            deeppcbStatus === "error"
                                                ? "#f66"
                                                : deeppcbStatus === "done"
                                                  ? "#6f6"
                                                  : "#aaa",
                                    }}
                                >
                                    {deeppcbMessage}
                                    {deeppcbProgress != null && (
                                        <div
                                            style={{
                                                marginTop: 2,
                                                height: 3,
                                                background: "#333",
                                                borderRadius: 2,
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: `${deeppcbProgress}%`,
                                                    height: "100%",
                                                    background: "#4af",
                                                    borderRadius: 2,
                                                    transition: "width 0.3s",
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Cursor position */}
                    <div style={{ marginBottom: 8, borderTop: "1px solid #333", paddingTop: 8 }}>
                        <div style={{ color: "#888", fontSize: 10 }}>Position</div>
                        <div>X: {mousePos.x.toFixed(2)} mm</div>
                        <div>Y: {mousePos.y.toFixed(2)} mm</div>
                    </div>

                    {/* Selection info */}
                    <div style={{ marginBottom: 8 }}>
                        <div style={{ color: "#888", fontSize: 10, marginBottom: 2 }}>
                            Selection
                        </div>
                        {selectedItem ? (
                            <SelectedItemInfo item={selectedItem} />
                        ) : (
                            <div style={{ color: "#666" }}>None</div>
                        )}
                    </div>

                    {/* Board info */}
                    <div>
                        <div style={{ color: "#888", fontSize: 10, marginBottom: 2 }}>
                            Board
                        </div>
                        <div>Footprints: {footprintCount}</div>
                        <div>Segments: {segmentCount}</div>
                        <div>Vias: {viaCount}</div>
                        <div>Nets: {netCount}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SelectedItemInfo({ item }: { item: unknown }) {
    const any = item as any;
    const type = any?.constructor?.name ?? "Unknown";

    return (
        <div>
            <div style={{ color: "#aaf" }}>{type}</div>
            {any?.reference && <div>Ref: {any.reference}</div>}
            {any?.value && <div>Value: {any.value}</div>}
            {any?.netname && <div>Net: {any.netname}</div>}
            {any?.at?.position && (
                <div>
                    Pos: ({any.at.position.x.toFixed(2)},{" "}
                    {any.at.position.y.toFixed(2)})
                </div>
            )}
            {any?.number !== undefined && <div>Pad: {any.number}</div>}
            {any?.width !== undefined && <div>Width: {any.width}mm</div>}
            {any?.layer && <div>Layer: {any.layer}</div>}
        </div>
    );
}
