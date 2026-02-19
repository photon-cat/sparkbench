import { describe, it, expect } from "vitest";
import { mapArduinoPin, mapAtmega328Pin } from "../pin-mapping";

describe("mapArduinoPin", () => {
  it("maps digital pins D0-D7 to portD", () => {
    expect(mapArduinoPin("0")).toEqual({ port: "portD", pin: 0 });
    expect(mapArduinoPin("7")).toEqual({ port: "portD", pin: 7 });
    expect(mapArduinoPin("D3")).toEqual({ port: "portD", pin: 3 });
  });

  it("maps digital pins D8-D13 to portB", () => {
    expect(mapArduinoPin("8")).toEqual({ port: "portB", pin: 0 });
    expect(mapArduinoPin("13")).toEqual({ port: "portB", pin: 5 });
    expect(mapArduinoPin("D10")).toEqual({ port: "portB", pin: 2 });
  });

  it("maps analog pins A0-A5 to portC", () => {
    expect(mapArduinoPin("A0")).toEqual({ port: "portC", pin: 0 });
    expect(mapArduinoPin("A5")).toEqual({ port: "portC", pin: 5 });
  });

  it("strips .N suffixes", () => {
    expect(mapArduinoPin("13.1")).toEqual({ port: "portB", pin: 5 });
  });

  it("strips .l and .r suffixes", () => {
    expect(mapArduinoPin("5.l")).toEqual({ port: "portD", pin: 5 });
    expect(mapArduinoPin("5.r")).toEqual({ port: "portD", pin: 5 });
  });

  it("returns null for invalid pins", () => {
    expect(mapArduinoPin("14")).toBeNull();
    expect(mapArduinoPin("A6")).toBeNull();
    expect(mapArduinoPin("XYZ")).toBeNull();
    expect(mapArduinoPin("")).toBeNull();
  });
});

describe("mapAtmega328Pin", () => {
  it("maps PD0-PD7 to portD", () => {
    expect(mapAtmega328Pin("PD0")).toEqual({ port: "portD", pin: 0 });
    expect(mapAtmega328Pin("PD7")).toEqual({ port: "portD", pin: 7 });
  });

  it("maps PB0-PB7 to portB", () => {
    expect(mapAtmega328Pin("PB0")).toEqual({ port: "portB", pin: 0 });
    expect(mapAtmega328Pin("PB5")).toEqual({ port: "portB", pin: 5 });
  });

  it("maps PC0-PC6 to portC", () => {
    expect(mapAtmega328Pin("PC0")).toEqual({ port: "portC", pin: 0 });
    expect(mapAtmega328Pin("PC6")).toEqual({ port: "portC", pin: 6 });
  });

  it("strips suffixes", () => {
    expect(mapAtmega328Pin("PD3.1")).toEqual({ port: "portD", pin: 3 });
    expect(mapAtmega328Pin("PB2.l")).toEqual({ port: "portB", pin: 2 });
  });

  it("returns null for invalid pins", () => {
    expect(mapAtmega328Pin("PA0")).toBeNull();
    expect(mapAtmega328Pin("PD8")).toBeNull();
    expect(mapAtmega328Pin("PC7")).toBeNull();
    expect(mapAtmega328Pin("D13")).toBeNull();
    expect(mapAtmega328Pin("")).toBeNull();
  });
});
