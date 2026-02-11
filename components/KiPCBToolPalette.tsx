"use client";

export type PCBTool = "select" | "route" | "via" | "zone" | "outline" | "measure";

interface KiPCBToolPaletteProps {
    activeTool: PCBTool;
    onToolChange: (tool: PCBTool) => void;
}

const TOOLS: { id: PCBTool; label: string; shortcut: string }[] = [
    { id: "select", label: "Select", shortcut: "S" },
    { id: "route", label: "Route", shortcut: "X" },
    { id: "via", label: "Via", shortcut: "V" },
    { id: "zone", label: "Zone", shortcut: "Z" },
    { id: "outline", label: "Outline", shortcut: "O" },
    { id: "measure", label: "Measure", shortcut: "M" },
];

export default function KiPCBToolPalette({
    activeTool,
    onToolChange,
}: KiPCBToolPaletteProps) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                padding: 4,
                background: "#1a1a2e",
                borderRight: "1px solid #333",
            }}
        >
            {TOOLS.map((tool) => (
                <button
                    key={tool.id}
                    onClick={() => onToolChange(tool.id)}
                    title={`${tool.label} (${tool.shortcut})`}
                    style={{
                        padding: "6px 8px",
                        background:
                            activeTool === tool.id ? "#3a3a5e" : "transparent",
                        color: activeTool === tool.id ? "#fff" : "#aaa",
                        border:
                            activeTool === tool.id
                                ? "1px solid #555"
                                : "1px solid transparent",
                        borderRadius: 4,
                        cursor: "pointer",
                        fontSize: 11,
                        fontFamily: "monospace",
                        textAlign: "left",
                    }}
                >
                    <span style={{ opacity: 0.5, marginRight: 4 }}>
                        {tool.shortcut}
                    </span>
                    {tool.label}
                </button>
            ))}
        </div>
    );
}
