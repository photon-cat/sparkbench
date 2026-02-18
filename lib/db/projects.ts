import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "./index";
import { projects } from "./schema";

export function generateProjectId(): string {
  return nanoid(10);
}

export async function findProjectBySlug(slug: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export async function findProjectById(id: string) {
  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.id, id))
    .limit(1);
  return rows[0] ?? null;
}
