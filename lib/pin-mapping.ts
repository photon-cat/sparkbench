import { AVRIOPort } from "avr8js";
import { AVRRunner } from "./avr-runner";

export interface PinInfo {
  port: "portB" | "portC" | "portD";
  pin: number; // 0-7 within port
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

/** Get the AVRIOPort instance from a runner given a port name. */
export function getPort(runner: AVRRunner, portName: PinInfo["port"]): AVRIOPort {
  return runner[portName];
}
