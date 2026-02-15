import { PinState } from "avr8js";
import { AVRRunner } from "./avr-runner";
import {
  Diagram,
  DiagramPart,
  findComponentPins,
  findMCUs,
} from "./diagram-parser";
import { mapArduinoPin, mapAtmega328Pin, getPort, PinInfo } from "./pin-mapping";
import { SSD1306Controller } from "./ssd1306-controller";
import { HC165Simulator } from "./hc165-sim";
import { HC595Simulator } from "./hc595-sim";

export interface WiredComponent {
  part: DiagramPart;
  /** Called to update visual state, e.g. LED on/off */
  onStateChange?: (high: boolean) => void;
  /** Called to set button press state */
  setPressed?: (pressed: boolean) => void;
  /** Called to set slide switch state (true = toggled/ON position) */
  setState?: (on: boolean) => void;
  /** Called with 8-element array for 7-segment display [a,b,c,d,e,f,g,dp] */
  onSegmentChange?: (values: number[]) => void;
  /** SSD1306 controller — set onFrameReady to receive display updates */
  ssd1306?: SSD1306Controller;
  /** Cleanup listener */
  cleanup?: () => void;
}

/**
 * Find all connections for a specific part in the diagram.
 * Returns a map of pinName -> array of "otherPartId:otherPinName" refs.
 */
function findPartConnections(
  diagram: Diagram,
  partId: string,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const prefix = `${partId}:`;
  for (const conn of diagram.connections) {
    const [a, b] = conn;
    if (a.startsWith(prefix)) {
      const pinName = a.slice(prefix.length);
      const list = map.get(pinName) || [];
      list.push(b);
      map.set(pinName, list);
    } else if (b.startsWith(prefix)) {
      const pinName = b.slice(prefix.length);
      const list = map.get(pinName) || [];
      list.push(a);
      map.set(pinName, list);
    }
  }
  return map;
}

/**
 * Wire diagram components to avr8js GPIO.
 * @param mcuId - Override which MCU part to wire to. If omitted, uses the first simulatable MCU in parts order (Wokwi convention).
 * Returns a map of componentId -> WiredComponent for the caller to bind UI callbacks.
 */
export function wireComponents(
  runner: AVRRunner,
  diagram: Diagram,
  mcuId?: string
): Map<string, WiredComponent> {
  // Auto-detect MCU if not specified: first simulatable MCU in parts order
  let resolvedMcuId = mcuId;
  let pinMapper: (name: string) => PinInfo | null = mapArduinoPin;
  if (!resolvedMcuId) {
    const mcus = findMCUs(diagram);
    const target = mcus.find((m) => m.simulatable);
    if (target) {
      resolvedMcuId = target.id;
      pinMapper = target.pinStyle === "avr-port" ? mapAtmega328Pin : mapArduinoPin;
    } else {
      resolvedMcuId = "uno"; // fallback for legacy projects
    }
  } else {
    // Determine pin mapper from the specified MCU
    const mcus = findMCUs(diagram);
    const target = mcus.find((m) => m.id === resolvedMcuId);
    if (target?.pinStyle === "avr-port") pinMapper = mapAtmega328Pin;
  }

  const pinMap = findComponentPins(diagram, resolvedMcuId);
  const wired = new Map<string, WiredComponent>();

  for (const part of diagram.parts) {
    const mcuPin = pinMap.get(part.id);
    if (!mcuPin) {
      // No MCU connection (e.g. shift register sub-components, 7-segment)
      wired.set(part.id, { part });
      continue;
    }

    const pinInfo = pinMapper(mcuPin);
    if (!pinInfo) {
      wired.set(part.id, { part });
      continue;
    }

    const port = getPort(runner, pinInfo.port);
    const wc: WiredComponent = { part };

    if (part.type === "wokwi-led") {
      // LED: listen for pin state changes
      const listener = () => {
        const state = port.pinState(pinInfo.pin);
        const high = state === PinState.High;
        wc.onStateChange?.(high);
      };
      port.addListener(listener);
      wc.cleanup = () => port.removeListener(listener);
    } else if (part.type === "wokwi-pushbutton") {
      // Button: INPUT_PULLUP (default HIGH, pressed = LOW)
      port.setPin(pinInfo.pin, true); // Pull-up default
      wc.setPressed = (pressed: boolean) => {
        port.setPin(pinInfo.pin, !pressed); // pressed=true -> LOW
      };
    } else if (part.type === "wokwi-buzzer") {
      // Buzzer: listen for pin state
      const listener = () => {
        const state = port.pinState(pinInfo.pin);
        const high = state === PinState.High;
        wc.onStateChange?.(high);
      };
      port.addListener(listener);
      wc.cleanup = () => port.removeListener(listener);
    }

    wired.set(part.id, wc);
  }

  // --- I2C components ---
  for (const part of diagram.parts) {
    if (part.type === "wokwi-ssd1306") {
      const controller = new SSD1306Controller(runner.twi);
      runner.twi.eventHandler = controller;
      wired.set(part.id, {
        part,
        ssd1306: controller,
        cleanup: () => controller.dispose(),
      });
    }
  }

  // --- 74HC165 shift registers ---
  wireHC165(runner, diagram, resolvedMcuId!, pinMapper, wired);

  // --- 74HC595 shift registers ---
  wireHC595(runner, diagram, resolvedMcuId!, pinMapper, wired);

  return wired;
}

