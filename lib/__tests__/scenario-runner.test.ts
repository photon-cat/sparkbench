import { describe, it, expect } from "vitest";
import { parseScenario } from "../scenario-runner";

describe("parseScenario", () => {
  it("parses a basic scenario YAML", () => {
    const yaml = `
name: test scenario
version: 1
steps:
  - delay: 1000
  - wait-serial: "Hello"
    timeout: 3000
  - expect-serial: "World"
`;
    const scenario = parseScenario(yaml);
    expect(scenario.name).toBe("test scenario");
    expect(scenario.version).toBe(1);
    expect(scenario.steps).toHaveLength(3);
  });

  it("parses delay steps", () => {
    const yaml = `
name: delay test
version: 1
steps:
  - delay: 500
`;
    const scenario = parseScenario(yaml);
    const step = scenario.steps[0] as { delay: number };
    expect(step.delay).toBe(500);
  });

  it("parses set-control steps", () => {
    const yaml = `
name: control test
version: 1
steps:
  - set-control:
      part-id: encoder1
      control: rotate-cw
      value: 7
`;
    const scenario = parseScenario(yaml);
    const step = scenario.steps[0] as { "set-control": { "part-id": string; control: string; value: number } };
    expect(step["set-control"]["part-id"]).toBe("encoder1");
    expect(step["set-control"].control).toBe("rotate-cw");
    expect(step["set-control"].value).toBe(7);
  });

  it("parses wait-serial with timeout", () => {
    const yaml = `
name: serial test
version: 1
steps:
  - wait-serial: "=== BOOT ==="
    timeout: 5000
`;
    const scenario = parseScenario(yaml);
    const step = scenario.steps[0] as { "wait-serial": string; timeout: number };
    expect(step["wait-serial"]).toBe("=== BOOT ===");
    expect(step.timeout).toBe(5000);
  });

  it("parses expect-display steps", () => {
    const yaml = `
name: display test
version: 1
steps:
  - expect-display:
      part-id: oled1
      min-filled: 20
`;
    const scenario = parseScenario(yaml);
    const step = scenario.steps[0] as { "expect-display": { "part-id": string; "min-filled": number } };
    expect(step["expect-display"]["part-id"]).toBe("oled1");
    expect(step["expect-display"]["min-filled"]).toBe(20);
  });

  it("parses send-serial and clear-serial steps", () => {
    const yaml = `
name: serial io test
version: 1
steps:
  - send-serial: "7 3 9"
  - clear-serial: true
`;
    const scenario = parseScenario(yaml);
    expect(scenario.steps).toHaveLength(2);
    const send = scenario.steps[0] as { "send-serial": string };
    expect(send["send-serial"]).toBe("7 3 9");
    const clear = scenario.steps[1] as { "clear-serial": boolean };
    expect(clear["clear-serial"]).toBe(true);
  });
});
