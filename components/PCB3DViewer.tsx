"use client";

import { useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, GizmoHelper, GizmoViewcube } from "@react-three/drei";
import * as THREE from "three";
import { listify, type List } from "@kicanvas/kicad/tokenizer";
import { KicadPCB } from "@kicanvas/kicad/board";
import {
  extractPCB3DData,
  type PCB3DData,
  type Pad3D,
  type Trace3D,
  type Via3D,
  type Footprint3D,
  type BoardOutline,
} from "@/lib/pcb-to-3d";

// ── Colors ──────────────────────────────────────────────────────────────────
const BOARD_COLOR = "#1a6b3c"; // FR-4 green solder mask
const COPPER_COLOR = "#c87533"; // Copper traces/pads
const GOLD_COLOR = "#d4a847"; // HASL/Gold pad finish
const SILK_COLOR = "#e8e8e0"; // White silkscreen
const DRILL_COLOR = "#1a1a1a"; // Drill holes
const VIA_COLOR = "#a0a0a0"; // Via barrel

// Component body colors
const IC_BODY_COLOR = "#1a1a1a"; // Black IC body
const IC_NOTCH_COLOR = "#333333"; // IC notch/dimple
const BTN_BODY_COLOR = "#222222"; // Pushbutton housing
const HEADER_BODY_COLOR = "#1a1a1a"; // Header plastic
const HEADER_PIN_COLOR = "#c0c0c0"; // Header pin metal

// ── Shared materials (reused across meshes for performance) ─────────────────
const copperMaterial = new THREE.MeshStandardMaterial({
  color: COPPER_COLOR, roughness: 0.3, metalness: 0.7,
});
const goldMaterial = new THREE.MeshStandardMaterial({
  color: GOLD_COLOR, roughness: 0.2, metalness: 0.8,
});
const silkMaterial = new THREE.MeshStandardMaterial({
  color: SILK_COLOR, roughness: 0.9, metalness: 0.0,
});
const drillMaterial = new THREE.MeshStandardMaterial({
  color: DRILL_COLOR, roughness: 0.9, metalness: 0.0,
});
const viaMaterial = new THREE.MeshStandardMaterial({
  color: VIA_COLOR, roughness: 0.3, metalness: 0.6,
});

// ── 3D Component Models ─────────────────────────────────────────────────────

/** LED color mapping from reference or value */
const LED_COLOR_MAP: Record<string, string> = {
  red: "#ff2020", green: "#20ff20", blue: "#2040ff", yellow: "#ffee00",
  white: "#f0f0f0", orange: "#ff8800", purple: "#cc20ff",
};

// Cycle through distinct colors for LEDs without explicit color info
const LED_CYCLE = ["#ff2020", "#20ff20", "#2040ff", "#ffee00", "#ff8800", "#cc20ff", "#f0f0f0", "#20ffdd"];

function getComponentColor(fp: Footprint3D): string {
  // Check value field first (carries attrs.color from diagram)
  const v = fp.value.toLowerCase();
  if (LED_COLOR_MAP[v]) return LED_COLOR_MAP[v]!;
  // Check reference name for color keywords (e.g., "led-red", "btn-green")
  const ref = fp.reference.toLowerCase();
  for (const [name, hex] of Object.entries(LED_COLOR_MAP)) {
    if (ref.includes(name)) return hex;
  }
  // Extract number from reference (e.g., "led3" → 3) to cycle colors
  const numMatch = fp.reference.match(/(\d+)/);
  if (numMatch) {
    const idx = (parseInt(numMatch[1]!) - 1) % LED_CYCLE.length;
    return LED_CYCLE[idx]!;
  }
  return "#ff2020";
}

/**
 * DIP IC package (e.g., 74HC595, ATmega328)
 * Pad layout: left row at x=0, right row at x=7.62, y from 0 to (rows-1)*2.54
 * Body centered at (3.81, (rows-1)*1.27)
 */
