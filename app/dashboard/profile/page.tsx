"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import AuthButton from "@/components/AuthButton";

interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  image: string | null;
  linkedAccounts: { provider: string; accountId: string }[];
}

export default function ProfilePage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [usage, setUsage] = useState<{ plan: string; limitUsd: number; usedUsd: number; periodStart: string } | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/dashboard/projects");
      return;
    }
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setProfile(data);
        setUsername(data.username || data.id || "");
      })
      .catch(console.error);
    fetch("/api/user/usage")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setUsage(data);
      })
      .catch(console.error);
  }, [isPending, session, router]);

  const handleChangeUsername = async () => {
    if (!username.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Failed to update" });
      } else {
        setMessage({ type: "success", text: "Username updated successfully" });
        setProfile((prev) => prev ? { ...prev, username: username.trim() } : prev);
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    }
    setSaving(false);
  };

  if (isPending || !profile) {
    return (
      <div style={{ height: "100vh", background: "#1e1e1e", color: "#ccc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        Loading...
      </div>
    );
  }

  const hasGoogle = profile.linkedAccounts.some((a) => a.provider === "google");

  return (
    <div style={{ height: "100vh", background: "#1e1e1e", color: "#ccc", display: "flex", flexDirection: "column", overflow: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", height: 40, background: "#1a1a1a", padding: "0 12px", borderBottom: "1px solid rgba(128,128,128,0.35)", flexShrink: 0 }}>
        <a href="/dashboard/projects" style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.5, color: "white", textDecoration: "none" }}>
          <span style={{ color: "#f59e0b" }}>Spark</span>Bench
        </a>
        <div style={{ flex: 1 }} />
        <AuthButton />
      </div>

      {/* Content */}
      <div style={{ maxWidth: 600, width: "100%", margin: "0 auto", padding: "32px 24px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#e8e9ee", marginBottom: 4 }}>
          Edit Your Profile
        </h1>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 32 }}>
          Your email address is <span style={{ color: "#ccc" }}>{profile.email}</span>.
        </p>

        {/* Username section */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#e8e9ee", marginBottom: 4 }}>
            Your Username
          </h2>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
            Your username is <span style={{ color: "#ccc", fontWeight: 500 }}>{profile.username}</span>.
            Choose a new username below:
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleChangeUsername()}
              style={{
                flex: 1,
                padding: "8px 12px",
                background: "#2a2a2a",
                border: "1px solid #555",
                borderRadius: 4,
                color: "#e0e0e0",
                fontSize: 14,
                fontFamily: "inherit",
                outline: "none",
              }}
              placeholder="Username"
            />
            <button
              onClick={handleChangeUsername}
              disabled={saving || !username.trim() || username.trim() === profile.username}
              style={{
                padding: "8px 16px",
                background: "#335533",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                opacity: (saving || !username.trim() || username.trim() === profile.username) ? 0.4 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {saving ? "SAVING..." : "CHANGE USERNAME"}
            </button>
          </div>
          {message && (
            <p style={{ fontSize: 12, marginTop: 8, color: message.type === "error" ? "#f44336" : "#4ade80" }}>
              {message.text}
            </p>
          )}
        </div>

        {/* Plan & Usage */}
        {usage && (
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#e8e9ee", marginBottom: 4 }}>
              Plan & AI Usage
            </h2>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
              Your current plan and AI usage for this billing period.
            </p>

            <div style={{
              padding: "16px",
              background: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: 6,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#e8e9ee" }}>
                    {usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)} Plan
                  </span>
                  <span style={{
                    marginLeft: 8,
                    padding: "2px 8px",
                    borderRadius: 3,
                    fontSize: 10,
                    fontWeight: 600,
                    background: "#1a2e1a",
                    color: "#4ade80",
                    border: "1px solid #2e4a2e",
                  }}>
                    ACTIVE
                  </span>
                </div>
                <span style={{ fontSize: 13, color: "#888" }}>
                  Resets {new Date(new Date(usage.periodStart).getFullYear(), new Date(usage.periodStart).getMonth() + 1, 1).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>

              {/* Usage bar */}
              {(() => {
                const pct = usage.limitUsd > 0 ? Math.min(100, (usage.usedUsd / usage.limitUsd) * 100) : 0;
                const barColor = pct > 90 ? "#f44336" : pct > 70 ? "#f59e0b" : "#4ade80";
                return (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#ccc", marginBottom: 4 }}>
                      <span>{pct.toFixed(1)}% used</span>
                      <span>${usage.limitUsd.toFixed(2)}/mo</span>
                    </div>
                    <div style={{
                      height: 8,
                      background: "#1a1a1a",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}>
                      <div style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: barColor,
                        borderRadius: 4,
                        transition: "width 0.3s",
                      }} />
                    </div>
                  </div>
                );
              })()}

              <div style={{ fontSize: 11, color: "#666" }}>
                ${usage.usedUsd.toFixed(2)} of ${usage.limitUsd.toFixed(2)} used this month
              </div>
            </div>
          </div>
        )}

        {/* Sign-in methods */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#e8e9ee", marginBottom: 4 }}>
            Sign in methods
          </h2>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
            Configure which social account you can use to sign into SparkBench.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Google */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              background: "#2a2a2a",
              border: "1px solid #3a3a3a",
              borderRadius: 6,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#e8e9ee" }}>Google</div>
                  {hasGoogle && (
                    <div style={{ fontSize: 11, color: "#888" }}>Connected</div>
                  )}
                </div>
              </div>
              <span style={{
                padding: "4px 10px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600,
                background: hasGoogle ? "#1a2e1a" : "#333",
                color: hasGoogle ? "#4ade80" : "#888",
                border: `1px solid ${hasGoogle ? "#2e4a2e" : "#555"}`,
              }}>
                {hasGoogle ? "CONNECTED" : "NOT CONNECTED"}
              </span>
            </div>

          </div>
        </div>

        {/* User ID */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#e8e9ee", marginBottom: 4 }}>
            Your User ID
          </h2>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>
            This is your internal user identifier.
          </p>
          <code style={{
            display: "inline-block",
            padding: "6px 12px",
            background: "#2a2a2a",
            border: "1px solid #3a3a3a",
            borderRadius: 4,
            fontSize: 13,
            color: "#e0e0e0",
            fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
            userSelect: "all",
          }}>
            {profile.id}
          </code>
        </div>
      </div>
    </div>
  );
}
