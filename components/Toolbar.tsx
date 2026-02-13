"use client";

import { useState, useCallback, useRef } from "react";
import SaveIcon from "@mui/icons-material/Save";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import EditIcon from "@mui/icons-material/Edit";
import SettingsIcon from "@mui/icons-material/Settings";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  projectName?: string;
  onSave?: () => void;
  onImportWokwi?: (json: unknown) => void;
  onExportWokwi?: () => void;
  lastSaved?: Date | null;
  dirty?: boolean;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Toolbar({ projectName, onSave, onImportWokwi, onExportWokwi, lastSaved, dirty }: ToolbarProps) {
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaving(true);
    await onSave();
    setSaving(false);
  }, [onSave]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onImportWokwi) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        onImportWokwi(json);
      } catch (err) {
        console.error("Failed to parse imported JSON:", err);
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-imported
    e.target.value = "";
  }, [onImportWokwi]);

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

        {/* Import / Export */}
        <button className={styles.ioBtn} onClick={handleImportClick} title="Import Wokwi diagram.json">
          <FileUploadIcon sx={{ fontSize: 14 }} />
          Import
        </button>
        <button className={styles.ioBtn} onClick={onExportWokwi} title="Export as Wokwi diagram.json">
          <FileDownloadIcon sx={{ fontSize: 14 }} />
          Export
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
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
