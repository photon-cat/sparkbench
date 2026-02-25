"use client";

import { useState, useEffect } from "react";
import AuthButton from "@/components/AuthButton";
import styles from "../../Home.module.css";
import s from "./admin.module.css";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  plan: string;
  usageLimitUsd: number;
  createdAt: string;
  projectCount: number;
  aiCostUsd: number;
  aiSessions: number;
}

interface AdminStats {
  period: string;
  since: string;
  builds: { success: number; error: number; avgDurationMs: number };
  chat: {
    success: number;
    error: number;
    toolError: number;
    totalCostUsd: number;
    totalTurns: number;
    sessions: number;
  };
  activeUsers: number;
  projects: { total: number; new: number };
  aiCosts: { model: string; totalCost: number; cnt: number }[];
  sandboxes: {
    total: number;
    running: number;
    stopped: number;
    volumes: number;
    imageSize: string | null;
    dockerMemTotalBytes: number;
    containers: {
      name: string;
      projectId: string;
      status: string;
      size: string;
      createdAt: string;
      isRunning: boolean;
      cpu: string | null;
      mem: string | null;
      memPct: string | null;
      pids: string | null;
    }[];
  } | null;
  timeBuckets: { bucket: string; cnt: number }[];
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className={s.statCard}>
      <div className={s.statValue} style={color ? { color } : undefined}>
        {value}
      </div>
      <div className={s.statLabel}>{label}</div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

function HBar({
  items,
}: {
  items: { label: string; value: number; color: string }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className={s.barChart}>
      {items.map((item) => (
        <div key={item.label} className={s.barRow}>
          <span className={s.barLabel}>{item.label}</span>
          <div className={s.barTrack}>
            <div
              className={s.barFill}
              style={{
                width: `${(item.value / max) * 100}%`,
                background: item.color,
              }}
            />
          </div>
          <span className={s.barValue}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

function Sparkline({
  data,
  width = 600,
  height = 48,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const points = data
    .map(
      (v, i) =>
        `${(i / (data.length - 1)) * width},${height - (v / max) * (height - 4) - 2}`,
    )
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      className={s.sparkline}
      style={{ width: "100%", maxWidth: width }}
    >
      <polyline
        points={points}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function pct(a: number, total: number): string {
  if (total === 0) return "0";
  return ((a / total) * 100).toFixed(0);
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [period, setPeriod] = useState("24h");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/admin/stats?period=${period}`)
      .then((r) => {
        if (r.status === 403) throw new Error("Forbidden");
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.users) setUsers(data.users); })
      .catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.logo}>
          <span className={styles.logoAccent}>Spark</span>Bench
        </span>
        <div className={styles.headerSpacer} />
        <AuthButton />
        <span className={styles.headerMeta} style={{ marginLeft: 12 }}>
          v0.1.0
        </span>
      </div>

      <div className={styles.tabBar}>
        <a
          href="/dashboard/projects"
          className={styles.tab}
          style={{ textDecoration: "none" }}
        >
          projects
        </a>
        <a
          href="/dashboard/mine"
          className={styles.tab}
          style={{ textDecoration: "none" }}
        >
          my projects
        </a>
        <a
          href="/dashboard/starred"
          className={styles.tab}
          style={{ textDecoration: "none" }}
        >
          starred
        </a>
        <a
          href="/dashboard/admin"
          className={`${styles.tab} ${styles.tabActive}`}
          style={{ textDecoration: "none" }}
        >
          admin
        </a>
      </div>

      <div className={styles.main}>
        <div className={styles.content}>
          {error === "Forbidden" ? (
            <div className={s.denied}>access denied</div>
          ) : loading ? (
            <div className={s.loading}>loading...</div>
          ) : error ? (
            <div className={s.denied}>error: {error}</div>
          ) : stats ? (
            <>
              {/* Period selector */}
              <div className={s.periodRow}>
                {(["24h", "7d", "30d"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`${s.periodBtn} ${p === period ? s.periodActive : ""}`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {/* Activity sparkline */}
              <div className={s.section}>
                <div className={s.sectionTitle}>// activity</div>
                <Sparkline data={stats.timeBuckets.map((b) => b.cnt)} />
              </div>

              {/* Stat cards */}
              <div className={s.cardGrid}>
                <StatCard label="Active Users" value={stats.activeUsers} />
                <StatCard
                  label="Builds"
                  value={stats.builds.success + stats.builds.error}
                  sub={`${pct(stats.builds.success, stats.builds.success + stats.builds.error)}% success`}
                />
                <StatCard
                  label="Avg Build"
                  value={`${(stats.builds.avgDurationMs / 1000).toFixed(1)}s`}
                />
                <StatCard label="Chat Sessions" value={stats.chat.sessions} />
                <StatCard
                  label="AI Cost"
                  value={`$${stats.chat.totalCostUsd.toFixed(2)}`}
                  color="#f59e0b"
                />
                <StatCard
                  label="Projects"
                  value={stats.projects.total}
                  sub={`${stats.projects.new} new`}
                />
              </div>

              {/* Builds */}
              <div className={s.section}>
                <div className={s.sectionTitle}>// builds</div>
                <HBar
                  items={[
                    {
                      label: "success",
                      value: stats.builds.success,
                      color: "#4ade80",
                    },
                    {
                      label: "error",
                      value: stats.builds.error,
                      color: "#f44336",
                    },
                  ]}
                />
              </div>

              {/* Chat */}
              <div className={s.section}>
                <div className={s.sectionTitle}>// chat</div>
                <HBar
                  items={[
                    {
                      label: "success",
                      value: stats.chat.success,
                      color: "#4ade80",
                    },
                    {
                      label: "error",
                      value: stats.chat.error,
                      color: "#f44336",
                    },
                    {
                      label: "tool_error",
                      value: stats.chat.toolError,
                      color: "#f59e0b",
                    },
                  ]}
                />
              </div>

              {/* AI cost by model */}
              {stats.aiCosts.length > 0 && (
                <div className={s.section}>
                  <div className={s.sectionTitle}>// ai cost by model</div>
                  <HBar
                    items={stats.aiCosts.map((m) => ({
                      label: m.model.replace("claude-", "").slice(0, 12),
                      value: m.totalCost,
                      color: "#f59e0b",
                    }))}
                  />
                </div>
              )}

              {/* Sandboxes */}
              {stats.sandboxes && (
                <div className={s.section}>
                  <div className={s.sectionTitle}>// sandboxes</div>
                  <div className={s.sandboxRow}>
                    <StatCard
                      label="Running"
                      value={stats.sandboxes.running}
                      color="#4ade80"
                    />
                    <StatCard
                      label="Stopped"
                      value={stats.sandboxes.stopped}
                    />
                    <StatCard label="Containers" value={stats.sandboxes.total} />
                    <StatCard label="Volumes" value={stats.sandboxes.volumes} />
                    {stats.sandboxes.imageSize && (
                      <StatCard label="Image" value={stats.sandboxes.imageSize} />
                    )}
                    {stats.sandboxes.dockerMemTotalBytes > 0 && (
                      <StatCard
                        label="Docker RAM"
                        value={formatBytes(stats.sandboxes.dockerMemTotalBytes)}
                      />
                    )}
                  </div>

                  {/* Container table */}
                  {stats.sandboxes.containers.length > 0 && (
                    <div className={s.containerTable}>
                      <div className={s.containerHeader}>
                        <span className={s.containerCol}>project</span>
                        <span className={s.containerCol}>status</span>
                        <span className={s.containerCol}>cpu</span>
                        <span className={s.containerCol}>memory</span>
                        <span className={s.containerCol}>pids</span>
                        <span className={s.containerColWide}>created</span>
                      </div>
                      {stats.sandboxes.containers.map((c) => (
                        <div
                          key={c.name}
                          className={`${s.containerRow} ${c.isRunning ? s.containerRunning : ""}`}
                        >
                          <span className={s.containerCol} title={c.name}>
                            {c.projectId.slice(0, 12)}
                          </span>
                          <span className={s.containerCol}>
                            <span
                              className={s.statusDot}
                              style={{
                                background: c.isRunning ? "#4ade80" : "#666",
                              }}
                            />
                            {c.isRunning ? "running" : "stopped"}
                          </span>
                          <span className={s.containerCol}>
                            {c.cpu ?? "—"}
                          </span>
                          <span className={s.containerCol}>
                            {c.mem ?? "—"}
                          </span>
                          <span className={s.containerCol}>
                            {c.pids ?? "—"}
                          </span>
                          <span className={s.containerColWide}>
                            {c.createdAt
                              ? new Date(c.createdAt).toLocaleString()
                              : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Users */}
              {users.length > 0 && (
                <div className={s.section}>
                  <div className={s.sectionTitle}>// users ({users.length})</div>
                  <div className={s.containerTable}>
                    <div className={s.containerHeader}>
                      <span className={s.containerColWide}>user</span>
                      <span className={s.containerCol}>plan</span>
                      <span className={s.containerCol}>projects</span>
                      <span className={s.containerCol}>ai cost</span>
                      <span className={s.containerCol}>sessions</span>
                      <span className={s.containerColWide}>joined</span>
                    </div>
                    {users.map((u) => (
                      <div key={u.id} className={s.containerRow}>
                        <span className={s.containerColWide} title={u.email}>
                          <span style={{ color: "#ccc" }}>{u.name}</span>
                          <span style={{ color: "#666", marginLeft: 6, fontSize: 11 }}>
                            {u.email}
                          </span>
                        </span>
                        <span className={s.containerCol}>{u.plan}</span>
                        <span className={s.containerCol}>{u.projectCount}</span>
                        <span className={s.containerCol} style={{ color: u.aiCostUsd > 0 ? "#f59e0b" : undefined }}>
                          ${u.aiCostUsd.toFixed(2)}
                        </span>
                        <span className={s.containerCol}>{u.aiSessions}</span>
                        <span className={s.containerColWide}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