/**
 * Detect and wire 74HC165 shift register parts.
 * Traces connections to find MCU pins for PL/CP/Q7 and switch inputs for D0-D7.
 */
function wireHC165(
  runner: AVRRunner,
  diagram: Diagram,
  mcuId: string,
  pinMapper: (name: string) => PinInfo | null,
  wired: Map<string, WiredComponent>,
) {
  for (const part of diagram.parts) {
    if (part.type !== "wokwi-74hc165") continue;

    const conns = findPartConnections(diagram, part.id);

    // Resolve MCU pin for a shift register pin name
    const resolveMcuPin = (srPinName: string): PinInfo | null => {
      const targets = conns.get(srPinName);
      if (!targets) return null;
      for (const ref of targets) {
        const [refPart, refPin] = ref.split(":");
        if (refPart === mcuId) {
          return pinMapper(refPin);
        }
      }
      return null;
    };

    const plPin = resolveMcuPin("PL");
    const cpPin = resolveMcuPin("CP");
    const q7Pin = resolveMcuPin("Q7");

    if (!plPin || !cpPin || !q7Pin) continue; // Can't wire without MCU connections

    // CE: check if connected to MCU, otherwise assume hardwired LOW (enabled)
    const cePin = resolveMcuPin("CE");

    const sim = new HC165Simulator(runner, plPin, cpPin, q7Pin, cePin);

    // Wire D0-D7 inputs from slide switches
    for (let bit = 0; bit < 8; bit++) {
      const dTargets = conns.get(`D${bit}`);
      if (!dTargets) continue;

      for (const ref of dTargets) {
        const [switchId] = ref.split(":");
        const switchWc = wired.get(switchId);
        if (!switchWc || switchWc.part.type !== "wokwi-slide-switch") continue;

        // Create setState callback for this switch that updates the HC165 input
        const capturedBit = bit;
        switchWc.setState = (on: boolean) => {
          // Default position (off): pin 1 (GND) connects to pin 2 = LOW
          // Toggled position (on): pin 3 (VCC) connects to pin 2 = HIGH
          sim.setInput(capturedBit, on);
        };
      }
    }

    // Update the wired component for the shift register with cleanup
    const existingWc = wired.get(part.id) || { part };
    const existingCleanup = existingWc.cleanup;
    existingWc.cleanup = () => {
      existingCleanup?.();
      sim.dispose();
    };
    wired.set(part.id, existingWc);
  }
}

/**
 * Detect and wire 74HC595 shift register parts.
 * Traces connections to find MCU pins for DS/SHCP/STCP and Q0-Q7 to LEDs.
 */
function wireHC595(
  runner: AVRRunner,
  diagram: Diagram,
  mcuId: string,
  pinMapper: (name: string) => PinInfo | null,
  wired: Map<string, WiredComponent>,
) {
  for (const part of diagram.parts) {
    if (part.type !== "wokwi-74hc595") continue;

    const conns = findPartConnections(diagram, part.id);

    // Resolve MCU pin for a shift register pin name
    const resolveMcuPin = (srPinName: string): PinInfo | null => {
      const targets = conns.get(srPinName);
      if (!targets) return null;
      for (const ref of targets) {
        const [refPart, refPin] = ref.split(":");
        if (refPart === mcuId) {
          return pinMapper(refPin);
        }
      }
      return null;
    };

    const dsPin = resolveMcuPin("DS");
    const shcpPin = resolveMcuPin("SHCP");
    const stcpPin = resolveMcuPin("STCP");

    if (!dsPin || !shcpPin || !stcpPin) continue;

    const sim = new HC595Simulator(runner, dsPin, shcpPin, stcpPin);

    // Map Q0-Q7 outputs to connected LEDs
    const ledMap: { bit: number; wcId: string }[] = [];
    for (let bit = 0; bit < 8; bit++) {
      const qTargets = conns.get(`Q${bit}`);
      if (!qTargets) continue;
      for (const ref of qTargets) {
        const [targetId] = ref.split(":");
        const targetWc = wired.get(targetId);
        if (targetWc && targetWc.part.type === "wokwi-led") {
          ledMap.push({ bit, wcId: targetId });
        }
      }
    }

    sim.onOutputChange = (outputs: boolean[]) => {
      for (const { bit, wcId } of ledMap) {
        const ledWc = wired.get(wcId);
        ledWc?.onStateChange?.(outputs[bit]);
      }
    };

    // Update wired component for the shift register with cleanup
    const existingWc = wired.get(part.id) || { part };
    const existingCleanup = existingWc.cleanup;
    existingWc.cleanup = () => {
      existingCleanup?.();
      sim.dispose();
    };
    wired.set(part.id, existingWc);
  }
}

/** Cleanup all listeners. */
export function cleanupWiring(wired: Map<string, WiredComponent>) {
  for (const wc of wired.values()) {
    wc.cleanup?.();
  }
  wired.clear();
}
