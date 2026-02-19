import { NextResponse } from "next/server";
import { eq, and, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, accounts } from "@/lib/db/schema";
import { getServerSession } from "@/lib/auth-middleware";

/**
 * Ensure the user has a username set. If not, default to their user ID.
 */
async function ensureUsername(userId: string): Promise<string> {
  const rows = await db
    .select({ username: users.username })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (rows.length > 0 && rows[0].username) {
    return rows[0].username;
  }

  // Set username to user ID as default
  await db
    .update(users)
    .set({ username: userId, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return userId;
}

/**
 * GET /api/user/profile — current user info + linked accounts
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Ensure username is set (lazy init to user ID)
    const username = await ensureUsername(userId);

    // Get linked accounts (providers)
    const linkedAccounts = await db
      .select({
        providerId: accounts.providerId,
        accountId: accounts.accountId,
      })
      .from(accounts)
      .where(eq(accounts.userId, userId));

    return NextResponse.json({
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image,
      username,
      linkedAccounts: linkedAccounts.map((a) => ({
        provider: a.providerId,
        accountId: a.accountId,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/user/profile — update user profile (username)
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = { updatedAt: new Date() };

    if (typeof body.username === "string") {
      const username = body.username.trim();
      if (!username) {
        return NextResponse.json({ error: "Username cannot be empty" }, { status: 400 });
      }
      if (username.length > 50) {
        return NextResponse.json({ error: "Username too long (max 50)" }, { status: 400 });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return NextResponse.json({ error: "Username can only contain letters, numbers, hyphens, and underscores" }, { status: 400 });
      }

      // Check uniqueness (exclude current user)
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, username), ne(users.id, session.user.id)))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
      }

      updates.username = username;
    }

    await db.update(users).set(updates).where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
