"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import styles from "./LibraryManager.module.css";

interface LibResult {
  name: string;
  sentence: string;
  author: string;
  category: string;
}

interface LibraryManagerProps {
  librariesTxt: string;
  onLibrariesChange: (text: string) => void;
}

/** Parse libraries.txt into an array of library names (ignoring comments/blanks). */
function parseLibraries(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}

/** Build libraries.txt content from an array of library names. */
function buildLibrariesTxt(libs: string[]): string {
  if (libs.length === 0) return "";
  return "# Wokwi Library List\n# See https://docs.wokwi.com/guides/libraries\n\n" + libs.join("\n") + "\n";
}

export default function LibraryManager({
  librariesTxt,
  onLibrariesChange,
}: LibraryManagerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LibResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const installed = parseLibraries(librariesTxt);
  const installedSet = new Set(installed.map((n) => n.toLowerCase()));

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/libraries/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setResults(data.results || []);
      setSearched(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(val.trim()), 300);
    },
    [doSearch]
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const addLibrary = useCallback(
    (name: string) => {
      if (installedSet.has(name.toLowerCase())) return;
      const newLibs = [...installed, name];
      onLibrariesChange(buildLibrariesTxt(newLibs));
    },
    [installed, installedSet, onLibrariesChange]
  );

  const removeLibrary = useCallback(
    (name: string) => {
      const newLibs = installed.filter(
        (l) => l.toLowerCase() !== name.toLowerCase()
      );
      onLibrariesChange(buildLibrariesTxt(newLibs));
    },
    [installed, onLibrariesChange]
  );

  const handleAddClick = useCallback(() => {
    searchRef.current?.focus();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <input
          ref={searchRef}
          type="text"
          className={styles.searchBox}
          placeholder='Search libraries (e.g. "FastLED")'
          value={query}
          onChange={handleQueryChange}
        />
        <button className={styles.addBtn} onClick={handleAddClick} title="Search for a library to add">
          +
        </button>
      </div>

      {/* Installed libraries */}
      {installed.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            Installed Libraries ({installed.length})
          </div>
          <div className={styles.installedList}>
            {installed.map((name) => (
              <div key={name} className={styles.installedItem}>
                <span className={styles.installedName}>{name}</span>
                <button
                  className={styles.removeBtn}
                  onClick={() => removeLibrary(name)}
                  title={`Remove ${name}`}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search results */}
      {loading && <div className={styles.loading}>Searching...</div>}

      {!loading && searched && results.length === 0 && (
        <div className={styles.hint}>No libraries found for &ldquo;{query}&rdquo;</div>
      )}

      {!loading && results.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Search Results</div>
          <div className={styles.resultsList}>
            {results.map((lib) => {
              const isInstalled = installedSet.has(lib.name.toLowerCase());
              return (
                <div key={lib.name} className={styles.resultItem}>
                  <div className={styles.resultInfo}>
                    <div className={styles.resultName}>{lib.name}</div>
                    <div className={styles.resultMeta}>
                      by {lib.author} &middot; {lib.category}
                    </div>
                    {lib.sentence && (
                      <div className={styles.resultDesc}>{lib.sentence}</div>
                    )}
                  </div>
                  {isInstalled ? (
                    <button className={styles.resultAdded}>Added</button>
                  ) : (
                    <button
                      className={styles.resultAdd}
                      onClick={() => addLibrary(lib.name)}
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state when nothing searched */}
      {!searched && installed.length === 0 && !loading && (
        <div className={styles.emptyState}>
          Search for an Arduino library above to add it to your project.
          <br />
          Libraries are saved to <strong>libraries.txt</strong>.
        </div>
      )}
    </div>
  );
}