function DIPModel({ padCount }: { padCount: number }) {
  const rows = padCount / 2;
  const pitch = 2.54;
  const rowSpacing = 7.62;
  const bodyW = 6.0;  // slightly narrower than pin span
  const bodyL = (rows - 1) * pitch + 2.0;
  const bodyH = 3.0;
  const cx = rowSpacing / 2;  // center between pin rows
  const cy = ((rows - 1) * pitch) / 2;  // center along pin columns

  return (
    <group position={[cx, -cy, 0]}>
      {/* IC body */}
      <mesh position={[0, 0, bodyH / 2]}>
        <boxGeometry args={[bodyW, bodyL, bodyH]} />
        <meshStandardMaterial color={IC_BODY_COLOR} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Pin 1 notch (semicircle indent on top face) */}
      <mesh position={[0, bodyL / 2 - 0.8, bodyH]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.15, 16]} />
        <meshStandardMaterial color={IC_NOTCH_COLOR} roughness={0.6} />
      </mesh>
    </group>
  );
}

/**
 * 3mm through-hole LED — realistic proportions
 * Pad layout: pad1 at (0,0), pad2 at (0,2.54)
 * Body centered at (0, 1.27), standing upright along Z
 * Real 3mm LED: 3mm diameter dome, ~1mm rim, ~4.5mm total height above board
 */
