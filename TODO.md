# KiPCB Editor — Remaining Work

## Done

- [x] PCBDesign v2 JSON schema (2-layer, UUIDs, nets, zones)
- [x] KiCanvas S-expression factory (`kicanvas-factory.ts`)
- [x] EditableBoardViewer subclass (rich selection, overlay painting)
- [x] KiPCBCanvas React wrapper (dynamic import, SSR-safe)
- [x] Undo/redo command stack (8 commands)
- [x] Footprint drag with grid snap + R/F/Delete shortcuts
- [x] Trace routing state machine (90/45 degree, via insertion, waypoints)
- [x] Board outline drawing + vertex editing
- [x] Zone boundary drawing
- [x] DRC checks (clearance, min width, unconnected nets)
- [x] Ratsnest computation (Union-Find connectivity)
- [x] Full editor UI (tool palette, layer panel, properties panel, status bar)
- [x] Test page at `/pcb-test`

## Browser Testing Needed

These features are built but need in-browser verification since WebGL rendering
can only be tested visually:

- [ ] Verify KiCanvas renders the test board (footprints, pads, traces, board outline)
- [ ] Verify click-to-select works for pads, footprints, traces
- [ ] Verify footprint drag moves correctly with grid snap
- [ ] Verify trace routing rubber-band preview draws
- [ ] Verify R/F keyboard shortcuts rotate/flip footprints
- [ ] Verify Ctrl+Z/Ctrl+Shift+Z undo/redo

## Integration with Sparkbench

- [ ] Add PCB tab to project workbench (`app/projects/[slug]/page.tsx`)
- [ ] Add `pcb` API route (`app/api/projects/[slug]/pcb/route.ts`) for load/save
- [ ] Auto-generate PCB from schematic netlist when no `pcb.json` exists
- [ ] Wire up Ctrl+S to save `pcb.json` through the API

## Zone Fill (clipper2-js)

- [ ] `lib/zone-fill.ts` — Polygon boolean operations for copper pour fill:
  - Clip zone boundary to board outline
  - Subtract copper items on same layer with different net (+ clearance offset)
  - Generate thermal reliefs for same-net pads (4 spoke pattern)
  - Subtract different-net pads (+ clearance)
  - Output `filledPolygons` arrays for KiCanvas ZonePainter to render
- [ ] Run zone fill after zone boundary commit and on design changes
- [ ] `clipper2-js` is already installed as a dependency

## Net Highlighting

- [ ] Click pad/trace → highlight entire net on overlay via `BoardPainter.paint_net()`
- [ ] Escape to clear net highlight
- [ ] Show net name in status bar when hovering

## Ratsnest Rendering

- [ ] Draw ratsnest lines on a `:Ratsnest` virtual layer in KiCanvas
- [ ] Update ratsnest after every edit commit
- [ ] Toggle ratsnest visibility from layer panel

## DRC Rendering

- [ ] Draw DRC violation markers (red circles) on a `:DRC` virtual layer
- [ ] Click violation in properties panel → zoom to location
- [ ] Debounced DRC recomputation after edits (already computed, needs rendering)

## Editing Hooks Wiring

- [ ] Wire `useKiPCBDrag` into `KiPCBEditor` — connect viewer ref, canvas ref, selection
- [ ] Wire `useKiPCBRouting` into `KiPCBEditor` — activate when route tool selected
- [ ] Wire `useKiPCBBoardOutline` into `KiPCBEditor` — activate when outline tool selected
- [ ] Wire `useKiPCBZoneDraw` into `KiPCBEditor` — activate when zone tool selected
- [ ] Pass `undoStack` from `KiPCBEditor` to all hooks

## Polish

- [ ] Footprint drag: paint the full footprint on overlay during drag (not just crosshair)
- [ ] Trace routing: show net name during routing, highlight connected pads
- [ ] Improve pad hit-testing to account for footprint rotation
- [ ] Via standalone tool (click to place via, auto-assign net from nearest trace/pad)
- [ ] Measure tool (click two points, show distance)
- [ ] Proper Escape handling: deselect → cancel tool → back to select
- [ ] Handle browser zoom (Ctrl+scroll) vs canvas zoom (scroll) conflict
