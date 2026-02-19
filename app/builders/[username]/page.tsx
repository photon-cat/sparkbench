"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface BuilderProject {
  id: string;
  slug: string;
  title: string;
  partCount: number;
  partTypes: string[];
  lineCount: number;
  hasPCB: boolean;
  modifiedAt: string;
}

interface BuilderProfile {
  user: {
    name: string;
    username: string;
    image: string | null;
  };
  projects: BuilderProject[];
}

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getInitial(name?: string): string {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export default function BuilderPage() {
  const { username } = useParams<{ username: string }>();
  const [data, setData] = useState<BuilderProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;
    fetch(`/api/builders/${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load profile");
        setLoading(false);
      });
  }, [username]);

  if (loading) {
    return (
      <div style={pageStyle}>
        <Header />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
          Loading...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={pageStyle}>
        <Header />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>
          {error || "Builder not found"}
        </div>
      </div>
    );
  }

  const { user, projects } = data;

  return (
    <div style={pageStyle}>
      <Header />
      <div style={{ maxWidth: 860, width: "100%", margin: "0 auto", padding: "32px 24px" }}>
        {/* Profile header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, paddingBottom: 24, borderBottom: "1px solid #333" }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            overflow: "hidden",
            background: user.image ? "transparent" : "#6d28d9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}>
            {user.image ? (
              <img src={user.image} alt="" style={{ width: 56, height: 56, borderRadius: "50%" }} />
            ) : (
              <span style={{ color: "white", fontSize: 24, fontWeight: 700, fontFamily: "inherit" }}>
                {getInitial(user.name)}
              </span>
            )}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#e8e9ee" }}>{user.name}</div>
            <div style={{ fontSize: 14, color: "#888" }}>@{user.username}</div>
          </div>
        </div>

        {/* Projects section */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, paddingBottom: 6, borderBottom: "1px solid #333" }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace" }}>
            public projects
          </span>
          <span style={{ fontSize: 11, color: "#555", fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace" }}>
            {projects.length}
          </span>
        </div>

        {projects.length === 0 ? (
          <div style={{ color: "#555", fontSize: 12, padding: "24px 0", fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace" }}>
            no public projects yet
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {projects.map((p) => (
              <a
                key={p.id}
                href={`/projects/${p.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "8px 10px",
                  textDecoration: "none",
                  color: "inherit",
                  borderBottom: "1px solid #2a2a2a",
                  fontSize: 12,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#252526"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 }} />
                <span style={{ fontWeight: 500, color: "#e0e0e0", minWidth: 160, fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace", fontSize: 12 }}>
                  {p.slug}
                </span>
                <span style={{ display: "flex", gap: 16, fontSize: 11, color: "#666", fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace", flexShrink: 0 }}>
                  <span>{p.partCount} parts</span>
                  <span>{p.lineCount} lines</span>
                  <span>{timeAgo(p.modifiedAt)}</span>
                </span>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
                  {p.partTypes.map((t) => (
                    <span key={t} style={{
                      padding: "1px 6px",
                      background: "#2a2a2a",
                      border: "1px solid #333",
                      borderRadius: 3,
                      fontSize: 10,
                      color: "#888",
                      fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
                    }}>{t}</span>
                  ))}
                </span>
                <span style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {p.hasPCB && (
                    <span style={{ padding: "1px 6px", borderRadius: 3, fontSize: 10, fontWeight: 600, background: "#1a2e1a", color: "#4caf50", border: "1px solid #2e4a2e", fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace" }}>
                      PCB
                    </span>
                  )}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={{ display: "flex", alignItems: "center", height: 40, background: "#1a1a1a", padding: "0 12px", borderBottom: "1px solid rgba(128,128,128,0.35)", flexShrink: 0 }}>
      <a href="/dashboard/projects" style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.5, color: "white", textDecoration: "none" }}>
        <span style={{ color: "#f59e0b" }}>Spark</span>Bench
      </a>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  height: "100vh",
  background: "#1e1e1e",
  color: "#ccc",
  display: "flex",
  flexDirection: "column",
  overflow: "auto",
};
