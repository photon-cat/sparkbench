# SparkBench

**All-in-one hardware development platform powered by Claude Opus 4.6**

SparkBench combines what normally takes 5 separate tools into one browser-based workbench: a code editor, circuit simulator, MCU emulator, EDA/PCB designer, and an AI engineering partner — all working together so you can go from idea to tested hardware in minutes instead of days.

## What It Does

- **Prompt-to-Circuit**: Describe what you want to build. Sparky (the AI agent) designs the schematic, writes the firmware, and presents a diff for your review.
- **Cycle-Accurate Simulation**: Run your Arduino code on an AVR emulator with 13+ simulated components (LEDs, servos, encoders, displays, sensors, shift registers).
- **KiCAD-Compatible PCB Editor**: Our custom-built PCB editor reads and writes native `.kicad_pcb` files. Built as a fork of KiCanvas with a full editing layer — component drag-and-drop, footprint rotation/flip, board outline editing (rectangle or SVG import), interactive trace routing, zone drawing, layer management, ratsnest display, courtyard DRC, undo/redo, and a 3D board preview. Everything stays in the KiCAD s-expression format so you can open your boards directly in KiCAD.
- **DeepPCB Autorouter Integration**: One-click AI-powered autorouting via [DeepPCB](https://deeppcb.ai). Send your board to DeepPCB's cloud autorouter directly from the PCB editor or let Sparky handle it conversationally. Extracts constraints, validates, runs placement and routing, and pulls back the routed board — all streamed with live progress.
- **Headless CI Testing**: Write YAML test scenarios and run them against the simulator — no hardware needed. AI-powered fuzz testing presses all the buttons and reports what broke.
- **Full-Context AI Agent**: Sparky has access to your entire project (schematic, code, PCB, libraries) and can debug, refactor, add features, route your PCB, or explain your circuit.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Monaco Editor, Three.js (3D PCB viewer)
- **Simulation**: [avr8js](https://github.com/niclas-niclas/avr8js) (AVR emulator), [@wokwi/elements](https://github.com/niclas-niclas/wokwi-elements) (component visuals)
- **PCB Editor**: Custom KiCanvas fork with full editing — reads/writes `.kicad_pcb` s-expression format natively. Clipper2 for polygon math, WebGL2 rendering.
- **Autorouter**: [DeepPCB](https://deeppcb.ai) MCP integration — AI-powered PCB routing via SSE transport
- **AI**: Claude Opus 4.6 via [@anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk), custom MCP server for simulation control, DeepPCB MCP server for autorouting
- **Build**: PlatformIO (AVR compilation), runs entirely in the browser except compilation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  SparkBench Web                                             │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Monaco   │  │  Diagram     │  │  Sparky Chat          │  │
│  │  Editor   │  │  Canvas      │  │  (Claude Opus 4.6)    │  │
│  │          │  │  + Wires     │  │  Agent SDK + MCP      │  │
│  └──────────┘  └──────────────┘  └───────────────────────┘  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  Serial   │  │  PCB Editor  │  │  3D Board Viewer      │  │
│  │  Monitor  │  │  (KiCanvas   │  │  (Three.js)           │  │
│  │          │  │   fork)      │  │                       │  │
│  └──────────┘  └──────────────┘  └───────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  AVR Simulation Engine                                  ││
│  │  avr8js + I2C bus + SPI + USART + ADC + Timer/PWM      ││
│  │  Wire components: LED, servo, encoder, SSD1306, ...     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  DeepPCB Autorouter (via MCP SSE)                       ││
│  │  Extract constraints → Validate → Place → Route → Done  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SparkBench CI                                              │
│  YAML scenarios → PlatformIO compile → headless AVR sim     │
│  set-control, wait-serial, expect-serial, expect-display    │
└─────────────────────────────────────────────────────────────┘
```

## PCB Editor

The PCB editor is a custom-built KiCAD-compatible editor, not a wrapper around existing tools. It reads and writes `.kicad_pcb` files natively using our own s-expression parser/serializer.

### Features

- **Component placement** — Click-to-select via pad proximity, drag with crosshair preview, grid snapping (0.5mm)
- **Footprint editing** — Rotate (R), flip front/back copper (F), delete, courtyard overlap detection
- **Board outline** — Set rectangle dimensions or upload custom SVG outlines, converted to KiCAD Edge.Cuts
- **Trace routing** — Interactive routing with orthogonal and 45° diagonal modes, via insertion, layer switching
- **Zone drawing** — Copper pour zones with net auto-detection from pad clicks
- **Layer management** — Full KiCAD layer stack (F.Cu, B.Cu, silkscreen, masks, etc.) with visibility toggles and highlighting
- **Ratsnest** — Displays unrouted connections as airline wires
- **Undo/redo** — 50-level snapshot-based undo stack
- **3D preview** — Three.js-based 3D board viewer with component models
- **Export** — Download `.kicad_pcb` files that open directly in KiCAD

### DeepPCB Autorouter

The PCB editor integrates with [DeepPCB](https://deeppcb.ai) for AI-powered autorouting. Two ways to use it:

**From the UI:** Click "Route with DeepPCB" in the PCB editor's right panel. The board is sent to DeepPCB's cloud autorouter, progress streams back in real-time, and the routed board is loaded back into the editor automatically.

**From Sparky:** Ask the AI agent to route your board (e.g., "route my PCB with DeepPCB"). Sparky uses DeepPCB's MCP tools directly — extracting constraints, validating, running placement/routing, and saving the result.

The autorouter workflow:
1. **Extract constraints** from the `.kicad_pcb` file
2. **Validate constraints** for correctness
3. **Run placement** — AI-optimized component positioning
4. **Run routing** — AI-powered trace routing
5. **Monitor progress** — live status updates streamed to the UI
6. **Retrieve result** — best routed board saved back to the project

## Getting Started

### Prerequisites

- Node.js 20+
- [PlatformIO Core](https://docs.platformio.org/en/latest/core/installation.html) (for compilation)
- Anthropic API key (for Sparky agent)
- DeepPCB API key (optional, for autorouting)

### Setup

```bash
git clone https://github.com/photon-cat/sparkbench.git
cd sparkbench
npm install
cp .env.example .env.local
# Edit .env.local with your keys:
#   ANTHROPIC_API_KEY=sk-ant-...
#   DEEPPCB_API_KEY=...          (optional, enables autorouter)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start building.

### Running CI Tests

```bash
npx tsx scripts/run-scenario.ts <project-slug>
```

## Simulated Components

| Component | Simulation |
|-----------|-----------|
| LED | GPIO state → visual on/off |
| Pushbutton | INPUT_PULLUP, interactive click |
| Potentiometer | ADC voltage via slider |
| Servo | PWM pulse width → angle display |
| Rotary Encoder (KY-040) | Quadrature CLK/DT signals |
| SSD1306 OLED | Full I2C controller, pixel display |
| 74HC595 | Serial-in/parallel-out, daisy chain |
| 74HC165 | Parallel-in/serial-out |
| DHT22 | One-wire temp/humidity with sliders |
| MPU6050 | I2C accel/gyro with sliders |
| 7-Segment Display | Via HC595 outputs |
| Buzzer | GPIO state detection |
| Slide Switch | Toggle state |

## Project Structure

```
sparkbench/
├── app/                    # Next.js app router
│   ├── api/chat/           # Sparky agent endpoint (Agent SDK)
│   ├── api/deeppcb/        # DeepPCB autorouter endpoint
│   ├── api/projects/       # Project CRUD + build API
│   └── projects/[slug]/    # Workbench page
├── components/             # React components
│   ├── DiagramCanvas.tsx   # Schematic editor with wiring
│   ├── SparkyChat.tsx      # AI chat panel with diff review
│   ├── KiPCBEditor.tsx     # PCB editor (KiCanvas fork)
│   ├── KiPCBCanvas.tsx     # WebGL2 board renderer
│   ├── KiPCBToolPalette.tsx # PCB tool sidebar
│   ├── KiPCBLayerPanel.tsx # Layer visibility/selection
│   ├── PCB3DViewer.tsx     # 3D board viewer (Three.js)
│   └── SimulationPanel.tsx # Simulation controls + tabs
├── hooks/                  # React hooks
│   ├── useKiPCBDrag.ts     # Footprint drag + courtyard DRC
│   ├── useKiPCBRouting.ts  # Interactive trace routing
│   ├── useKiPCBZoneDraw.ts # Copper zone drawing
│   └── useKiPCBBoardOutline.ts # Board outline editing
├── lib/                    # Core logic
│   ├── avr-runner.ts       # AVR emulator wrapper
│   ├── wire-components.ts  # Part simulation bindings
│   ├── scenario-runner.ts  # CI test runner
│   ├── sexpr-mutate.ts     # KiCAD s-expression tree manipulation
│   ├── sexpr-serializer.ts # S-expression → .kicad_pcb text
│   ├── deeppcb-client.ts   # DeepPCB MCP client wrapper
│   ├── pcb-parser.ts       # Schematic → PCB conversion
│   └── sparky-prompts.ts   # Sparky system prompt
├── vendor/kicanvas/        # KiCanvas fork (WebGL2 PCB renderer)
├── scripts/
│   └── run-scenario.ts     # CLI for headless testing
├── projects/               # User projects (diagram.json + sketch.ino)
└── _build/                 # PlatformIO build directory
```

## Hackathon Track

**Problem Statement Two: Break the Barriers** — Hardware development requires expensive tools (Altium, oscilloscopes), deep expertise (PCB layout, embedded C), and physical prototyping cycles. SparkBench puts the full hardware development workflow in everyone's hands with an AI partner that understands embedded systems.

## Built With

Built entirely during the [Claude Code Hackathon](https://cv.inc/e/claude-code-hackathon) using Claude Opus 4.6 and Claude Code.

## Team

- **photoncat** (Jacob Armstrong)

## License

MIT
