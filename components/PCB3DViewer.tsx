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
