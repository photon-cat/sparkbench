import { getServerSession } from "@/lib/auth-middleware";

const ADMIN_IDS = new Set(
  (process.env.ADMIN_USER_IDS || "").split(",").map((s) => s.trim()).filter(Boolean),
);

export async function getAdminSession() {
  const session = await getServerSession();
  if (!session?.user || !ADMIN_IDS.has(session.user.id)) return null;
  return session;
}
