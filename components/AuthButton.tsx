"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import PersonIcon from "@mui/icons-material/Person";
import CodeIcon from "@mui/icons-material/Code";
import StarIcon from "@mui/icons-material/Star";
import LogoutIcon from "@mui/icons-material/Logout";

function getInitial(name?: string | null, email?: string | null): string {
  if (name) return name.charAt(0).toUpperCase();
  if (email) return email.charAt(0).toUpperCase();
  return "?";
}

export default function AuthButton() {
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (isPending) {
    return <span style={{ fontSize: 11, color: "#666" }}>...</span>;
  }

  if (!session?.user) {
    return (
      <button
        onClick={() => signIn.social({ provider: "google" })}
        style={{
          padding: "4px 12px",
          background: "#335533",
          color: "white",
          border: "none",
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Sign in with Google
      </button>
    );
  }

  const user = session.user;
  const initial = getInitial(user.name, user.email);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: open ? "2px solid #f59e0b" : "2px solid transparent",
          padding: 0,
          cursor: "pointer",
          overflow: "hidden",
          background: user.image ? "transparent" : "#6d28d9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "border-color 0.15s",
        }}
      >
        {user.image ? (
          <img
            src={user.image}
            alt=""
            style={{ width: 24, height: 24, borderRadius: "50%" }}
          />
        ) : (
          <span style={{ color: "white", fontSize: 13, fontWeight: 700, fontFamily: "inherit" }}>
            {initial}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 260,
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            zIndex: 9999,
            overflow: "hidden",
          }}
        >
          {/* User info header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 16px",
              borderBottom: "1px solid #333",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                overflow: "hidden",
                background: user.image ? "transparent" : "#6d28d9",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {user.image ? (
                <img src={user.image} alt="" style={{ width: 40, height: 40, borderRadius: "50%" }} />
              ) : (
                <span style={{ color: "white", fontSize: 18, fontWeight: 700, fontFamily: "inherit" }}>
                  {initial}
                </span>
              )}
            </div>
            <div style={{ overflow: "hidden" }}>
              <div style={{ color: "#e8e9ee", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {user.name || "User"}
              </div>
              <div style={{ color: "#888", fontSize: 12, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                {user.email}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div style={{ padding: "4px 0" }}>
            <MenuRow icon={<CodeIcon sx={{ fontSize: 18 }} />} label="My projects" onClick={() => { setOpen(false); router.push("/dashboard/mine"); }} />
            <MenuRow icon={<StarIcon sx={{ fontSize: 18 }} />} label="Starred projects" onClick={() => { setOpen(false); router.push("/dashboard/starred"); }} />
            <MenuRow icon={<PersonIcon sx={{ fontSize: 18 }} />} label="Profile settings" onClick={() => { setOpen(false); router.push("/dashboard/profile"); }} />
            <div style={{ height: 1, background: "#333", margin: "4px 0" }} />
            <MenuRow icon={<LogoutIcon sx={{ fontSize: 18 }} />} label="Sign out" onClick={() => { setOpen(false); signOut(); }} />
          </div>
        </div>
      )}
    </div>
  );
}

function MenuRow({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: "8px 16px",
        background: "none",
        border: "none",
        color: "#ccc",
        fontSize: 13,
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#2a2a2a"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
    >
      <span style={{ display: "flex", color: "#888" }}>{icon}</span>
      {label}
    </button>
  );
}