function LEDModel({ color }: { color: string }) {
  const cy = -1.27; // center between pads (Y is flipped in group)
  const radius = 1.5; // 3mm diameter / 2
  const rimRadius = 1.8; // slightly wider rim at base
  const bodyH = 3.0; // cylinder portion height
  const rimH = 1.0; // rim/base height

  return (
    <group position={[0, cy, 0]}>
      {/* Rim / base flange */}
      <mesh position={[0, 0, rimH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[rimRadius, rimRadius, rimH, 24]} />
        <meshStandardMaterial color="#cccccc" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Main cylinder body (tinted/translucent) */}
      <mesh position={[0, 0, rimH + bodyH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, bodyH, 24]} />
        <meshStandardMaterial
          color={color}
          roughness={0.15}
          metalness={0.0}
          transparent
          opacity={0.8}
          emissive={color}
          emissiveIntensity={0.25}
        />
      </mesh>
      {/* Dome top (hemisphere) */}
      <mesh position={[0, 0, rimH + bodyH]} rotation={[-Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={color}
          roughness={0.1}
          metalness={0.0}
          transparent
          opacity={0.8}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

/**
 * 6mm tactile pushbutton
 * Pad layout: (0,0), (6.5,0), (0,6.5), (6.5,6.5)
 * Body centered at (3.25, 3.25)
 */
function PushbuttonModel({ color }: { color: string }) {
  const cx = 3.25;
  const cy = -3.25; // Y flipped
  return (
    <group position={[cx, cy, 0]}>
      {/* Button housing */}
      <mesh position={[0, 0, 1.75]}>
        <boxGeometry args={[6, 6, 3.5]} />
        <meshStandardMaterial color={BTN_BODY_COLOR} roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Button cap (circular, standing upright) */}
      <mesh position={[0, 0, 4.0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.7, 1.7, 1.0, 20]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.1} />
      </mesh>
    </group>
  );
}

/**
 * Axial through-hole resistor
 * Pad layout: pad1 at (0,0), pad2 at (10.16,0) for 0.4in spacing
 * Body centered between pads
 */
function ResistorModel() {
  const padSpacing = 10.16;
  const cy = -padSpacing / 2; // center between pads (Y flipped)
  const bodyL = 6.0;
  const bodyR = 1.2;
  const wireR = 0.25;

  return (
    <group position={[0, cy, 0]}>
      {/* Resistor body (cylinder running along Y axis) */}
      <mesh position={[0, 0, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[bodyR, bodyR, bodyL, 16]} />
        <meshStandardMaterial color="#c4a882" roughness={0.6} metalness={0.0} />
      </mesh>
      {/* Color bands */}
      {[-1.8, -0.9, 0, 1.2].map((offset, i) => (
        <mesh key={i} position={[0, -offset, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[bodyR + 0.02, bodyR + 0.02, 0.4, 16]} />
          <meshStandardMaterial
            color={["#884400", "#000000", "#ff0000", "#d4a847"][i]}
            roughness={0.5}
          />
        </mesh>
      ))}
      {/* Lead wires */}
      <mesh position={[0, bodyL / 2 + 1, 1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wireR, wireR, 2, 8]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, -(bodyL / 2 + 1), 1.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wireR, wireR, 2, 8]} />
        <meshStandardMaterial color="#c0c0c0" roughness={0.3} metalness={0.8} />
      </mesh>
    </group>
  );
}

/**
 * 12mm piezo buzzer
 * Pad layout: pad1 at (0,0), pad2 at (0,7.6)
 * Body centered between pads, circular disc
 */
function BuzzerModel() {
  const padSpacing = 7.6;
  const cy = -padSpacing / 2;
  const radius = 6.0;
  const bodyH = 4.0;

  return (
    <group position={[0, cy, 0]}>
      {/* Buzzer body (black cylinder) */}
      <mesh position={[0, 0, bodyH / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius, radius, bodyH, 24]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Top marking (slightly recessed circle) */}
      <mesh position={[0, 0, bodyH]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[radius - 1, radius - 1, 0.1, 24]} />
        <meshStandardMaterial color="#333333" roughness={0.6} />
      </mesh>
      {/* Sound hole */}
      <mesh position={[0, 0, bodyH + 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.15, 16]} />
        <meshStandardMaterial color="#555555" roughness={0.8} />
      </mesh>
    </group>
  );
}

/**
 * Pin header strip (1xN)
 * Pads at (0,0), (0,2.54), (0,5.08), ...
 * Body centered at (0, (N-1)*1.27)
 */
function HeaderModel({ pinCount }: { pinCount: number }) {
  const pitch = 2.54;
  const bodyL = pinCount * pitch;
  const bodyW = 2.54;
  const bodyH = 2.5;
  const pinSize = 0.5;
  const cy = -((pinCount - 1) * pitch) / 2;

  return (
    <group position={[0, cy, 0]}>
      {/* Plastic housing */}
      <mesh position={[0, 0, bodyH / 2]}>
        <boxGeometry args={[bodyW, bodyL, bodyH]} />
        <meshStandardMaterial color={HEADER_BODY_COLOR} roughness={0.6} metalness={0.0} />
      </mesh>
      {/* Metal pins sticking up */}
      {Array.from({ length: pinCount }).map((_, i) => (
        <mesh key={i}
          position={[0, -((pinCount - 1) / 2) * pitch + i * pitch, bodyH + 2.5]}
        >
          <boxGeometry args={[pinSize, pinSize, 5]} />
          <meshStandardMaterial color={HEADER_PIN_COLOR} roughness={0.2} metalness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Render a 3D component model for a footprint */
function ComponentModel3D({ footprint, thickness }: { footprint: Footprint3D; thickness: number }) {
  const isFront = footprint.layer === "F.Cu";
  const z = isFront ? 0.04 : -thickness - 0.04;
  const flipZ = isFront ? 1 : -1;
  const rot = (-footprint.rotation * Math.PI) / 180;
  const fpName = footprint.footprintName;

  let model: React.ReactNode = null;

  if (fpName.includes("DIP-")) {
    const pinMatch = fpName.match(/DIP-(\d+)/);
    const pins = pinMatch ? parseInt(pinMatch[1]!) : 16;
    model = <DIPModel padCount={pins} />;
  } else if (fpName.includes("LED-THT")) {
    const color = getComponentColor(footprint);
    model = <LEDModel color={color} />;
  } else if (fpName.includes("SW-THT-6mm")) {
    const color = getComponentColor(footprint);
    model = <PushbuttonModel color={color} />;
  } else if (fpName.includes("Axial")) {
    model = <ResistorModel />;
  } else if (fpName.includes("Buzzer")) {
    model = <BuzzerModel />;
  } else if (fpName.match(/Header-1x(\d+)/)) {
    const pinMatch = fpName.match(/Header-1x(\d+)/);
    const pins = pinMatch ? parseInt(pinMatch[1]!) : 3;
    model = <HeaderModel pinCount={pins} />;
  }

  if (!model) return null;

  return (
    <group
      position={[footprint.x, -footprint.y, z]}
      rotation={[0, 0, rot]}
      scale={[1, 1, flipZ]}
    >
      {model}
    </group>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

/** The PCB board body - extruded from Edge.Cuts outline */
function BoardBody({ outline, thickness }: { outline: BoardOutline; thickness: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    if (outline.points.length < 3) return new THREE.BoxGeometry(1, 1, 1);

    const pts = outline.points;
    shape.moveTo(pts[0]!.x, -pts[0]!.y); // Flip Y for Three.js coord system
    for (let i = 1; i < pts.length; i++) {
      shape.lineTo(pts[i]!.x, -pts[i]!.y);
    }
    shape.closePath();

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: thickness,
      bevelEnabled: false,
    };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [outline, thickness]);

  return (
    <mesh geometry={geometry} position={[0, 0, -thickness]}>
      <meshStandardMaterial
        color={BOARD_COLOR}
        roughness={0.6}
        metalness={0.0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Render all pads for a footprint */
function PadMesh({ pad, thickness }: { pad: Pad3D; thickness: number }) {
  const isThruHole = pad.type === "thru_hole" || pad.type === "np_thru_hole";
  const padHeight = 0.035; // Copper thickness ~35μm
  const topZ = padHeight / 2;
  const bottomZ = -thickness - padHeight / 2;

  const padGeometry = useMemo(() => {
    if (pad.shape === "circle" || pad.shape === "oval") {
      return new THREE.CylinderGeometry(
        pad.width / 2, pad.width / 2, padHeight, 24
      );
    }
    return new THREE.BoxGeometry(pad.width, pad.height, padHeight);
  }, [pad.shape, pad.width, pad.height]);

  const drillGeometry = useMemo(() => {
    if (!isThruHole || pad.drillDiameter <= 0) return null;
    return new THREE.CylinderGeometry(
      pad.drillDiameter / 2, pad.drillDiameter / 2, thickness + 0.1, 16
    );
  }, [isThruHole, pad.drillDiameter, thickness]);

  const rot = (pad.rotation * Math.PI) / 180;
  const isCircle = pad.shape === "circle" || pad.shape === "oval";

  return (
    <group position={[pad.x, -pad.y, 0]}>
      {/* Top pad */}
      <mesh
        geometry={padGeometry}
        material={goldMaterial}
        position={[0, 0, topZ]}
        rotation={isCircle ? [-Math.PI / 2, 0, rot] : [0, 0, rot]}
      />
      {/* Bottom pad for through-hole */}
      {isThruHole && (
        <mesh
          geometry={padGeometry}
          material={goldMaterial}
          position={[0, 0, bottomZ]}
          rotation={isCircle ? [-Math.PI / 2, 0, rot] : [0, 0, rot]}
        />
      )}
      {/* Drill hole barrel */}
      {drillGeometry && (
        <mesh
          geometry={drillGeometry}
          material={drillMaterial}
          position={[0, 0, -thickness / 2]}
          rotation={[Math.PI / 2, 0, 0]}
        />
      )}
    </group>
  );
}

/** Render a single trace segment */
function TraceMesh({ trace, thickness }: { trace: Trace3D; thickness: number }) {
  const isFront = trace.layer === "F.Cu";
  const z = isFront ? 0.02 : -thickness - 0.02;

  const dx = trace.x2 - trace.x1;
  const dy = trace.y2 - trace.y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length < 0.001) return null;
  const angle = Math.atan2(-dy, dx);
  const cx = (trace.x1 + trace.x2) / 2;
  const cy = (trace.y1 + trace.y2) / 2;

  return (
    <mesh
      position={[cx, -cy, z]}
      rotation={[0, 0, angle]}
      material={copperMaterial}
    >
      <boxGeometry args={[length, trace.width, 0.035]} />
    </mesh>
  );
}

/** Render a via */
function ViaMesh({ via, thickness }: { via: Via3D; thickness: number }) {
  return (
    <group position={[via.x, -via.y, -thickness / 2]}>
      {/* Via barrel (outer) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={viaMaterial}>
        <cylinderGeometry args={[via.size / 2, via.size / 2, thickness + 0.07, 16]} />
      </mesh>
      {/* Via hole (inner) */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={drillMaterial}>
        <cylinderGeometry args={[via.drill / 2, via.drill / 2, thickness + 0.08, 16]} />
      </mesh>
    </group>
  );
}

/** Render silkscreen lines */
function SilkscreenLines({ footprint, thickness }: { footprint: Footprint3D; thickness: number }) {
  if (footprint.silkLines.length === 0) return null;

  const isFront = footprint.layer === "F.Cu";
  const z = isFront ? 0.04 : -thickness - 0.04;
  const lineWidth = 0.15; // mm

  return (
    <group>
      {footprint.silkLines.map((line, i) => {
        const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        if (length < 0.001) return null;
        const angle = Math.atan2(-dy, dx);
        const cx = (line.x1 + line.x2) / 2;
        const cy = (line.y1 + line.y2) / 2;

        return (
          <mesh
            key={i}
            position={[cx, -cy, z]}
            rotation={[0, 0, angle]}
            material={silkMaterial}
          >
            <boxGeometry args={[length, lineWidth, 0.01]} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Camera setup to frame the board */
function CameraSetup({ outline }: { outline: BoardOutline }) {
  const { camera } = useThree();

  useMemo(() => {
    const cx = outline.minX + outline.width / 2;
    const cy = -(outline.minY + outline.height / 2);
    const maxDim = Math.max(outline.width, outline.height);
    camera.position.set(cx, cy - maxDim * 0.5, maxDim * 1.2);
    camera.lookAt(cx, cy, 0);
  }, [camera, outline]);

  return null;
}

/** Full 3D scene content */
function PCBScene({ data }: { data: PCB3DData }) {
  const cx = data.outline.minX + data.outline.width / 2;
  const cy = -(data.outline.minY + data.outline.height / 2);

  return (
    <>
      <CameraSetup outline={data.outline} />
      <OrbitControls
        makeDefault
        target={[cx, cy, -data.thickness / 2]}
        enableDamping
        dampingFactor={0.1}
        minDistance={5}
        maxDistance={500}
      />

      {/* Orientation cube */}
      <GizmoHelper alignment="top-left" margin={[60, 60]}>
        <GizmoViewcube
          faces={["Right", "Left", "Top", "Bottom", "Front", "Back"]}
          color="#2a2a3e"
          hoverColor="#4a4a6e"
          textColor="#ccc"
          strokeColor="#555"
          opacity={0.85}
        />
      </GizmoHelper>

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, -50, 100]} intensity={0.8} />
      <directionalLight position={[-50, 50, -50]} intensity={0.3} />
      <pointLight position={[cx, cy, 80]} intensity={0.4} />

      {/* Board body */}
      <BoardBody outline={data.outline} thickness={data.thickness} />

      {/* Pads */}
      {data.footprints.map((fp) =>
        fp.pads.map((pad, j) => (
          <PadMesh key={`${fp.reference}-pad-${j}`} pad={pad} thickness={data.thickness} />
        ))
      )}

      {/* Traces */}
      {data.traces.map((trace, i) => (
        <TraceMesh key={`trace-${i}`} trace={trace} thickness={data.thickness} />
      ))}

      {/* Vias */}
      {data.vias.map((via, i) => (
        <ViaMesh key={`via-${i}`} via={via} thickness={data.thickness} />
      ))}

      {/* Silkscreen */}
      {data.footprints.map((fp) => (
        <SilkscreenLines key={`silk-${fp.reference}`} footprint={fp} thickness={data.thickness} />
      ))}

      {/* 3D Component models */}
      {data.footprints.map((fp) => (
        <ComponentModel3D key={`model-${fp.reference}`} footprint={fp} thickness={data.thickness} />
      ))}
    </>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

interface PCB3DViewerProps {
  pcbText: string | null;
}

export default function PCB3DViewer({ pcbText }: PCB3DViewerProps) {
  const data = useMemo<PCB3DData | null>(() => {
    if (!pcbText) return null;
    try {
      const tree = listify(pcbText);
      if (!tree || tree.length === 0) return null;
      const board = new KicadPCB("board.kicad_pcb", tree[0] as List);
      return extractPCB3DData(board);
    } catch (e) {
      console.error("Failed to parse PCB for 3D view:", e);
      return null;
    }
  }, [pcbText]);

  if (!pcbText) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", color: "#888", fontFamily: "monospace",
      }}>
        No PCB data. Open the PCB tab first to create a board.
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100%", color: "#888", fontFamily: "monospace",
      }}>
        Failed to parse PCB data for 3D rendering.
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", background: "#1a1a2e" }}>
      <Canvas
        gl={{ antialias: true, alpha: false }}
        camera={{ fov: 45, near: 0.1, far: 2000 }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#1a1a2e"]} />
        <PCBScene data={data} />
      </Canvas>
    </div>
  );
}
