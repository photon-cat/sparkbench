# SparkBench Quickstart

Tested on Ubuntu 24.04 with Python 3.13.

## Prerequisites

- **Python 3** with pip (for PlatformIO)
- **Node.js 20+** (Next.js 16 hard-requires it; Node 18 will refuse to start)
- **Git**

## 1. Install Node.js 20+ (if not already present)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Load nvm (or restart your terminal)
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"

# Install and use Node 20
nvm install 20
nvm use 20
```

## 2. Install PlatformIO Core

```bash
pip3 install platformio
```

Verify it's available:

```bash
pio --version
# PlatformIO Core, version 6.1.x
```

PlatformIO will auto-install the AVR toolchain on first build.

## 3. Clone and install dependencies

```bash
git clone https://github.com/photon-cat/sparkbench.git
cd sparkbench
npm install
```

You'll see engine warnings about Node 22 from one package (`camera-controls`) — these are safe to ignore.

## 4. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your keys:

- `ANTHROPIC_API_KEY` — required for the Sparky AI agent
- `DEEPPCB_API_KEY` — optional, enables PCB autorouting

The `PLATFORMIO_CORE_DIR` variable is optional and defaults to `~/.platformio`.

## 5. Start the dev server

```bash
npm run dev
```

The app starts at **http://localhost:3000** (Turbopack, typically ready in ~1-2s).

## 6. Verify builds work

Open any project in the browser (e.g. http://localhost:3000/projects/blink) and click **Build & Run**. The build compiles the Arduino sketch via PlatformIO and runs it in the AVR emulator.

You can also test from the command line:

```bash
mkdir -p _build/src
cp projects/blink/sketch.ino _build/src/sketch.ino
pio run -d _build
```

## Troubleshooting

| Problem | Fix |
|---|---|
| `Node.js version ">=20.9.0" is required` | Install Node 20+ via nvm (step 1) |
| `pio: command not found` | Run `pip3 install platformio` or check your PATH |
| Build fails with missing libraries | PlatformIO auto-installs deps on first run; ensure internet access |
| `.env.local` not picked up | Restart the dev server after editing `.env.local` |

## Project structure (key paths)

```
app/           → Next.js app (pages + API routes)
components/    → React components (editors, simulator, chat)
lib/           → Core logic (AVR runner, PCB parser, simulation)
projects/      → Demo projects (blink, simon-game, combo-safe, etc.)
_build/        → PlatformIO build directory
vendor/        → Vendored dependencies (KiCanvas fork)
scripts/       → CLI tools (sparkbench-cli, fuzzer, scenario runner)
```

## CLI tools

```bash
# List all projects
npm run sparkbench -- list

# Run a test scenario
npm run sparkbench -- test <project-name>

# Run AI security fuzzer on a project
npm run sparkbench -- fuzz <project-name>
```
