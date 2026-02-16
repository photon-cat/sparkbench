# SparkBench

**All-in-one hardware development platform powered by Claude Opus 4.6**

SparkBench combines what normally takes 5 separate tools into one browser-based workbench: a code editor, circuit simulator, MCU emulator, EDA/PCB designer, and an AI engineering partner — all working together so you can go from idea to tested hardware in minutes instead of days.

## What It Does

- **Prompt-to-Circuit**: Describe what you want to build. Sparky (the AI agent) designs the schematic, writes the firmware, and presents a diff for your review.
- **Cycle-Accurate Simulation**: Run your Arduino code on an AVR emulator with 13+ simulated components (LEDs, servos, encoders, displays, sensors, shift registers).
- **PCB Design**: Auto-generate KiCAD PCB layouts from your schematic. AI-assisted floorplanning, courtyard DRC, and 3D board preview.
- **Headless CI Testing**: Write YAML test scenarios and run them against the simulator — no hardware needed. AI-powered fuzz testing presses all the buttons and reports what broke.
- **Full-Context AI Agent**: Sparky has access to your entire project (schematic, code, PCB, libraries) and can debug, refactor, add features, or explain your circuit.

## Tech Stack

- **Frontend**: Next.js 16, React 19, Monaco Editor, Three.js (3D PCB viewer), Tailwind CSS
- **Simulation**: [avr8js](https://github.com/niclas-niclas/avr8js) (AVR emulator), [@wokwi/elements](https://github.com/niclas-niclas/wokwi-elements) (component visuals)
- **PCB**: KiCAD s-expression parser/serializer, KiCanvas renderer, Clipper2 (polygon math)
- **AI**: Claude Opus 4.6 via [@anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk), custom MCP server for simulation control
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
│  │  Monitor  │  │  (KiCanvas)  │  │  (Three.js)           │  │
│  └──────────┘  └──────────────┘  └───────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  AVR Simulation Engine                                  ││
│  │  avr8js + I2C bus + SPI + USART + ADC + Timer/PWM      ││
│  │  Wire components: LED, servo, encoder, SSD1306, ...     ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  SparkBench CI                                              │
│  YAML scenarios → PlatformIO compile → headless AVR sim     │
│  set-control, wait-serial, expect-serial, expect-display    │
└─────────────────────────────────────────────────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 20+
- [PlatformIO Core](https://docs.platformio.org/en/latest/core/installation.html) (for compilation)
- Anthropic API key (for Sparky agent)

### Setup

```bash
git clone https://github.com/photon-cat/sparkbench.git
cd sparkbench
npm install
cp .env.example .env.local
# Edit .env.local with your ANTHROPIC_API_KEY
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
│   ├── api/projects/       # Project CRUD + build API
│   └── projects/[slug]/    # Workbench page
├── components/             # React components
│   ├── DiagramCanvas.tsx   # Schematic editor with wiring
│   ├── SparkyChat.tsx      # AI chat panel with diff review
│   ├── KiPCBEditor.tsx     # PCB editor (KiCanvas)
│   ├── PCB3DViewer.tsx     # 3D board viewer (Three.js)
│   └── SimulationPanel.tsx # Simulation controls + tabs
├── lib/                    # Core logic
│   ├── avr-runner.ts       # AVR emulator wrapper
│   ├── wire-components.ts  # Part simulation bindings
│   ├── scenario-runner.ts  # CI test runner
│   ├── pcb-parser.ts       # Schematic → PCB conversion
│   └── sparky-prompts.ts   # Sparky system prompt
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
