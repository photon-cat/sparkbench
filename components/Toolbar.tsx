"use client";

import { useState, useCallback, useRef } from "react";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import SaveIcon from "@mui/icons-material/Save";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import FolderZipIcon from "@mui/icons-material/FolderZip";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import EditIcon from "@mui/icons-material/Edit";
import SettingsIcon from "@mui/icons-material/Settings";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import VisibilityIcon from "@mui/icons-material/Visibility";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import DeleteIcon from "@mui/icons-material/Delete";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import AuthButton from "./AuthButton";
import styles from "./Toolbar.module.css";

interface ToolbarProps {
  projectName?: string;
  onSave?: () => void;
  onImportWokwi?: (json: unknown) => void;
  onExportWokwi?: () => void;
  onDownloadZip?: () => void;
  onCopyProject?: () => void;
  lastSaved?: Date | null;
  dirty?: boolean;
  sparkyOpen?: boolean;
  onSparkyToggle?: () => void;
  isPublic?: boolean;
  isOwner?: boolean;
  onToggleVisibility?: () => void;
  ownerUsername?: string | null;
  onRenameProject?: (newName: string) => void;
  onDeleteProject?: () => void;
  starred?: boolean;
  onToggleStar?: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function Toolbar({ projectName, onSave, onImportWokwi, onExportWokwi, onDownloadZip, onCopyProject, lastSaved, dirty, sparkyOpen, onSparkyToggle, isPublic, isOwner, onToggleVisibility, ownerUsername, onRenameProject, onDeleteProject, starred, onToggleStar }: ToolbarProps) {
  const [saving, setSaving] = useState(false);
  const [dropdownAnchor, setDropdownAnchor] = useState<null | HTMLElement>(null);
  const [settingsAnchor, setSettingsAnchor] = useState<null | HTMLElement>(null);
  const [visibilityDialogOpen, setVisibilityDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
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
    e.target.value = "";
  }, [onImportWokwi]);

