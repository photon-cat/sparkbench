"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { fetchProjects, createProject, saveDiagram, saveSketch, savePCB } from "@/lib/api";
import type { ProjectMeta } from "@/lib/api";
import AuthButton from "@/components/AuthButton";
import styles from "../../Home.module.css";

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

export default function ProjectsPage() {
  const router = useRouter();

  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [featuredProjects, setFeaturedProjects] = useState<ProjectMeta[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const [showImport, setShowImport] = useState(false);
  const [importName, setImportName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadProjects = useCallback((p: number, q: string) => {
    fetchProjects({ page: p, q: q || undefined }).then((data) => {
      setProjects(data.projects);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    });
  }, []);

  // Load featured projects once
  useEffect(() => {
    fetchProjects({ featured: true }).then((data) => {
      setFeaturedProjects(data.projects);
    });
  }, []);

  // Load projects when page changes
  useEffect(() => {
    loadProjects(page, search);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setPage(1);
      loadProjects(1, value);
    }, 300);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");
    try {
      const data = await createProject(newName.trim());
      if (data.error) { setError(data.error); setCreating(false); return; }
      router.push(`/projects/${data.id}`);
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
      const id = data.id!;

      const diagramFile = zip.file("diagram.json");
      if (diagramFile) await saveDiagram(id, await diagramFile.async("string"));

      let sketchFile = zip.file("sketch.ino");
      if (!sketchFile) { const inos = zip.file(/\.ino$/); if (inos.length > 0) sketchFile = inos[0]!; }
      if (!sketchFile) sketchFile = zip.file("main.cpp");
      if (sketchFile) await saveSketch(id, await sketchFile.async("string"));

      const pcbFile = zip.file("board.kicad_pcb") || zip.file(/\.kicad_pcb$/)[0];
      if (pcbFile) await savePCB(id, await pcbFile.async("string"));

      router.push(`/projects/${id}`);
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
        <AuthButton />
        <span className={styles.headerMeta} style={{ marginLeft: 12 }}>v0.1.0</span>
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        <a href="/dashboard/projects" className={`${styles.tab} ${styles.tabActive}`} style={{ textDecoration: "none" }}>projects</a>
        <a href="/dashboard/mine" className={styles.tab} style={{ textDecoration: "none" }}>my projects</a>
        <a href="/dashboard/starred" className={styles.tab} style={{ textDecoration: "none" }}>starred</a>
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

          {/* Featured projects */}
          {featuredProjects.length > 0 && (
            <>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionTitle}>featured</span>
                <span className={styles.projectCount}>{featuredProjects.length}</span>
              </div>
              <div className={styles.projectList}>
                {featuredProjects.map((p) => (
                  <a key={p.id} href={`/projects/${p.id}`} className={styles.projectRow}>
                    <span className={styles.projectDot} style={{ background: "#f59e0b" }} />
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
                    <span className={styles.starCount}>&#9733; {p.starCount}</span>
                  </a>
                ))}
              </div>
            </>
          )}

          {/* Guide */}
          {(() => {
            const guide = projects.find((p) => p.slug.startsWith("demo-guide"));
            if (!guide) return null;
            return (
              <a href={`/projects/${guide.id}`} className={styles.guideBanner}>
                <span className={styles.guideLabel}>GUIDE</span>
                <span className={styles.guideText}>
                  Interactive walkthrough &mdash; code editor, diagram canvas, simulator,
                  PCB editor, 3D viewer, Sparky AI
                </span>
                <span className={styles.guideArrow}>&rarr;</span>
              </a>
            );
          })()}

          {/* Search */}
          <div className={styles.searchRow}>
            <input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="search projects..."
              className={styles.searchInput}
            />
          </div>

          {/* Projects */}
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>projects</span>
            <span className={styles.projectCount}>{total}</span>
          </div>

          {projects.length === 0 ? (
            <div className={styles.emptyState}>
              {search ? "no matching projects" : "no projects yet"}
            </div>
          ) : (
            <div className={styles.projectList}>
              {projects.map((p) => (
                <a key={p.id} href={`/projects/${p.id}`} className={styles.projectRow}>
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
                  {p.starCount > 0 && (
                    <span className={styles.starCount}>&#9733; {p.starCount}</span>
                  )}
                </a>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                &laquo; prev
              </button>
              <span className={styles.pageInfo}>
                page {page} of {pages}
              </span>
              <button
                className={styles.pageBtn}
                disabled={page >= pages}
                onClick={() => setPage(page + 1)}
              >
                next &raquo;
              </button>
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
