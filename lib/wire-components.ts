import { PinState } from "avr8js";
import type { AVRRunnerLike } from "./pin-mapping";
import {
  Diagram,
  DiagramPart,
  findComponentPins,
  findMCUs,
} from "./diagram-parser";
import { mapArduinoPin, mapAtmega328Pin, getPort, PinInfo } from "./pin-mapping";
import { SSD1306Controller } from "./ssd1306-controller";
import { HC165Simulator } from "./hc165-sim";
import { HC595Chip, HC595Chain } from "./hc595-sim";
import { ServoSimulator } from "./servo-sim";
import { I2CBus } from "./i2c-bus";
import { DHT22Simulator } from "./dht22-sim";
import { MPU6050Controller } from "./mpu6050-sim";
import { BMP180Controller } from "./bmp180-sim";
import { EncoderSimulator } from "./encoder-sim";

export interface WiredComponent {
  part: DiagramPart;
  /** Called to update visual state, e.g. LED on/off */
  onStateChange?: (high: boolean) => void;
  /** Called to set button press state */
  setPressed?: (pressed: boolean) => void;
  /** Called to set slide switch state (true = toggled/ON position) */
  setState?: (on: boolean) => void;
  /** Called to set analog value (0-1023) for potentiometers */
  setValue?: (value: number) => void;
  /** Called with 8-element array for 7-segment display [a,b,c,d,e,f,g,dp] */
  onSegmentChange?: (values: number[]) => void;
  /** Called when servo angle changes (0-180°) */
  onAngleChange?: (angle: number) => void;
  /** Set DHT22 temperature (°C) */
  setTemperature?: (celsius: number) => void;
  /** Set DHT22 humidity (%) */
  setHumidity?: (percent: number) => void;
  /** Set BMP180 pressure (Pa) */
  setPressure?: (pascals: number) => void;
  /** Set MPU6050 accelerometer (g) */
  setAccel?: (x: number, y: number, z: number) => void;
  /** Set MPU6050 gyroscope (°/s) */
  setGyro?: (x: number, y: number, z: number) => void;
  /** Encoder: step clockwise */
  stepCW?: () => void;
  /** Encoder: step counter-clockwise */
  stepCCW?: () => void;
  /** Encoder: press button */
  pressEncoderButton?: () => void;
  /** Encoder: release button */
  releaseEncoderButton?: () => void;
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
  runner: AVRRunnerLike,
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
    } else if (part.type === "wokwi-servo") {
      // Servo: measure PWM pulse width on the signal pin
      const servo = new ServoSimulator(runner, pinInfo);
      servo.onAngleChange = (angle) => wc.onAngleChange?.(angle);
      wc.cleanup = () => servo.dispose();
    } else if (part.type === "wokwi-dht22") {
      // DHT22: one-wire protocol on the SDA pin
      const dht = new DHT22Simulator(runner, pinInfo);
      wc.setTemperature = (c: number) => dht.setTemperature(c);
      wc.setHumidity = (h: number) => dht.setHumidity(h);
      wc.cleanup = () => dht.dispose();
    } else if (part.type === "wokwi-potentiometer" || part.type === "wokwi-slide-potentiometer") {
      // Potentiometer: analog input via ADC
      // SIG pin connects to an analog pin (A0-A5 = portC 0-5 = ADC channel 0-5)
      if (pinInfo.port === "portC" && pinInfo.pin <= 5) {
        const channel = pinInfo.pin;
        const initialValue = parseInt(part.attrs.value || "0", 10);
        // ADC channelValues are in volts (0-5V). Map 0-1023 to 0-5V.
        runner.adc.channelValues[channel] = (initialValue / 1023) * 5;
        wc.setValue = (value: number) => {
          runner.adc.channelValues[channel] = (Math.max(0, Math.min(1023, value)) / 1023) * 5;
        };
      }
    }

    wired.set(part.id, wc);
  }

  // --- I2C components ---
  const i2cBus = new I2CBus(runner.twi);
  let hasI2C = false;

  for (const part of diagram.parts) {
    if (part.type === "wokwi-ssd1306") {
      const controller = new SSD1306Controller(runner.twi);
      i2cBus.addDevice(0x3c, controller);
      hasI2C = true;
      wired.set(part.id, {
        part,
        ssd1306: controller,
        cleanup: () => controller.dispose(),
      });
    }
  }

  for (const part of diagram.parts) {
    if (part.type === "wokwi-mpu6050") {
      const controller = new MPU6050Controller(runner.twi);
      i2cBus.addDevice(0x68, controller);
      hasI2C = true;
      wired.set(part.id, {
        part,
        setAccel: (x, y, z) => controller.setAccel(x, y, z),
        setGyro: (x, y, z) => controller.setGyro(x, y, z),
        cleanup: () => {},
      });
    }
  }

  for (const part of diagram.parts) {
    if (part.type === "wokwi-bmp180") {
      const addr = parseInt(part.attrs.address || "0x77", 16);
      const controller = new BMP180Controller(runner.twi, addr);
      i2cBus.addDevice(addr, controller);
      hasI2C = true;
      const initTemp = parseFloat(part.attrs.temperature || "24");
      const initPressure = parseFloat(part.attrs.pressure || "101325");
      controller.setTemperature(initTemp);
      controller.setPressure(initPressure);
      wired.set(part.id, {
        part,
        setTemperature: (c: number) => controller.setTemperature(c),
        setPressure: (p: number) => controller.setPressure(p),
        cleanup: () => {},
      });
    }
  }

  if (hasI2C) {
    runner.twi.eventHandler = i2cBus;
  }

  // --- 74HC165 shift registers ---
  wireHC165(runner, diagram, resolvedMcuId!, pinMapper, wired);

  // --- 74HC595 shift registers ---
  wireHC595(runner, diagram, resolvedMcuId!, pinMapper, wired);

  // --- Rotary encoders ---
  wireEncoders(runner, diagram, resolvedMcuId!, pinMapper, wired);

  return wired;
}

