/**
 * Migration script: reads projects/ directory, inserts rows into DB,
 * uploads files to MinIO.
 *
 * Usage: npx tsx scripts/migrate-filesystem-to-db.ts
 *
 * Requires DATABASE_URL, MINIO_* env vars (load from .env.local).
 */

import "dotenv/config";
import { readdir, readFile, stat } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { Client } from "minio";
import * as schema from "../lib/db/schema";

const PROJECTS_DIR = join(process.cwd(), "projects");

// --- DB setup ---
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// --- MinIO setup ---
const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || "localhost",
  port: parseInt(process.env.MINIO_PORT || "9000", 10),
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || "minioadmin",
  secretKey: process.env.MINIO_SECRET_KEY || "minioadmin123",
});
const BUCKET = process.env.MINIO_BUCKET || "sparkbench";

async function ensureBucket() {
  const exists = await minioClient.bucketExists(BUCKET);
  if (!exists) {
    await minioClient.makeBucket(BUCKET);
    console.log(`Created bucket: ${BUCKET}`);
  }
}

async function uploadFile(projectId: string, filename: string, content: string) {
  const key = `projects/${projectId}/${filename}`;
  await minioClient.putObject(BUCKET, key, Buffer.from(content, "utf-8"));
}

async function main() {
  console.log("Starting migration from filesystem to DB + MinIO...\n");

  await ensureBucket();

  if (!existsSync(PROJECTS_DIR)) {
    console.log("No projects/ directory found. Nothing to migrate.");
    process.exit(0);
  }

  const entries = await readdir(PROJECTS_DIR, { withFileTypes: true });
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  console.log(`Found ${slugs.length} projects to migrate.\n`);

  let migrated = 0;
  let skipped = 0;

  for (const slug of slugs) {
    // Check if already migrated
    const existing = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(eq(schema.projects.slug, slug))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  SKIP ${slug} (already in DB)`);
      skipped++;
      continue;
    }

    const projectDir = join(PROJECTS_DIR, slug);
    const id = nanoid(10);

    // Read diagram.json if it exists
    let diagramJson: any = null;
    const diagramPath = join(projectDir, "diagram.json");
    if (existsSync(diagramPath)) {
      try {
        diagramJson = JSON.parse(await readFile(diagramPath, "utf-8"));
      } catch {
        console.warn(`  WARN ${slug}: Could not parse diagram.json`);
      }
    }

    // List all files in project directory
    const allEntries = await readdir(projectDir);
    const fileManifest: string[] = [];

    // Upload all files to MinIO
    for (const filename of allEntries) {
      const filePath = join(projectDir, filename);
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) continue;

      try {
        const content = await readFile(filePath, "utf-8");
        await uploadFile(id, filename, content);
        fileManifest.push(filename);
      } catch (err) {
        console.warn(`  WARN ${slug}: Could not upload ${filename}: ${err}`);
      }
    }

    // Get modification time from diagram.json or sketch.ino
    let updatedAt = new Date();
    try {
      const diagStat = await stat(diagramPath);
      updatedAt = diagStat.mtime;
    } catch {
      try {
        const sketchStat = await stat(join(projectDir, "sketch.ino"));
        updatedAt = sketchStat.mtime;
      } catch { /* use now */ }
    }

    // Insert DB row
    await db.insert(schema.projects).values({
      id,
      slug,
      ownerId: null, // no owner (pre-auth projects)
      title: slug,
      isPublic: true,
      boardType: "uno",
      diagramJson,
      fileManifest,
      createdAt: updatedAt,
      updatedAt,
    });

    console.log(`  OK   ${slug} -> ${id} (${fileManifest.length} files)`);
    migrated++;
  }

  console.log(`\nDone! Migrated: ${migrated}, Skipped: ${skipped}, Total: ${slugs.length}`);
  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
