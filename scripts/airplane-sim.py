#!/usr/bin/env python3
"""
Mini Airplane Simulator for SparkBench Autothrottle

Connects to the SparkBench WebSocket API and simulates a simple airplane:
- Reads throttle servo position from the autothrottle controller
- Computes thrust, drag, and airspeed based on simple physics
- Feeds back pitot and static pressure to the BMP180 sensors

Physics model:
  - Thrust is proportional to throttle position (0-180° servo)
  - Drag = 0.5 * rho * V^2 * Cd * A
  - F = ma => dV/dt = (thrust - drag) / mass
  - Pitot pressure = static + 0.5 * rho * V^2 (dynamic pressure)

Usage:
  python3 scripts/airplane-sim.py [--url ws://localhost:8765]
"""

import json
import math
import time
import sys
import threading
import websocket

# === Aircraft parameters ===
MASS = 900           # kg (light single engine)
CD_A = 1.2           # Cd * frontal area (m²) — drag coefficient * area
MAX_THRUST = 2500    # N at full throttle (servo=180)
IDLE_THRUST = 50     # N at idle (servo=0)
RHO = 1.225          # kg/m³ (sea level ISA)
STATIC_PRESSURE = 101325  # Pa (sea level)
TEMPERATURE = 15     # °C (ISA sea level)

# Simulation state
airspeed_ms = 0.0    # m/s
altitude_ft = 3000   # ft (cosmetic)
dt = 0.05            # sim timestep (seconds)
throttle_angle = 0   # servo degrees (0-180)
running = True

# WebSocket state
ws_connected = False
last_serial_lines = []

# === Colors ===
GREEN = "\033[32m"
YELLOW = "\033[33m"
CYAN = "\033[36m"
RED = "\033[31m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"


def knots(ms):
    """Convert m/s to knots."""
    return ms * 1.94384


def compute_dynamic_pressure(v):
    """Dynamic pressure qc = 0.5 * rho * V²."""
    return 0.5 * RHO * v * v


def compute_thrust(servo_deg):
    """Linear thrust model from servo position."""
    frac = max(0, min(servo_deg, 180)) / 180.0
    return IDLE_THRUST + frac * (MAX_THRUST - IDLE_THRUST)


def compute_drag(v):
    """Parasitic drag D = 0.5 * rho * V² * Cd*A."""
    return 0.5 * RHO * v * abs(v) * CD_A


def physics_step():
    """Advance the physics by dt seconds."""
    global airspeed_ms

    thrust = compute_thrust(throttle_angle)
    drag = compute_drag(airspeed_ms)
    accel = (thrust - drag) / MASS

    airspeed_ms += accel * dt
    if airspeed_ms < 0:
        airspeed_ms = 0


def on_message(ws, message):
    global throttle_angle, last_serial_lines
    try:
        msg = json.loads(message)
    except json.JSONDecodeError:
        return

    if msg.get("type") == "ready":
        print(f"{GREEN}Connected to SparkBench{RESET}")
        print(f"  Project: {msg.get('project')}")
        parts = msg.get("parts", [])
        for p in parts:
            print(f"  {DIM}{p['id']:12s} {p['type']}{RESET}")
        print()

    elif msg.get("type") == "state":
        # Extract servo angle from state
        parts = msg.get("parts", {})
        for pid, info in parts.items():
            if info.get("type") == "wokwi-servo":
                throttle_angle = info.get("angle", 0)
        last_serial_lines = msg.get("serial", [])

    elif msg.get("type") == "serial":
        # Parse telemetry from autothrottle
        line = msg.get("data", "")
        if line.startswith("AT:"):
            pass  # telemetry handled in display loop

    elif msg.get("type") == "error":
        print(f"{RED}API Error: {msg.get('message')}{RESET}")


def on_error(ws, error):
    print(f"{RED}WebSocket error: {error}{RESET}")


def on_close(ws, close_status, close_msg):
    global ws_connected
    ws_connected = False
    print(f"{YELLOW}Disconnected from SparkBench{RESET}")


def on_open(ws):
    global ws_connected
    ws_connected = True


def sim_loop(ws):
    """Main simulation loop — runs physics and sends sensor updates."""
    global running

    print(f"{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN} Mini Airplane Simulator{RESET}")
    print(f"{CYAN}{'='*60}{RESET}")
    print(f"  Mass:       {MASS} kg")
    print(f"  Max thrust: {MAX_THRUST} N")
    print(f"  Altitude:   {altitude_ft} ft")
    print(f"  Static:     {STATIC_PRESSURE} Pa")
    print()

    tick = 0
    while running:
        time.sleep(dt)

        if not ws_connected:
            continue

        # Advance physics
        physics_step()

        # Compute pressures
        qc = compute_dynamic_pressure(airspeed_ms)
        pitot_pressure = STATIC_PRESSURE + qc

        # Send sensor updates to SparkBench
        try:
            # Update pitot BMP180 (total pressure)
            ws.send(json.dumps({
                "cmd": "set-control",
                "partId": "pitot",
                "control": "pressure",
                "value": round(pitot_pressure)
            }))
            # Static BMP180 stays at ambient
            ws.send(json.dumps({
                "cmd": "set-control",
                "partId": "static",
                "control": "pressure",
                "value": STATIC_PRESSURE
            }))
            # Poll state to get servo angle
            ws.send(json.dumps({"cmd": "get-state"}))
        except Exception:
            pass

        tick += 1
        # Display every 20 ticks (1 second)
        if tick % 20 == 0:
            ias_kt = knots(airspeed_ms)
            thrust = compute_thrust(throttle_angle)
            drag = compute_drag(airspeed_ms)
            thr_pct = round(throttle_angle / 180 * 100)

            print(f"\r{BOLD}IAS:{RESET} {ias_kt:6.1f} kt  "
                  f"{BOLD}THR:{RESET} {thr_pct:3d}%  "
                  f"{BOLD}T/D:{RESET} {thrust:6.0f}/{drag:6.0f} N  "
                  f"{BOLD}Qc:{RESET} {qc:7.0f} Pa  "
                  f"{BOLD}Pitot:{RESET} {pitot_pressure:8.0f} Pa",
                  end="", flush=True)


def main():
    global running

    url = "ws://localhost:8765"
    for i, arg in enumerate(sys.argv[1:], 1):
        if arg == "--url" and i < len(sys.argv) - 1:
            url = sys.argv[i + 1]

    print(f"Connecting to {url}...")

    ws = websocket.WebSocketApp(
        url,
        on_open=on_open,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )

    # Run WebSocket in a background thread
    ws_thread = threading.Thread(target=ws.run_forever, daemon=True)
    ws_thread.start()

    # Wait for connection
    for _ in range(50):
        if ws_connected:
            break
        time.sleep(0.1)

    if not ws_connected:
        print(f"{RED}Failed to connect to SparkBench API at {url}{RESET}")
        print(f"Make sure the API server is running:")
        print(f"  npm run sparkbench -- serve autothrottle")
        sys.exit(1)

    try:
        sim_loop(ws)
    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}Shutting down airplane sim...{RESET}")
        running = False
        ws.close()


if __name__ == "__main__":
    main()
