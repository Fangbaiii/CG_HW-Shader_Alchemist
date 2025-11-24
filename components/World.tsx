import React from 'react';
import { Environment } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LabObject } from './LabObject';

type LabDefinition = {
  position: [number, number, number];
  size?: [number, number, number];
  rotation?: [number, number, number];
  contactBoost?: [number, number, number];
};

const JELLY_FLOATERS: LabDefinition[] = [
  { position: [-1.6, 0.5, -4], size: [1.6, 1.6, 1.6] },
  { position: [1.4, 1.3, -10], size: [1.7, 1.7, 1.7] },
  { position: [-1.2, 2.2, -17], size: [1.7, 1.7, 1.7] },
  { position: [2.4, 3.2, -24], size: [1.9, 1.9, 1.9] },
  { position: [0.2, 4.4, -31], size: [2.0, 2.0, 2.0] },
  { position: [1.9, 5.8, -38], size: [2.2, 1.8, 2.2] },
];

const LAVA_COLUMNS: LabDefinition[] = [
  { position: [-6, 2.5, -15], size: [1.2, 6, 1.2] },
  { position: [6, 2.5, -15], size: [1.2, 6, 1.2] },
  { position: [-8, 3.5, -27], size: [1.4, 7, 1.4] },
  { position: [8, 3.5, -27], size: [1.4, 7, 1.4] },
  { position: [-4, 1.5, -10], size: [1, 5, 1] },
  { position: [4, 1.5, -10], size: [1, 5, 1] },
];

const GHOST_GATE: LabDefinition[] = [];
const gateX = [-2.4, 0, 2.4];
const gateY = [0.75, 2.25, 3.75];
gateX.forEach(x => {
  gateY.forEach(y => {
    GHOST_GATE.push({ position: [x, y, -48], size: [1.8, 1.8, 0.9] });
  });
});

const GHOST_GALLERY: LabDefinition[] = [
  { position: [-3.5, 1.2, -58], size: [1, 4, 1] },
  { position: [3.5, 1.2, -58], size: [1, 4, 1] },
  { position: [-1.5, 2.8, -63], size: [1.5, 5, 1.5] },
  { position: [1.5, 2.8, -66], size: [1.5, 5, 1.5] },
];

const MIRROR_BOOSTERS: LabDefinition[] = [
  { position: [0, 0.6, -92], size: [2, 0.6, 2], contactBoost: [0, 4, -4] },
  { position: [-2.1, 2.5, -98], size: [2, 0.6, 2], contactBoost: [1.5, 5, -4] },
  { position: [2.2, 4.6, -105], size: [2, 0.6, 2], contactBoost: [-1.2, 6, -4] },
  { position: [0.4, 7, -112], size: [2.2, 0.6, 2.2], contactBoost: [0.5, 7, -5] },
  { position: [0, 9.8, -119], size: [2.4, 0.6, 2.4], contactBoost: [0, 8, -6] },
];

const MIRROR_RIBS: LabDefinition[] = [
  { position: [-4, 2, -95], size: [0.8, 6, 0.8] },
  { position: [4, 2, -95], size: [0.8, 6, 0.8] },
  { position: [-4.5, 3, -105], size: [0.8, 6, 0.8] },
  { position: [4.5, 3, -105], size: [0.8, 6, 0.8] },
];

const Platform = ({ position, size, color = '#1a1a1a' }: { position: [number, number, number]; size: [number, number, number]; color?: string }) => (
  <mesh position={position} castShadow receiveShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={0.85} metalness={0.1} />
  </mesh>
);

const LavaPlane: React.FC = () => {
  const materialRef = React.useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.emissiveIntensity = 0.4 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, -20]} receiveShadow userData={{ isLava: true }}>
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#320505"
        emissive="#ff4d1d"
        roughness={0.5}
        metalness={0.05}
      />
    </mesh>
  );
};

const GoalBeacon = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.2, 0.15, 16, 64]} />
      <meshStandardMaterial color="#7cf4ff" emissive="#7cf4ff" emissiveIntensity={0.6} metalness={1} roughness={0.1} />
    </mesh>
    <mesh position={[0, 1.2, 0]}>
      <octahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color="#ffffff" emissive="#8bf6ff" emissiveIntensity={1} />
    </mesh>
    <pointLight color="#7cf4ff" intensity={1.2} distance={25} decay={2} />
  </group>
);

export const World: React.FC = () => {
  return (
    <>
      <Environment preset="sunset" />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[12, 18, 4]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-12, 10, -52]} intensity={0.5} color="#ff7b39" distance={45} />
      <pointLight position={[12, 9, -100]} intensity={0.45} color="#8bd0ff" distance={40} />

      {/* Level 1: Molten Hopscotch */}
      <Platform position={[0, -0.25, 8]} size={[10, 0.5, 10]} />
      <Platform position={[0, -0.25, 0]} size={[6, 0.5, 6]} color="#2c2c2c" />
      <LavaPlane />
      {JELLY_FLOATERS.map((data, index) => (
        <LabObject key={`jelly-${index}`} position={data.position} size={data.size} />
      ))}
      {LAVA_COLUMNS.map((data, index) => (
        <LabObject key={`column-${index}`} position={data.position} size={data.size} />
      ))}
      <Platform position={[0, -0.05, -42]} size={[8, 0.3, 6]} />

      {/* Level 2: Phase Crucible */}
      <Platform position={[0, -0.2, -55]} size={[8, 0.4, 24]} color="#202020" />
      {GHOST_GATE.map((data, index) => (
        <LabObject key={`gate-${index}`} position={data.position} size={data.size} />
      ))}
      {GHOST_GALLERY.map((data, index) => (
        <LabObject key={`gallery-${index}`} position={data.position} size={data.size} />
      ))}
      <Platform position={[0, 1.2, -70]} size={[6, 0.4, 6]} color="#262626" />

      {/* Level 3: Mirror Spire */}
      <Platform position={[0, -0.2, -90]} size={[10, 0.4, 12]} color="#1c1c1c" />
      {MIRROR_RIBS.map((data, index) => (
        <LabObject key={`rib-${index}`} position={data.position} size={data.size} />
      ))}
      {MIRROR_BOOSTERS.map((data, index) => (
        <LabObject
          key={`mirror-${index}`}
          position={data.position}
          size={data.size}
          contactBoost={data.contactBoost}
        />
      ))}
      <GoalBeacon position={[0, 12, -122]} />
    </>
  );
};