import { NextResponse } from "next/server";

interface LibEntry {
  name: string;
  sentence: string;
  author: string;
  category: string;
}

let cachedLibraries: LibEntry[] | null = null;
let cachePromise: Promise<LibEntry[]> | null = null;

async function getLibraries(): Promise<LibEntry[]> {
  if (cachedLibraries) return cachedLibraries;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    const res = await fetch(
      "https://downloads.arduino.cc/libraries/library_index.json"
    );
    if (!res.ok) throw new Error(`Failed to fetch library index: ${res.status}`);
    const data = await res.json();

    // Extract unique libraries (latest version of each by taking last occurrence)
    const byName = new Map<string, LibEntry>();
    for (const lib of data.libraries) {
      byName.set(lib.name, {
        name: lib.name,
        sentence: lib.sentence || "",
        author: lib.author || "",
        category: lib.category || "",
      });
    }

    cachedLibraries = Array.from(byName.values());
    cachePromise = null;
    return cachedLibraries;
  })();

  return cachePromise;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const libraries = await getLibraries();
    const results = libraries
      .filter(
        (lib) =>
          lib.name.toLowerCase().includes(q) ||
          lib.sentence.toLowerCase().includes(q)
      )
      .slice(0, 20);

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Library search failed: ${message}` },
      { status: 500 }
    );
  }
}
