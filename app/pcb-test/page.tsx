"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// KiCanvas uses window/WebGL at module load time — must skip SSR
const KiPCBEditor = dynamic(() => import("@/components/KiPCBEditor"), {
    ssr: false,
    loading: () => (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                color: "#888",
                fontFamily: "monospace",
                background: "#0a0a1e",
            }}
        >
            Loading PCB editor...
        </div>
    ),
});

export default function PCBTestPage() {
    const [pcbText, setPcbText] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/projects/testpcb/pcb")
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.text();
            })
            .then((text) => {
                console.log("Loaded PCB text, length:", text.length);
                setPcbText(text);
            })
            .catch((err) => {
                console.error("Failed to load PCB:", err);
                setError(err.message);
            });
    }, []);

    if (error) {
        return (
            <div style={{ padding: 32, color: "#f44", fontFamily: "monospace", background: "#111", height: "100vh" }}>
                Error loading PCB: {error}
            </div>
        );
    }

    if (!pcbText) {
        return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#888", fontFamily: "monospace", background: "#0a0a1e" }}>
                Loading TFGPS01 board...
            </div>
        );
    }

    return (
        <div style={{ height: "100vh" }}>
            <KiPCBEditor
                initialPcbText={pcbText}
                onSave={(text) => {
                    console.log("Save .kicad_pcb:", text.slice(0, 200) + "...");
                }}
            />
        </div>
    );
}
