import { AVRIOPort, AVRUSART, AVRTWI, AVRADC, CPU } from "avr8js";

export interface PinInfo {
  port: "portB" | "portC" | "portD";
  pin: number; // 0-7 within port
}

/** Common interface for AVRRunner and AVRDebugRunner — what wiring/sims need. */
export interface AVRRunnerLike {
  readonly cpu: CPU;
  readonly portB: AVRIOPort;
  readonly portC: AVRIOPort;
  readonly portD: AVRIOPort;
  readonly usart: AVRUSART;
  readonly twi: AVRTWI;
  readonly adc: AVRADC;
  readonly speed: number;
}

/**
 * Map Arduino Uno pin names to avr8js port + pin number.
 *
 * Digital: D0-D7 = portD 0-7, D8-D13 = portB 0-5
 * Analog:  A0-A5 = portC 0-5
 */
export function mapArduinoPin(pinName: string): PinInfo | null {
  // Clean up the pin name (remove suffixes like ".1", ".l", ".r")
  const clean = pinName.replace(/\.\d+$/, "").replace(/\.[lr]$/, "");

  // Digital pins: plain numbers or "D" prefix
  const digitalMatch = clean.match(/^D?(\d+)$/);
  if (digitalMatch) {
    const num = parseInt(digitalMatch[1], 10);
    if (num >= 0 && num <= 7) return { port: "portD", pin: num };
    if (num >= 8 && num <= 13) return { port: "portB", pin: num - 8 };
    return null;
  }

  // Analog pins
  const analogMatch = clean.match(/^A(\d+)$/);
  if (analogMatch) {
    const num = parseInt(analogMatch[1], 10);
    if (num >= 0 && num <= 5) return { port: "portC", pin: num };
    return null;
  }

  return null;
}

/**
 * Map ATmega328P port-style pin names to avr8js port + pin number.
 *
 * PD0-PD7 = portD 0-7, PB0-PB7 = portB 0-7, PC0-PC6 = portC 0-6
 */
export function mapAtmega328Pin(pinName: string): PinInfo | null {
  const clean = pinName.replace(/\.\d+$/, "").replace(/\.[lr]$/, "");
  const match = clean.match(/^P([BCD])(\d)$/);
  if (!match) return null;
  const [, portLetter, pinNum] = match;
  const pin = parseInt(pinNum, 10);
  if (portLetter === "D" && pin <= 7) return { port: "portD", pin };
  if (portLetter === "B" && pin <= 7) return { port: "portB", pin };
  if (portLetter === "C" && pin <= 6) return { port: "portC", pin };
  return null;
}

/** Get the AVRIOPort instance from a runner given a port name. */
export function getPort(runner: AVRRunnerLike, portName: PinInfo["port"]): AVRIOPort {
  return runner[portName];
}
