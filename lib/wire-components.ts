import { PinState } from "avr8js";
import { AVRRunner } from "./avr-runner";
import {
  Diagram,
  DiagramPart,
  findComponentPins,
} from "./diagram-parser";
import { mapArduinoPin, getPort } from "./pin-mapping";
import { SSD1306Controller } from "./ssd1306-controller";

export interface WiredComponent {
  part: DiagramPart;
  /** Called to update visual state, e.g. LED on/off */
  onStateChange?: (high: boolean) => void;
  /** Called to set button press state */
  setPressed?: (pressed: boolean) => void;
  /** Called with 8-element array for 7-segment display [a,b,c,d,e,f,g,dp] */
  onSegmentChange?: (values: number[]) => void;
  /** SSD1306 controller — set onFrameReady to receive display updates */
  ssd1306?: SSD1306Controller;
  /** Cleanup listener */
  cleanup?: () => void;
}

/**
 * Wire diagram components to avr8js GPIO.
 * Returns a map of componentId -> WiredComponent for the caller to bind UI callbacks.
 */
export function wireComponents(
  runner: AVRRunner,
  diagram: Diagram
): Map<string, WiredComponent> {
  const pinMap = findComponentPins(diagram);
  const wired = new Map<string, WiredComponent>();

  for (const part of diagram.parts) {
    const arduinoPin = pinMap.get(part.id);
    if (!arduinoPin) {
      // No MCU connection (e.g. shift register sub-components, 7-segment)
      wired.set(part.id, { part });
      continue;
    }

    const pinInfo = mapArduinoPin(arduinoPin);
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

  return wired;
}

/** Cleanup all listeners. */
export function cleanupWiring(wired: Map<string, WiredComponent>) {
  for (const wc of wired.values()) {
    wc.cleanup?.();
  }
  wired.clear();
}
