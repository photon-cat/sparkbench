# SimTTL Integration Notes

## Current State
C# TTL simulator with 50+ chip models (74HCT series), behavioral simulation engine with propagation delays, signal states (H/L/Z/U), and net-based connectivity.

## Potential Use
Reference implementation for porting TTL chip logic to TypeScript for use in SparkBench's AVR simulator alongside wire-components.ts.

## Future Idea: Verilog TTL Library → JS

Define 74HC chips as synthesizable Verilog modules, synth to gates, convert:

**74hc00.v:**
```verilog
module HC00(pin1,pin2,pin3,pin4 /*14 pins*/);
  nand (pin3, pin1, pin2); // Quad 2-in NAND
  // ...
endmodule
```

**Workflow:**
```
74hc_lib.v → Yosys synth_ice40 → gates.vg → vg2js.py → 74hc.js → TTL sim
```

**Project structure:**
```
project/
├── 74hc_lib.v       # Verilog 74xx models
├── vg2js.py         # Gate netlist → JS classes
├── ttl_sim.js       # Event sim + Canvas
├── examples/        # 6502.v → 74xx net → browser
└── index.html       # Drag-drop + run
```

This approach would allow defining chips in standard Verilog HDL, synthesizing through Yosys to a gate-level netlist, then auto-generating JS simulation classes — avoiding hand-coding each chip's logic.
