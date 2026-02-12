# Native .kicad_pcb Editor for Sparkbench

## Overview

Sparkbench uses `.kicad_pcb` as the native PCB storage format. The S-expression
tree (nested JS arrays from KiCanvas's tokenizer) is the in-memory source of
truth. Edits mutate the tree directly. Serialize back to `.kicad_pcb` text for
save. This eliminates the need for a custom `pcb.json` format and conversion
layers — `.kicad_pcb` files are human-readable S-expressions that KiCad,
DeepPCB, and Freerouting all understand natively.

## Architecture

```
Disk: board.kicad_pcb (text)
  ↕ listify() / serializeSExpr()
Memory: S-expr tree (List) — source of truth, mutable
  ↓ new KicadPCB(filename, tree)
Memory: KicadPCB objects — rendering + hit-testing
  ↓ BoardPainter
Screen: WebGL canvas
```

### Edit cycle

1. User interaction (drag, rotate, flip, delete) triggers a mutation
2. `structuredClone(tree)` creates an immutable snapshot for undo
3. Mutation helpers from `sexpr-mutate.ts` modify the cloned tree
4. `setPcbTree(newTree)` triggers React re-render
5. `new KicadPCB("board.kicad_pcb", newTree)` re-parses for rendering
6. `viewer.updateBoard(board)` repaints (preserves camera position)

### Key workflow

```
Schematic → Extract Netlist → initPCBFromSchematic() → buildKicadPCBTree()
  → serializeSExpr() → board.kicad_pcb
  → export to KiCad pcbnew / DeepPCB for autorouting
  → reimport routed board → view in sparkbench
```

---

## Implementation (all complete)

### Phase 1: S-Expression Infrastructure

| File | Description |
|------|-------------|
| `lib/sexpr-serializer.ts` | Serialize S-expr tree → formatted `.kicad_pcb` text. Handles inline vs block formatting, number precision, string quoting. |
| `lib/sexpr-mutate.ts` | Tree query/mutation helpers: `findChild`, `findChildren`, `findFootprintByRef`, `findFootprintByUUID`, `getAt`, `setAt`, `getLayer`, `setLayer`, `rotateFootprint`, `flipFootprint`, `appendChild`, `removeChildren`. |
| `lib/sexpr-undo.ts` | Snapshot-based undo/redo. `SExprUndoStack` uses `structuredClone(tree)` before each mutation. Max 50 snapshots. Simpler than command pattern for arbitrary tree mutations. |

### Phase 2: API Route

| File | Description |
|------|-------------|
| `app/api/projects/[slug]/pcb/route.ts` | GET/PUT for `board.kicad_pcb`. Returns `text/plain` with `X-Last-Modified` header. 404 if no PCB file exists. |
| `lib/api.ts` | Added `fetchPCB(slug)` (returns null on 404) and `savePCB(slug, text)`. |

### Phase 3: Canvas + Editor Adaptation

| File | Description |
|------|-------------|
| `components/KiPCBCanvas.tsx` | Accepts `pcbTree: List` prop. Uses `forwardRef` + `useImperativeHandle` to expose `viewer` and `canvas` refs to parent. Wraps `new KicadPCB()` in try/catch for malformed trees. |
| `components/KiPCBEditor.tsx` | Accepts `initialPcbText: string`. Parses with `listify()`. Manages `pcbTree` state. Wires up `useKiPCBDrag` hook. Inline properties panel shows board stats from tree. |
| `hooks/useKiPCBDrag.ts` | Drag/rotate/flip/delete footprints via `sexpr-mutate` helpers. Uses ref pattern to avoid stale closures. Undo/redo via `SExprUndoStack`. |

**Keyboard shortcuts** (when a footprint is selected):
- **R** — Rotate 90° CCW
- **F** — Flip F.Cu ↔ B.Cu (swaps pad layers, silkscreen, fab)
- **Delete/Backspace** — Delete footprint
- **Ctrl+Z** — Undo
- **Ctrl+Shift+Z / Ctrl+Y** — Redo

### Phase 4: Tab Integration

| File | Description |
|------|-------------|
| `app/projects/[slug]/page.tsx` | PCB state (`pcbText: string \| null`). Loads via `fetchPCB()` on mount. Saves alongside diagram + sketch on Ctrl+S. |
| `components/Workbench.tsx` | Threads `pcbText`, `onPcbChange`, `onPcbSave` props through to panels. |
| `components/SimulationPanel.tsx` | "PCB" tab renders `KiPCBEditor` (dynamic import, no SSR). |
| `components/EditorPanel.tsx` | "board.kicad_pcb" tab shows S-expr text in Monaco (plaintext mode). |

### Phase 5: Initial Board Generation

| File | Description |
|------|-------------|
| `lib/kicanvas-factory.ts` | Extracted `buildKicadPCBTree(design: PCBDesign): SExpr` — returns raw S-expr tree. `buildKicadPCB()` wraps it with `new KicadPCB()`. |

### Phase 6: SVG Board Outline Import

| File | Description |
|------|-------------|
| `lib/svg-outline-import.ts` | `svgPathToEdgeCuts(pathD, options?)` — Parses SVG path `d` attribute (M, L, H, V, Z, A, C, S, Q, T commands, absolute + relative). Produces `gr_line` Edge.Cuts S-expr nodes. Options: `{ scale?, offsetX?, offsetY? }` for unit conversion. |

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `lib/sexpr-serializer.ts` | NEW | S-expr tree → .kicad_pcb text |
| `lib/sexpr-mutate.ts` | NEW | Tree query + mutation helpers |
| `lib/sexpr-undo.ts` | NEW | Snapshot undo/redo |
| `lib/svg-outline-import.ts` | NEW | SVG path → Edge.Cuts nodes |
| `app/api/projects/[slug]/pcb/route.ts` | NEW | REST API for board.kicad_pcb |
| `lib/api.ts` | MODIFIED | +fetchPCB, +savePCB |
| `lib/kicanvas-factory.ts` | MODIFIED | +buildKicadPCBTree (extracted) |
| `components/KiPCBCanvas.tsx` | REWRITTEN | PCBDesign → List tree, forwardRef |
| `components/KiPCBEditor.tsx` | REWRITTEN | PCBDesign → S-expr tree state |
| `hooks/useKiPCBDrag.ts` | REWRITTEN | PCBDesign → sexpr-mutate |
| `app/projects/[slug]/page.tsx` | MODIFIED | +PCB state/load/save |
| `components/SimulationPanel.tsx` | MODIFIED | +PCB tab |
| `components/EditorPanel.tsx` | MODIFIED | +board.kicad_pcb tab |
| `components/Workbench.tsx` | MODIFIED | +PCB prop threading |

**Unchanged**: `editable-board-viewer.ts`, `pcb-types.ts`, `pcb-parser.ts`,
`pcb-footprints.ts`, `netlist.ts`, all KiCanvas vendor code.

**Temporarily disabled**: `pcb-drc.ts`, `ratsnest.ts` (operate on PCBDesign
type — adapt in follow-up when DRC is ported to operate on S-expr trees).

---

## Follow-up Work

- [ ] Wire `useKiPCBRouting` for trace routing (build `["segment", ...]` nodes)
- [ ] Wire `useKiPCBBoardOutline` for outline editing (replace `gr_line` Edge.Cuts nodes)
- [ ] Wire `useKiPCBZoneDraw` for copper zone drawing
- [ ] Port DRC to operate on S-expr trees instead of PCBDesign
- [ ] Port ratsnest to operate on S-expr trees
- [ ] "Generate from schematic" button when no board.kicad_pcb exists
- [ ] Bidirectional Monaco ↔ canvas sync (Monaco edits re-parse tree with debounce)
- [ ] SVG arc → gr_arc proper conversion (currently approximated as lines)
- [ ] Bezier curve discretization (currently approximated as single line to endpoint)

## Testing

1. Visit `/pcb-test` — renders test board with R1, LED1, trace, outline
2. Click footprint → status bar shows "Selected: R1"
3. Drag footprint → crosshair preview, snaps to 0.5mm grid
4. Press R → rotates 90°, F → flips to B.Cu
5. Ctrl+Z → undoes last action
6. Ctrl+S → saves to console (test page) or disk (project page)
7. Visit `/projects/<slug>` → PCB tab shows board if `board.kicad_pcb` exists
8. Editor panel → `board.kicad_pcb` tab shows S-expr text in Monaco
