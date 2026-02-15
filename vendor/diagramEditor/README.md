# Sparkbench Editor

A Wokwi-compatible schematic/diagram editor for designing and editing circuit diagrams. Part of the [Sparkbench](https://github.com/photon-cat/sparkbench) project.

## Features

- **Wokwi-compatible format** — reads and writes standard `diagram.json` files used by [Wokwi](https://wokwi.com)
- **Part placement** — drag-and-drop parts from the catalog, snap to 0.1" grid
- **Wire drawing** — click pin-to-pin to route orthogonal wires with L-bend auto-routing
- **Logic gates** — NOT, AND, OR, XOR, NAND, NOR, XNOR, MUX, flip-flops
- **Power symbols** — VCC, GND, junctions
- **DIP chips** — generic DIP packages (8, 14, 16, 20, 28, 40 pin)
- **Import/Export** — load and save Wokwi `diagram.json` files
- **Copy/Paste** — clipboard support using Wokwi's JSON clipboard format
- **Undo/Redo** — full history with Ctrl+Z / Ctrl+Y
- **Wire editing** — select wires, drag segments, change colors with keyboard shortcuts
- **Rulers & grid** — inch-based rulers with configurable dot grid

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `W` | Switch to wire drawing mode |
| `Escape` | Cancel wire / deselect / back to cursor |
| `A` | Toggle part catalog |
| `R` | Rotate selected part 90 degrees |
| `D` | Duplicate selected part |
| `Delete` | Delete selected part or wire |
| `G` | Toggle grid |
| `F` | Fit diagram to window |
| `+` / `-` | Zoom in / out |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+S` | Save |
| `0-9`, `c`, `l`, `m`, `p`, `y` | Change selected wire color |

## Wire Color Shortcuts

Per Wokwi spec: `0`=black, `1`=brown, `2`=red, `3`=orange, `4`=gold, `5`=green, `6`=blue, `7`=violet, `8`=gray, `9`=white, `c`=cyan, `l`=limegreen, `m`=magenta, `p`=purple, `y`=yellow.

## Development

```bash
npm install
npm run dev
```

## Architecture

- `src/App.tsx` — main app state, part/wire mutations, undo/redo
- `src/components/DiagramCanvas.tsx` — canvas rendering, pan/zoom, pin detection, wire SVG overlay
- `src/components/LogicGates.ts` — custom elements for logic gates, junctions, power symbols
- `src/components/DipChip.ts` — generic DIP package custom elements
- `src/hooks/useWireDrawing.ts` — wire drawing state machine with L-bend routing
- `src/hooks/useDragParts.ts` — part drag-and-drop with grid snapping
- `src/lib/wire-renderer.ts` — wire path computation from Wokwi h/v hint segments
- `src/lib/diagram-types.ts` — TypeScript types for the diagram model
- `src/lib/diagram-io.ts` — Wokwi diagram.json import/export
- `src/lib/constants.ts` — grid constants and snap helpers
