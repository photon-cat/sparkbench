"use client";

import { useState, useCallback } from "react";
import SaveIcon from "@mui/icons-material/Save";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import EditIcon from "@mui/icons-material/Edit";
import SettingsIcon from "@mui/icons-material/Settings";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  projectName?: string;
  onSave?: () => void;
  lastSaved?: Date | null;
  dirty?: boolean;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Toolbar({ projectName, onSave, lastSaved, dirty }: ToolbarProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    await onSave();
    setSaving(false);
  }, [onSave]);

  return (
    <div className={styles.toolbar}>
      {/* Logo */}
      <a href="/" className={styles.logo}>
        <span className={styles.logoW}>Spark</span>Bench
      </a>

      {/* Save */}
      <div className={styles.actions}>
        <div className={styles.saveBtnGroup}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            <SaveIcon sx={{ fontSize: 16 }} />
            {saving ? "SAVING..." : "SAVE"}
          </button>
          <button className={styles.dropdownBtn}>
            <ArrowDropDownIcon sx={{ fontSize: 18 }} />
          </button>
        </div>
        <span className={styles.saveStatus}>
          {dirty && <span className={styles.dirtyDot} title="Unsaved changes" />}
          {lastSaved && `Saved at ${formatTime(lastSaved)}`}
        </span>
      </div>

      <div className={styles.spacer} />

      {/* Title */}
      <div className={styles.title}>
        <span className={styles.titleName}>
          {projectName || "untitled"} <EditIcon sx={{ fontSize: 12, opacity: 0.5 }} />
        </span>
      </div>

      <div className={styles.spacer} />

      {/* Right */}
      <div className={styles.right}>
        <button className={styles.settingsBtn}>
          <SettingsIcon sx={{ fontSize: 20 }} />
        </button>
      </div>
    </div>
  );
}
