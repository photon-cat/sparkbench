"use client";

import { signIn, signOut, useSession } from "@/lib/auth-client";

export default function AuthButton() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return (
      <span style={{ fontSize: 11, color: "#666" }}>...</span>
    );
  }

  if (session?.user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {session.user.image && (
          <img
            src={session.user.image}
            alt=""
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
            }}
          />
        )}
        <span style={{ fontSize: 11, color: "#aaa" }}>
          {session.user.name || session.user.email}
        </span>
        <button
          onClick={() => signOut()}
          style={{
            padding: "2px 8px",
            background: "#333",
            color: "#999",
            border: "1px solid #555",
            borderRadius: 3,
            fontSize: 11,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          sign out
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn.social({ provider: "google" })}
      style={{
        padding: "2px 10px",
        background: "#335533",
        color: "white",
        border: "none",
        borderRadius: 3,
        fontSize: 11,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      Sign in with Google
    </button>
  );
}