  return (
    <div className={styles.toolbar}>
      {/* Logo */}
      <a href="/" className={styles.logo}>
        <span className={styles.logoW}>Spark</span><span>Bench</span>
      </a>

      {/* Save */}
      <div className={styles.actions}>
        <div className={styles.saveBtnGroup}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            <SaveIcon sx={{ fontSize: 16 }} />
            {saving ? "SAVING..." : "SAVE"}
          </button>
          <button className={styles.dropdownBtn} onClick={(e) => setDropdownAnchor(e.currentTarget)}>
            <ArrowDropDownIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <Menu
          anchorEl={dropdownAnchor}
          open={Boolean(dropdownAnchor)}
          onClose={() => setDropdownAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          slotProps={{
            paper: {
              sx: {
                bgcolor: "#2a2a2a",
                color: "#ccc",
                minWidth: 180,
                "& .MuiMenuItem-root": { py: 0.75, px: 2, fontSize: 13 },
              },
            },
          }}
        >
          <MenuItem onClick={() => { onCopyProject?.(); setDropdownAnchor(null); }}>
            <ListItemIcon sx={{ color: "inherit", minWidth: 28 }}>
              <ContentCopyIcon sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText>Make a copy</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => { onDownloadZip?.(); setDropdownAnchor(null); }}>
            <ListItemIcon sx={{ color: "inherit", minWidth: 28 }}>
              <FolderZipIcon sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText>Download ZIP</ListItemText>
          </MenuItem>
        </Menu>

        <span className={styles.saveStatus}>
          {dirty && <span className={styles.dirtyDot} title="Unsaved changes" />}
          {lastSaved && `Saved at ${formatTime(lastSaved)}`}
        </span>

      </div>

      <div className={styles.spacer} />

      {/* Title */}
      <div className={styles.title}>
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              const trimmed = editValue.trim();
              if (trimmed && trimmed !== projectName && onRenameProject) {
                onRenameProject(trimmed);
              }
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "Escape") {
                setEditing(false);
              }
            }}
            style={{
              background: "#2a2a2a",
              border: "1px solid #f59e0b",
              borderRadius: 3,
              color: "#e8e9ee",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "inherit",
              padding: "2px 8px",
              outline: "none",
              textAlign: "center",
              width: 200,
            }}
          />
        ) : (
          <span className={styles.titleName}>
            {projectName || "untitled"}
            {isOwner && onRenameProject && (
              <EditIcon
                sx={{ fontSize: 12, opacity: 0.5, cursor: "pointer", ml: 0.5 }}
                onClick={() => { setEditValue(projectName || ""); setEditing(true); }}
              />
            )}
          </span>
        )}
        {ownerUsername && (
          <>
            <span style={{ color: "#555", fontSize: 11, margin: "0 6px" }}>by</span>
            <a
              href={`/builders/${encodeURIComponent(ownerUsername)}`}
              className={styles.ownerLink}
            >
              {ownerUsername}
            </a>
          </>
        )}
      </div>

      <div className={styles.spacer} />

      {/* Right */}
      <div className={styles.right}>
        {onToggleStar && (
          <button
            className={styles.starBtn}
            onClick={onToggleStar}
            title={starred ? "Unstar project" : "Star project"}
          >
            {starred
              ? <StarIcon sx={{ fontSize: 18, color: "#f59e0b" }} />
              : <StarBorderIcon sx={{ fontSize: 18 }} />
            }
          </button>
        )}

        {onSparkyToggle && (
          <button
            className={`${styles.sparkyBtn} ${sparkyOpen ? styles.sparkyBtnActive : ""}`}
            onClick={onSparkyToggle}
            title="Toggle Sparky AI assistant"
          >
            <AutoAwesomeIcon sx={{ fontSize: 16 }} />
            <span>Sparky</span>
          </button>
        )}

        {/* Project Settings gear */}
        <button
          className={styles.settingsBtn}
          onClick={(e) => setSettingsAnchor(e.currentTarget)}
          title="Project settings"
        >
          <SettingsIcon sx={{ fontSize: 20 }} />
        </button>
        <Menu
          anchorEl={settingsAnchor}
          open={Boolean(settingsAnchor)}
          onClose={() => setSettingsAnchor(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              sx: {
                bgcolor: "#1e1e1e",
                color: "#ccc",
                minWidth: 220,
                border: "1px solid #333",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                "& .MuiMenuItem-root": { py: 1, px: 2, fontSize: 13 },
              },
            },
          }}
        >
          <div style={{ padding: "8px 16px 4px", fontSize: 11, color: "#666", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Project Settings
          </div>
          <MenuItem onClick={() => { setSettingsAnchor(null); setVisibilityDialogOpen(true); }}>
            <ListItemIcon sx={{ color: "#888", minWidth: 28 }}>
              <VisibilityIcon sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText
              primary="Visibility"
              secondary={isPublic ? "Anyone can view" : "Private"}
              slotProps={{
                primary: { sx: { fontSize: 13, color: "#ccc" } },
                secondary: { sx: { fontSize: 11, color: "#666" } },
              }}
            />
          </MenuItem>
          {isOwner && onDeleteProject && [
            <div key="delete-divider" style={{ height: 1, background: "#333", margin: "4px 0" }} />,
            <MenuItem key="delete-item" onClick={() => { setSettingsAnchor(null); setDeleteDialogOpen(true); }}>
              <ListItemIcon sx={{ color: "#ef4444", minWidth: 28 }}>
                <DeleteIcon sx={{ fontSize: 18 }} />
              </ListItemIcon>
              <ListItemText
                primary="Delete project"
                slotProps={{
                  primary: { sx: { fontSize: 13, color: "#ef4444" } },
                }}
              />
            </MenuItem>,
          ]}
        </Menu>

        {/* Visibility dialog */}
        <Dialog
          open={visibilityDialogOpen}
          onClose={() => setVisibilityDialogOpen(false)}
          slotProps={{
            paper: {
              sx: {
                bgcolor: "#1e1e1e",
                color: "#ccc",
                border: "1px solid #333",
                borderRadius: "8px",
                minWidth: 360,
              },
            },
          }}
        >
          <DialogTitle sx={{ fontSize: 16, fontWeight: 600, color: "#e8e9ee", pb: 0 }}>
            Project Visibility
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {isOwner ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => { if (!isPublic) onToggleVisibility?.(); setVisibilityDialogOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    background: isPublic ? "#1a2e1a" : "#2a2a2a",
                    border: isPublic ? "1px solid #2e4a2e" : "1px solid #3a3a3a",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "#ccc",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <PublicIcon sx={{ fontSize: 22, color: isPublic ? "#4ade80" : "#888" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#e8e9ee" }}>Anyone can view</div>
                    <div style={{ fontSize: 12, color: "#888" }}>Visible to all users, including those not signed in</div>
                  </div>
                </button>
                <button
                  onClick={() => { if (isPublic) onToggleVisibility?.(); setVisibilityDialogOpen(false); }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    background: !isPublic ? "#2e2a1a" : "#2a2a2a",
                    border: !isPublic ? "1px solid #4a3e2e" : "1px solid #3a3a3a",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "#ccc",
                    textAlign: "left",
                    fontFamily: "inherit",
                  }}
                >
                  <LockIcon sx={{ fontSize: 22, color: !isPublic ? "#f59e0b" : "#888" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#e8e9ee" }}>Private</div>
                    <div style={{ fontSize: 12, color: "#888" }}>Only you can access this project</div>
                  </div>
                </button>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "#888", marginTop: 8 }}>
                {isPublic ? "This project is public." : "This project is private (read-only)."}
              </p>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setVisibilityDialogOpen(false)} sx={{ color: "#888", fontSize: 13, textTransform: "none" }}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          slotProps={{
            paper: {
              sx: {
                bgcolor: "#1e1e1e",
                color: "#ccc",
                border: "1px solid #333",
                borderRadius: "8px",
                minWidth: 360,
              },
            },
          }}
        >
          <DialogTitle sx={{ fontSize: 16, fontWeight: 600, color: "#ef4444", pb: 0 }}>
            Delete Project
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <p style={{ fontSize: 13, color: "#ccc", marginTop: 8 }}>
              Are you sure you want to delete <strong>{projectName}</strong>? This will permanently remove all files, builds, and chat history. This action cannot be undone.
            </p>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: "#888", fontSize: 13, textTransform: "none" }}>
              Cancel
            </Button>
            <Button
              onClick={() => { setDeleteDialogOpen(false); onDeleteProject?.(); }}
              sx={{ color: "#fff", bgcolor: "#ef4444", fontSize: 13, textTransform: "none", "&:hover": { bgcolor: "#dc2626" } }}
            >
              Delete permanently
            </Button>
          </DialogActions>
        </Dialog>

        {/* Profile avatar */}
        <AuthButton />
      </div>
    </div>
  );
}