/**
 * Detect and wire 74HC165 shift register parts.
 * Traces connections to find MCU pins for PL/CP/Q7 and switch inputs for D0-D7.
 */
function wireHC165(
  runner: AVRRunnerLike,
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
 * Detect and wire 74HC595 shift register parts, including daisy chains.
 *
 * Builds chains by following Q7S→DS connections between 595s.
 * Connects Q0-Q7 outputs to LEDs and 7-segment displays.
 */
function wireHC595(
  runner: AVRRunnerLike,
  diagram: Diagram,
  mcuId: string,
  pinMapper: (name: string) => PinInfo | null,
  wired: Map<string, WiredComponent>,
) {
  // Collect all 595 parts and their connections
  const sr595Parts: DiagramPart[] = [];
  const sr595Conns = new Map<string, Map<string, string[]>>();
  for (const part of diagram.parts) {
    if (part.type !== "wokwi-74hc595") continue;
    sr595Parts.push(part);
    sr595Conns.set(part.id, findPartConnections(diagram, part.id));
  }
  if (sr595Parts.length === 0) return;

  // Helper to resolve an MCU pin from a 595's pin connections
  const resolveMcuPin = (partId: string, pinName: string): PinInfo | null => {
    const conns = sr595Conns.get(partId)!;
    const targets = conns.get(pinName);
    if (!targets) return null;
    for (const ref of targets) {
      const [refPart, refPin] = ref.split(":");
      if (refPart === mcuId) return pinMapper(refPin);
    }
    return null;
  };

  // Helper to resolve an MCU pin by following shared connections between 595s
  // (e.g. sr2:SHCP → sr1:SHCP → MCU pin)
  const resolveMcuPinTransitive = (partId: string, pinName: string): PinInfo | null => {
    const direct = resolveMcuPin(partId, pinName);
    if (direct) return direct;
    // Follow connection to another 595 with the same pin name
    const conns = sr595Conns.get(partId)!;
    const targets = conns.get(pinName);
    if (!targets) return null;
    for (const ref of targets) {
      const [refPart, refPin] = ref.split(":");
      if (sr595Conns.has(refPart) && refPin === pinName) {
        const indirect = resolveMcuPinTransitive(refPart, pinName);
        if (indirect) return indirect;
      }
    }
    return null;
  };

  // Build daisy chains: find Q7S→DS links between 595s
  // downstream[A] = B means A:Q7S → B:DS (A feeds B)
  const downstream = new Map<string, string>();
  const hasUpstream = new Set<string>();
  for (const part of sr595Parts) {
    const conns = sr595Conns.get(part.id)!;
    const q7sTargets = conns.get("Q7S");
    if (!q7sTargets) continue;
    for (const ref of q7sTargets) {
      const [refPart, refPin] = ref.split(":");
      if (refPin === "DS" && sr595Conns.has(refPart)) {
        downstream.set(part.id, refPart);
        hasUpstream.add(refPart);
      }
    }
  }

  // Find chain heads (595s whose DS connects to MCU, not to another 595)
  const processed = new Set<string>();
  for (const part of sr595Parts) {
    if (hasUpstream.has(part.id)) continue; // not a head
    if (processed.has(part.id)) continue;

    // Build chain from head
    const chainIds: string[] = [];
    let current: string | undefined = part.id;
    while (current && !processed.has(current)) {
      chainIds.push(current);
      processed.add(current);
      current = downstream.get(current);
    }

    // Resolve MCU pins from the head (or transitively for shared clocks)
    const dsPin = resolveMcuPin(chainIds[0], "DS");
    const shcpPin = resolveMcuPinTransitive(chainIds[0], "SHCP");
    const stcpPin = resolveMcuPinTransitive(chainIds[0], "STCP");
    if (!dsPin || !shcpPin || !stcpPin) continue;

    // Create chips and chain
    const chips: HC595Chip[] = chainIds.map(() => new HC595Chip());
    const chain = new HC595Chain(runner, dsPin, shcpPin, stcpPin, chips);

    // Wire each chip's Q outputs to LEDs and 7-segment displays
    for (let ci = 0; ci < chainIds.length; ci++) {
      const chipId = chainIds[ci];
      const chip = chips[ci];
      const conns = sr595Conns.get(chipId)!;

      wireHC595Outputs(chip, chipId, conns, wired);

      // Set cleanup on the 595's wired component
      const wc = wired.get(chipId) || { part: sr595Parts.find((p) => p.id === chipId)! };
      wired.set(chipId, wc);
    }

    // Attach chain cleanup to the head 595
    const headWc = wired.get(chainIds[0])!;
    const existingCleanup = headWc.cleanup;
    headWc.cleanup = () => {
      existingCleanup?.();
      chain.dispose();
    };
  }
}

/** Segment pin name → index in the values array [A,B,C,D,E,F,G,DP] */
const SEG_PIN_INDEX: Record<string, number> = {
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5, G: 6, DP: 7,
};

/**
 * Wire a single HC595 chip's Q0-Q7 outputs to connected LEDs and 7-segment displays.
 */
function wireHC595Outputs(
  chip: HC595Chip,
  chipId: string,
  conns: Map<string, string[]>,
  wired: Map<string, WiredComponent>,
) {
  const ledMap: { bit: number; wcId: string }[] = [];
  // segMap: { segPartId → { bit → segIndex } }
  const segMap = new Map<string, { bit: number; segIndex: number }[]>();

  for (let bit = 0; bit < 8; bit++) {
    const qTargets = conns.get(`Q${bit}`);
    if (!qTargets) continue;
    for (const ref of qTargets) {
      const [targetId, targetPin] = ref.split(":");
      const targetWc = wired.get(targetId);
      if (!targetWc) continue;

      if (targetWc.part.type === "wokwi-led") {
        ledMap.push({ bit, wcId: targetId });
      } else if (targetWc.part.type === "wokwi-7segment") {
        const segIndex = SEG_PIN_INDEX[targetPin];
        if (segIndex !== undefined) {
          let entries = segMap.get(targetId);
          if (!entries) { entries = []; segMap.set(targetId, entries); }
          entries.push({ bit, segIndex });
        }
      }
    }
  }

  chip.onOutputChange = (outputs: boolean[]) => {
    // Update LEDs
    for (const { bit, wcId } of ledMap) {
      const ledWc = wired.get(wcId);
      ledWc?.onStateChange?.(outputs[bit]);
    }
    // Update 7-segment displays
    for (const [segId, entries] of segMap) {
      const segWc = wired.get(segId);
      if (!segWc?.onSegmentChange) continue;
      // Build segment values array — common-anode: LOW (false) = segment ON
      const values = new Array(8).fill(0);
      for (const { bit, segIndex } of entries) {
        values[segIndex] = outputs[bit] ? 0 : 1; // invert for common-anode
      }
      segWc.onSegmentChange(values);
    }
  };
}

/**
 * Detect and wire KY-040 rotary encoder parts.
 * Traces connections to find MCU pins for CLK, DT, and SW.
 */
function wireEncoders(
  runner: AVRRunnerLike,
  diagram: Diagram,
  mcuId: string,
  pinMapper: (name: string) => PinInfo | null,
  wired: Map<string, WiredComponent>,
) {
  for (const part of diagram.parts) {
    if (part.type !== "wokwi-ky-040") continue;

    const conns = findPartConnections(diagram, part.id);

    const resolveMcuPin = (pinName: string): PinInfo | null => {
      const targets = conns.get(pinName);
      if (!targets) return null;
      for (const ref of targets) {
        const [refPart, refPin] = ref.split(":");
        if (refPart === mcuId) return pinMapper(refPin);
      }
      return null;
    };

    const clkPin = resolveMcuPin("CLK");
    const dtPin = resolveMcuPin("DT");
    if (!clkPin || !dtPin) continue;

    const swPin = resolveMcuPin("SW");

    const encoder = new EncoderSimulator(runner, clkPin, dtPin, swPin);

    const wc: WiredComponent = {
      part,
      stepCW: () => encoder.stepCW(),
      stepCCW: () => encoder.stepCCW(),
      pressEncoderButton: () => encoder.pressButton(),
      releaseEncoderButton: () => encoder.releaseButton(),
      cleanup: () => encoder.dispose(),
    };
    wired.set(part.id, wc);
  }
}

/** Cleanup all listeners. */
export function cleanupWiring(wired: Map<string, WiredComponent>) {
  for (const wc of wired.values()) {
    wc.cleanup?.();
  }
  wired.clear();
}
