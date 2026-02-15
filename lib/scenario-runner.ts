/**
 * Headless automation scenario runner for SparkBench.
 *
 * Parses YAML scenario files and executes steps against an AVR simulation.
 * Supports: delay, set-control, wait-serial, expect-serial.
 */

import * as yaml from "js-yaml";
import { AVRRunner } from "./avr-runner";
import { Diagram, parseDiagram } from "./diagram-parser";
import { wireComponents, cleanupWiring, WiredComponent } from "./wire-components";

// --- Scenario types ---

interface StepDelay {
  delay: number; // milliseconds
}

interface StepSetControl {
  "set-control": {
    "part-id": string;
    control: string; // "state" for switches, "pressed" for buttons
    value: number | boolean;
  };
}

interface StepWaitSerial {
  "wait-serial": string;
  timeout?: number; // ms, default 5000
}

interface StepExpectSerial {
  "expect-serial": string;
}

type ScenarioStep = StepDelay | StepSetControl | StepWaitSerial | StepExpectSerial;

export interface Scenario {
  name: string;
  version: number;
  steps: ScenarioStep[];
}

export interface StepResult {
  step: number;
  description: string;
  passed: boolean;
  error?: string;
}

export interface ScenarioResult {
  name: string;
  passed: boolean;
  steps: StepResult[];
  serialOutput: string;
}

export function parseScenario(yamlContent: string): Scenario {
  return yaml.load(yamlContent) as Scenario;
}

/**
 * Run a scenario headlessly against a compiled HEX.
 */
export function runScenario(
  hex: string,
  diagram: Diagram,
  scenario: Scenario,
): ScenarioResult {
  const runner = new AVRRunner(hex);
  const wired = wireComponents(runner, diagram);

  let serialOutput = "";
  runner.usart.onByteTransmit = (byte: number) => {
    serialOutput += String.fromCharCode(byte);
  };

  const results: StepResult[] = [];
  let allPassed = true;

  // Run some initial cycles to let the MCU boot and set up
  runner.runMs(10);

  for (let i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    const result = executeStep(runner, wired, step, i, () => serialOutput);

    results.push(result);
    if (!result.passed) {
      allPassed = false;
      break; // Stop on first failure
    }

    // Capture serial after step
    serialOutput = serialOutput; // (already accumulated)
  }

  cleanupWiring(wired);
  runner.stop();

  return {
    name: scenario.name,
    passed: allPassed,
    steps: results,
    serialOutput,
  };
}

function executeStep(
  runner: AVRRunner,
  wired: Map<string, WiredComponent>,
  step: ScenarioStep,
  index: number,
  getSerial: () => string,
): StepResult {
  if ("delay" in step) {
    const ms = step.delay;
    runner.runMs(ms);
    return { step: index, description: `delay ${ms}ms`, passed: true };
  }

  if ("set-control" in step) {
    const { "part-id": partId, control, value } = step["set-control"];
    const wc = wired.get(partId);
    if (!wc) {
      return {
        step: index,
        description: `set-control ${partId}.${control} = ${value}`,
        passed: false,
        error: `Part "${partId}" not found`,
      };
    }

    if (control === "state" && wc.setState) {
      wc.setState(!!value);
    } else if (control === "pressed" && wc.setPressed) {
      wc.setPressed(!!value);
    } else {
      return {
        step: index,
        description: `set-control ${partId}.${control} = ${value}`,
        passed: false,
        error: `Control "${control}" not supported on part "${partId}"`,
      };
    }

    return {
      step: index,
      description: `set-control ${partId}.${control} = ${value}`,
      passed: true,
    };
  }

  if ("wait-serial" in step) {
    const expected = step["wait-serial"];
    const timeout = step.timeout ?? 5000;
    const cyclesPerMs = runner.speed / 1000;
    const maxCycles = timeout * cyclesPerMs;
    const batchCycles = 1000; // Run in small batches to check serial frequently
    let cyclesRun = 0;

    while (cyclesRun < maxCycles) {
      runner.runCycles(batchCycles);
      cyclesRun += batchCycles;

      if (getSerial().includes(expected)) {
        return {
          step: index,
          description: `wait-serial "${expected}"`,
          passed: true,
        };
      }
    }

    return {
      step: index,
      description: `wait-serial "${expected}"`,
      passed: false,
      error: `Timeout (${timeout}ms) waiting for "${expected}". Serial output:\n${getSerial()}`,
    };
  }

  if ("expect-serial" in step) {
    const expected = step["expect-serial"];
    const serial = getSerial();
    if (serial.includes(expected)) {
      return {
        step: index,
        description: `expect-serial "${expected}"`,
        passed: true,
      };
    }
    return {
      step: index,
      description: `expect-serial "${expected}"`,
      passed: false,
      error: `Serial output does not contain "${expected}". Got:\n${serial}`,
    };
  }

  return {
    step: index,
    description: `unknown step type`,
    passed: false,
    error: `Unrecognized step: ${JSON.stringify(step)}`,
  };
}
