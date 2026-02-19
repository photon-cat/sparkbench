import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ─── Better-Auth tables (declared for Drizzle awareness, managed by Better-Auth) ───

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  plan: text("plan").notNull().default("free"),
  usageLimitUsd: numeric("usage_limit_usd", { precision: 10, scale: 2 }).notNull().default("50.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── App tables ───

export const projects = pgTable("projects", {
  id: text("id").primaryKey(), // 10-char nanoid
  slug: text("slug").notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
  title: text("title").notNull().default(""),
  isPublic: boolean("is_public").notNull().default(true),
  boardType: text("board_type").notNull().default("uno"),
  diagramJson: jsonb("diagram_json"),
  fileManifest: jsonb("file_manifest").$type<string[]>(), // list of filenames in MinIO
  agentSessionId: text("agent_session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projectOwners = pgTable("project_owners", {
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectShares = pgTable("project_shares", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("viewer"), // "viewer" | "editor"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const projectStars = pgTable("project_stars", {
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("project_stars_project_user_idx").on(table.projectId, table.userId),
]);

export const builds = pgTable("builds", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"), // "pending" | "success" | "error"
  board: text("board").notNull().default("uno"),
  hexKey: text("hex_key"), // MinIO key for firmware.hex
  stdout: text("stdout"),
  stderr: text("stderr"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  projectId: text("project_id")
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // "user" | "assistant"
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiUsageLog = pgTable("ai_usage_log", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  projectId: text("project_id")
    .references(() => projects.id, { onDelete: "set null" }),
  model: text("model").notNull(),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
  turns: integer("turns").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Type exports ───

export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Build = typeof builds.$inferSelect;
