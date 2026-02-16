"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { fetchProjects, createProject, saveDiagram, saveSketch, savePCB } from "@/lib/api";
import type { ProjectMeta } from "@/lib/api";
import styles from "./Home.module.css";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const STACK = [
  "avr8js", "Next.js 16", "React 19", "Monaco", "Three.js",
  "KiCanvas", "PlatformIO", "Agent SDK", "MCP",
];

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [showImport, setShowImport] = useState(false);
  const [importName, setImportName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProjects().then(setProjects);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const data = await createProject(newName.trim());
      if (data.error) { setError(data.error); setCreating(false); return; }
      router.push(`/projects/${data.slug}`);
    } catch {
      setError("Network error");
      setCreating(false);
    }
  };

  const handleImport = async () => {
    if (!importName.trim() || !importFile) return;
    setImporting(true);
    setImportError("");
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(importFile);
      const data = await createProject(importName.trim());
      if (data.error) { setImportError(data.error); setImporting(false); return; }
      const slug = data.slug!;

      const diagramFile = zip.file("diagram.json");
      if (diagramFile) await saveDiagram(slug, await diagramFile.async("string"));

      let sketchFile = zip.file("sketch.ino");
      if (!sketchFile) { const inos = zip.file(/\.ino$/); if (inos.length > 0) sketchFile = inos[0]!; }
      if (!sketchFile) sketchFile = zip.file("main.cpp");
      if (sketchFile) await saveSketch(slug, await sketchFile.async("string"));

      const pcbFile = zip.file("board.kicad_pcb") || zip.file(/\.kicad_pcb$/)[0];
      if (pcbFile) await savePCB(slug, await pcbFile.async("string"));

      router.push(`/projects/${slug}`);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Failed to import");
      setImporting(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.header}>
        <span className={styles.logo}>
          <span className={styles.logoAccent}>Spark</span>Bench
        </span>
        <div className={styles.headerSpacer} />
        <span className={styles.headerMeta}>v0.1.0</span>
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        <div className={`${styles.tab} ${styles.tabActive}`}>projects</div>
        <div className={styles.tab}>about</div>
      </div>

      {/* Main */}
      <div className={styles.main}>
        <div className={styles.content}>
          {/* About */}
          <div className={styles.about}>
            <div className={styles.aboutTitle}>// what is sparkbench</div>
            <p>
              Hardware development platform that combines a code editor, circuit
              simulator, PCB designer, and AI agent into one tool. Write Arduino
              firmware, simulate it on a cycle-accurate AVR emulator with real
              component models, generate KiCAD PCB layouts, and debug with an AI
              that has full context on your entire embedded project.
            </p>
            <div className={styles.aboutTitle}>// under the hood</div>
            <p>
              The simulator runs avr8js (ATmega328P emulator at 16MHz) with a custom
              I2C/SPI/USART bus, GPIO port model, and timer/PWM engine. Components
              are wired to MCU pins at the register level &mdash; the servo reads
              real Timer1 ICR pulses, the SSD1306 processes actual I2C transactions,
              the rotary encoder generates quadrature signals on interrupt pins.
              SparkBench CI runs these simulations headlessly with YAML test scenarios.
            </p>
            <div className={styles.stackRow}>
              {STACK.map((s) => (
                <span key={s} className={styles.stackTag}>{s}</span>
              ))}
            </div>
          </div>

          {/* Create row */}
          <div className={styles.createRow}>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="new project name..."
              className={styles.nameInput}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className={styles.createBtn}
            >
              {creating ? "creating..." : "create"}
            </button>
            <button className={styles.importBtn} onClick={() => setShowImport(true)}>
              import .zip
            </button>
          </div>
          {error && <p className={styles.error}>{error}</p>}

          {/* Guide */}
          <a href="/projects/demo-guide" className={styles.guideBanner}>
            <span className={styles.guideLabel}>GUIDE</span>
            <span className={styles.guideText}>
              Interactive walkthrough &mdash; code editor, diagram canvas, simulator,
              PCB editor, 3D viewer, Sparky AI
            </span>
            <span className={styles.guideArrow}>&rarr;</span>
          </a>

          {/* Projects */}
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>projects</span>
            <span className={styles.projectCount}>{projects.length}</span>
          </div>

          {projects.length === 0 ? (
            <div className={styles.emptyState}>no projects yet</div>
          ) : (
            <div className={styles.projectList}>
              {projects.map((p) => (
                <a key={p.slug} href={`/projects/${p.slug}`} className={styles.projectRow}>
                  <span className={styles.projectDot} />
                  <span className={styles.projectName}>{p.slug}</span>
                  <span className={styles.projectMeta}>
                    <span>{p.partCount} parts</span>
                    <span>{p.lineCount} lines</span>
                    <span>{timeAgo(p.modifiedAt)}</span>
                  </span>
                  <span className={styles.projectTags}>
                    {p.partTypes.map((t) => (
                      <span key={t} className={styles.partTag}>{t}</span>
                    ))}
                  </span>
                  <span className={styles.badges}>
                    {p.hasPCB && <span className={`${styles.badge} ${styles.badgePcb}`}>PCB</span>}
                    {p.hasTests && <span className={`${styles.badge} ${styles.badgeTest}`}>TEST</span>}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Import modal */}
      {showImport && (
        <div className={styles.importOverlay} onClick={() => setShowImport(false)}>
          <div className={styles.importModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.importModalTitle}>import from zip</div>
            <input
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              placeholder="project name..."
              className={styles.nameInput}
              style={{ width: "100%" }}
            />
            <button className={styles.filePickerBtn} onClick={() => fileInputRef.current?.click()}>
              {importFile ? importFile.name : "select .zip file..."}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              style={{ display: "none" }}
              onChange={(e) => { setImportFile(e.target.files?.[0] || null); e.target.value = ""; }}
            />
            {importError && <p className={styles.error}>{importError}</p>}
            <div className={styles.importModalActions}>
              <button className={styles.importModalCancel} onClick={() => setShowImport(false)}>cancel</button>
              <button
                className={styles.importModalSubmit}
                disabled={importing || !importName.trim() || !importFile}
                onClick={handleImport}
              >
                {importing ? "importing..." : "import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
