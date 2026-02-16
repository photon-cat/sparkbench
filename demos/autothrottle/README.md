# Autothrottle Demo

Pitot-static airspeed measurement with PID-controlled throttle, interfaced to an external Python airplane simulator via the SparkBench WebSocket API.

## Components

| Part | Type | Role |
|---|---|---|
| BMP180 (0x77) | Pitot sensor | Total pressure (static + dynamic) |
| BMP180 (0x76) | Static sensor | Ambient pressure |
| SSD1306 OLED | Display | IAS, target speed, A/T status, throttle bar |
| KY-040 Encoder | Input | Dial target speed (5kt increments) |
| Servo (pin 9) | Output | Throttle position (0°=idle, 180°=full) |

## How It Works

### Airspeed Measurement
Two BMP180 sensors simulate a pitot-static system:
- **Pitot** measures total pressure (static + dynamic)
- **Static** measures ambient pressure
- IAS = `sqrt(2 * (Pt - Ps) / rho) * 1.94384` (knots)

### PID Controller
When engaged, a PID controller (Kp=1.5, Ki=0.3, Kd=0.5) adjusts the throttle servo to maintain the target airspeed. Anti-windup clamping prevents integral saturation.

### External Interface
The SparkBench WebSocket API (`scripts/serve-api.ts`) runs the AVR simulation headlessly and exposes sensor controls. The Python airplane sim (`scripts/airplane-sim.py`) closes the loop:

```
Arduino PID → Servo position → Python reads throttle
    ↑                              ↓
    ← Pitot pressure ← Python computes airspeed
```

## Running

### Browser (simulation only)
```bash
npm run dev
# Open http://localhost:3000/projects/autothrottle
# Build & Run, then adjust BMP180 sliders manually
```

### With Python airplane sim (closed-loop)

Terminal 1:
```bash
npm run sparkbench -- serve autothrottle
```

Terminal 2:
```bash
python3 scripts/airplane-sim.py
```

### Controls
- **Encoder rotation**: Set target speed (60-250 kt)
- **Encoder button**: Engage/disengage autothrottle

### Serial telemetry
```
AT:READY
AT:SPD_SET=130
AT:ENGAGED
AT:IAS=128 TGT=130 THR=92 ENG
AT:DISENGAGED
```

## Python Airplane Physics

Simple point-mass model:
- Mass: 900 kg (light single engine)
- Max thrust: 2500 N
- Drag: `0.5 * rho * V² * Cd*A` (Cd*A = 1.2 m²)
- Timestep: 50 ms
- Feeds pitot pressure = static + dynamic back to BMP180 sim

## New Simulation Features

- **BMP180 sensor** (`lib/bmp180-sim.ts`): Full I2C register protocol with calibration EEPROM, configurable address (0x76/0x77)
- **WebSocket API** (`scripts/serve-api.ts`): Headless AVR sim with JSON control protocol for external programs
- **`sparkbench serve`** CLI command: Runs any project as an API server
