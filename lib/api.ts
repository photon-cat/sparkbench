// Centralized API helpers with typed fetch wrappers

export async function fetchProjects(): Promise<string[]> {
  const res = await fetch("/api/projects");
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data;
}

export async function createProject(name: string): Promise<{ slug?: string; error?: string }> {
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

export async function fetchDiagram(slug: string): Promise<DiagramResponse> {
  const res = await fetch(`/api/projects/${slug}/diagram`);
  if (!res.ok) throw new Error(`Failed to fetch diagram: ${res.statusText}`);
  return res.json();
}

export async function saveDiagram(slug: string, diagram: string): Promise<void> {
  const res = await fetch(`/api/projects/${slug}/diagram`, {
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

export async function fetchSketch(slug: string): Promise<SketchResponse> {
  const res = await fetch(`/api/projects/${slug}/sketch`);
  if (!res.ok) throw new Error(`Failed to fetch sketch: ${res.statusText}`);
  return res.json();
}

export async function saveSketch(slug: string, code: string, files?: { name: string; content: string }[]): Promise<void> {
  const res = await fetch(`/api/projects/${slug}/sketch`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sketch: code, files }),
  });
  if (!res.ok) throw new Error(`Failed to save sketch: ${res.statusText}`);
}

export interface BuildResult {
  success: boolean;
  hex: string;
  error?: string;
  stdout?: string;
  stderr?: string;
}

// ── PCB (.kicad_pcb) ─────────────────────────────────────────────

export async function fetchPCB(
  slug: string,
): Promise<{ pcbText: string; lastModified?: string } | null> {
  const res = await fetch(`/api/projects/${slug}/pcb`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch PCB: ${res.statusText}`);
  const pcbText = await res.text();
  const lastModified = res.headers.get("X-Last-Modified") ?? undefined;
  return { pcbText, lastModified };
}

export async function savePCB(slug: string, pcbText: string): Promise<void> {
  const res = await fetch(`/api/projects/${slug}/pcb`, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: pcbText,
  });
  if (!res.ok) throw new Error(`Failed to save PCB: ${res.statusText}`);
}

// ── Build ────────────────────────────────────────────────────────

export async function buildProject(
  slug: string,
  sketch: string,
  files: { name: string; content: string }[],
  board = "uno",
): Promise<BuildResult> {
  const res = await fetch(`/api/projects/${slug}/build`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sketch, files, board }),
  });
  return res.json();
}
