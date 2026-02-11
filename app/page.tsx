"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetchProjects, createProject } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<string[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProjects().then(setProjects);
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    setError("");

    try {
      const data = await createProject(newName.trim());
      if (data.error) {
        setError(data.error);
        setCreating(false);
        return;
      }
      router.push(`/projects/${data.slug}`);
    } catch {
      setError("Network error");
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "#e0e0e0",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 80,
      }}
    >
      {/* Header */}
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>
        <span style={{ color: "#f59e0b" }}>Spark</span>Bench
      </h1>
      <p style={{ color: "#888", fontSize: 14, marginBottom: 48 }}>
        Arduino simulator &amp; schematic editor
      </p>

      {/* New project */}
      <div
        style={{
          background: "#1a1a1a",
          borderRadius: 12,
          padding: 32,
          width: 420,
          marginBottom: 40,
        }}
      >
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#ccc" }}>
          New Project
        </h2>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Project name..."
            style={{
              flex: 1,
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #333",
              borderRadius: 6,
              color: "#e0e0e0",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            style={{
              padding: "8px 20px",
              background: "#f59e0b",
              color: "#111",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 14,
              cursor: creating ? "wait" : "pointer",
              opacity: !newName.trim() ? 0.5 : 1,
            }}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
        {error && (
          <p style={{ color: "#ef4444", fontSize: 13, marginTop: 8 }}>{error}</p>
        )}
      </div>

      {/* Project list */}
      <div style={{ width: 420 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: "#ccc" }}>
          Projects
        </h2>
        {projects.length === 0 ? (
          <p style={{ color: "#666", fontSize: 13 }}>No projects yet</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {projects.map((slug) => (
              <a
                key={slug}
                href={`/projects/${slug}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  background: "#1a1a1a",
                  borderRadius: 8,
                  color: "#e0e0e0",
                  textDecoration: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#252525")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#1a1a1a")
                }
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#f59e0b",
                    flexShrink: 0,
                  }}
                />
                {slug}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
