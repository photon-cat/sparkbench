// Centralized API helpers with typed fetch wrappers

export interface ProjectMeta {
  id: string;
  slug: string;
  partCount: number;
  partTypes: string[];
  lineCount: number;
  hasPCB: boolean;
  hasTests: boolean;
  modifiedAt: string;
}

export interface ProjectListResponse {
  projects: ProjectMeta[];
  total: number;
  page: number;
  pages: number;
}

export async function fetchProjects(params?: {
  page?: number;
  limit?: number;
  q?: string;
  featured?: boolean;
  mine?: boolean;
}): Promise<ProjectListResponse> {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.limit) sp.set("limit", String(params.limit));
  if (params?.q) sp.set("q", params.q);
  if (params?.featured) sp.set("featured", "true");
  if (params?.mine) sp.set("mine", "true");
  const qs = sp.toString();
  const res = await fetch(`/api/projects${qs ? `?${qs}` : ""}`);
  const data = await res.json();
  if (data.projects) return data;
  // Fallback for unexpected shape
  return { projects: [], total: 0, page: 1, pages: 0 };
}

export async function createProject(name: string): Promise<{ id?: string; slug?: string; error?: string }> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: data.error || "Failed to create project" };
  }
  return data;
}

export interface DiagramResponse {
  diagram: Record<string, unknown>;
  lastModified?: string;
}

export async function fetchDiagram(projectId: string): Promise<DiagramResponse> {
  const res = await fetch(`/api/projects/${projectId}/diagram`);
  if (!res.ok) throw new Error(`Failed to fetch diagram: ${res.statusText}`);
  return res.json();
}

export async function saveDiagram(projectId: string, diagram: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/diagram`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: diagram,
  });
  if (!res.ok) throw new Error(`Failed to save diagram: ${res.statusText}`);
}

export interface SketchResponse {
  sketch: string;
  files: { name: string; content: string }[];
}

export async function fetchSketch(projectId: string): Promise<SketchResponse> {
  const res = await fetch(`/api/projects/${projectId}/sketch`);
  if (!res.ok) throw new Error(`Failed to fetch sketch: ${res.statusText}`);
  return res.json();
}

export async function saveSketch(projectId: string, code: string, files?: { name: string; content: string }[]): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/sketch`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sketch: code, files }),
  });
  if (!res.ok) throw new Error(`Failed to save sketch: ${res.statusText}`);
}

export interface SourceMapEntry {
  file: string;
  line: number;
  address: number; // word address
}

export interface BuildResult {
  success: boolean;
  hex: string;
  error?: string;
  stdout?: string;
  stderr?: string;
  sourceMap?: SourceMapEntry[];
}

// ── PCB (.kicad_pcb) ─────────────────────────────────────────────

export async function fetchPCB(
  projectId: string,
): Promise<{ pcbText: string; lastModified?: string } | null> {
  const res = await fetch(`/api/projects/${projectId}/pcb`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch PCB: ${res.statusText}`);
  const pcbText = await res.text();
  const lastModified = res.headers.get("X-Last-Modified") ?? undefined;
  return { pcbText, lastModified };
}

export async function savePCB(projectId: string, pcbText: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/pcb`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: pcbText,
  });
  if (!res.ok) throw new Error(`Failed to save PCB: ${res.statusText}`);
}

// ── Board outline (outline.svg) ──────────────────────────────────

export async function fetchOutlineSVG(projectId: string): Promise<string | null> {
  const res = await fetch(`/api/projects/${projectId}/outline`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch outline: ${res.statusText}`);
  return res.text();
}

export async function saveOutlineSVG(projectId: string, svgText: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/outline`, {
    method: "PUT",
    headers: { "Content-Type": "image/svg+xml" },
    body: svgText,
  });
  if (!res.ok) throw new Error(`Failed to save outline: ${res.statusText}`);
}

// ── Libraries (libraries.txt) ────────────────────────────────────

export async function fetchLibraries(projectId: string): Promise<string> {
  const res = await fetch(`/api/projects/${projectId}/libraries`);
  if (!res.ok) throw new Error(`Failed to fetch libraries: ${res.statusText}`);
  return res.text();
}

export async function saveLibraries(projectId: string, text: string): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/libraries`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: text,
  });
  if (!res.ok) throw new Error(`Failed to save libraries: ${res.statusText}`);
}

// ── Project settings ─────────────────────────────────────────────

export interface ProjectSettings {
  id: string;
  slug: string;
  title: string;
  isPublic: boolean;
  isOwner: boolean;
  ownerUsername: string | null;
}

export async function fetchProjectSettings(projectId: string): Promise<ProjectSettings> {
  const res = await fetch(`/api/projects/${projectId}/settings`);
  if (!res.ok) throw new Error(`Failed to fetch settings: ${res.statusText}`);
  return res.json();
}

export async function updateProjectSettings(
  projectId: string,
  settings: { isPublic?: boolean; title?: string },
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Failed to update settings: ${res.statusText}`);
}

// ── Delete project ───────────────────────────────────────────────

export async function deleteProject(projectId: string): Promise<{ success?: boolean; error?: string }> {
  const res = await fetch(`/api/projects/${projectId}/settings`, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) return { error: data.error || "Failed to delete project" };
  return data;
}

// ── Stars ────────────────────────────────────────────────────────

export async function toggleStar(projectId: string): Promise<{ starred: boolean }> {
  const res = await fetch(`/api/projects/${projectId}/star`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to toggle star: ${res.statusText}`);
  return res.json();
}

export async function fetchStarStatus(projectId: string): Promise<{ starred: boolean }> {
  const res = await fetch(`/api/projects/${projectId}/star`);
  if (!res.ok) return { starred: false };
  return res.json();
}

export async function fetchMyProjects(): Promise<ProjectMeta[]> {
  const res = await fetch("/api/user/projects");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchStarred(): Promise<ProjectMeta[]> {
  const res = await fetch("/api/user/stars");
  if (!res.ok) return [];
  return res.json();
}

// ── Build ────────────────────────────────────────────────────────

export async function buildProject(
  projectId: string,
  sketch: string,
  files: { name: string; content: string }[],
  board = "uno",
  librariesTxt = "",
  debug = false,
): Promise<BuildResult> {
  const res = await fetch(`/api/projects/${projectId}/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sketch, files, board, librariesTxt, debug }),
  });
  return res.json();
}
