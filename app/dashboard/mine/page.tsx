"use client";

import { useState, useEffect } from "react";
import { fetchMyProjects } from "@/lib/api";
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

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyProjects()
      .then(setProjects)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.logo}>
          <span className={styles.logoAccent}>Spark</span>Bench
        </span>
        <div className={styles.headerSpacer} />
        <AuthButton />
      </div>

      <div className={styles.tabBar}>
        <a href="/dashboard/projects" className={styles.tab} style={{ textDecoration: "none" }}>projects</a>
        <div className={`${styles.tab} ${styles.tabActive}`}>my projects</div>
        <a href="/dashboard/starred" className={styles.tab} style={{ textDecoration: "none" }}>starred</a>
      </div>

      <div className={styles.main}>
        <div className={styles.content}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>my projects</span>
            <span className={styles.projectCount}>{projects.length}</span>
          </div>

          {loading ? (
            <div className={styles.emptyState}>loading...</div>
          ) : projects.length === 0 ? (
            <div className={styles.emptyState}>no projects yet</div>
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
                  <span className={styles.starCount}>&#9733; {p.starCount}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
