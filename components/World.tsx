import React from 'react';
import { Environment } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LabObject } from './LabObject';
import { GunType } from '../types';

type LabDefinition = {
  position: [number, number, number];
  size?: [number, number, number];
  rotation?: [number, number, number];
  contactBoost?: [number, number, number];
  initialType?: GunType | null;
  isTargetSurface?: boolean;
  isSafeSurface?: boolean;
};

const JELLY_FLOATERS: LabDefinition[] = [
  { position: [-1.6, 0.5, -4], size: [1.6, 1.6, 1.6], isTargetSurface: true },
  { position: [1.4, 1.3, -10], size: [1.7, 1.7, 1.7], isTargetSurface: true },
  { position: [-1.2, 2.2, -17], size: [1.7, 1.7, 1.7], isTargetSurface: true },
  { position: [2.4, 3.2, -24], size: [1.9, 1.9, 1.9], isTargetSurface: true },
  { position: [0.2, 4.4, -31], size: [2.0, 2.0, 2.0], isTargetSurface: true },
  { position: [1.9, 5.8, -38], size: [2.2, 1.8, 2.2], isTargetSurface: true },
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

// 1. Intro Gate (z = -6)
GHOST_GATE.push({ position: [0, 1.5, -6], size: [3, 3, 0.5] });

// 2. The Great Wall (z = -20)
// A massive wall that requires a high jump or precise timing
GHOST_GATE.push({ position: [0, 3, -20], size: [8, 8, 1] });

// 3. The Triple Filter (z = -32, -35, -38)
// Thin sheets that must be breached in rapid succession
GHOST_GATE.push({ position: [0, 2, -32], size: [4, 4, 0.2] });
GHOST_GATE.push({ position: [0, 2, -35], size: [4, 4, 0.2] });
GHOST_GATE.push({ position: [0, 2, -38], size: [4, 4, 0.2] });

const GHOST_GALLERY: LabDefinition[] = [
  // Starting Platform extension
  { position: [0, -0.5, -4], size: [4, 0.5, 6], isTargetSurface: true },
  
  // Platform before Great Wall
  { position: [0, 0, -14], size: [4, 0.5, 6], isTargetSurface: true },
  
  // Platform after Great Wall
  { position: [0, 0, -26], size: [4, 0.5, 6], isTargetSurface: true },
  
  // Goal Platform (after Triple Filter)
  { position: [0, 0, -44], size: [6, 0.5, 8], isTargetSurface: true },
];

const MIRROR_BOOSTERS: LabDefinition[] = [
  // 1. Base Launcher
  { position: [0, 0, -4], size: [4, 0.5, 4], contactBoost: [0, 15, -10], isTargetSurface: true },
  
  // 2. Left Spire Platform
  { position: [-6, 8, -14], size: [3, 0.5, 3], contactBoost: [12, 15, -10], isTargetSurface: true },
  
  // 3. Right Spire Platform
  { position: [6, 16, -24], size: [3, 0.5, 3], contactBoost: [-12, 15, -10], isTargetSurface: true },
  
  // 4. Center High Platform
  { position: [0, 24, -34], size: [3, 0.5, 3], contactBoost: [0, 15, -12], isTargetSurface: true },
  
  // 5. Summit Approach
  { position: [0, 32, -46], size: [4, 0.5, 4], isTargetSurface: true },
];

const MIRROR_RIBS: LabDefinition[] = [
  // Central Spire Core
  { position: [0, 15, -24], size: [2, 40, 2] },
  
  // Floating Rings/Decor
  { position: [0, 10, -24], size: [16, 0.5, 16], rotation: [0.2, 0, 0] },
  { position: [0, 20, -24], size: [12, 0.5, 12], rotation: [-0.2, 0, 0] },
  { position: [0, 30, -24], size: [8, 0.5, 8], rotation: [0.1, 0, 0] },
];

const Platform = ({
  position,
  size,
  color = '#1a1a1a',
  safe = false,
  interactive = false,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  safe?: boolean;
  interactive?: boolean;
}) => {
  const userData: Record<string, any> = {};
  if (safe) {
    userData.isSafeSurface = true;
  }
  if (interactive) {
    userData.isInteractive = true;
    userData.size = size;
    userData.type = null;
  }

  return (
    <mesh position={position} castShadow receiveShadow userData={Object.keys(userData).length ? userData : undefined}>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} metalness={0.1} />
    </mesh>
  );
};

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
      <meshStandardMaterial ref={materialRef} color="#320505" emissive="#ff4d1d" roughness={0.5} metalness={0.05} />
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

interface StageWorldProps {
  resetToken: number;
}

const StageOneWorld: React.FC<StageWorldProps> = ({ resetToken }) => (
  <>
    <Environment preset="sunset" />
    <ambientLight intensity={0.3} />
    <directionalLight position={[12, 18, 4]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight position={[0, 6, -10]} intensity={0.8} color="#ff7b39" distance={40} />

    <Platform position={[0, -0.25, 8]} size={[10, 0.5, 10]} safe interactive />
    <LavaPlane />
    {JELLY_FLOATERS.map((data, index) => (
      <LabObject
        key={`jelly-${index}`}
        position={data.position}
        size={data.size}
        resetToken={resetToken}
        isTargetSurface
      />
    ))}
    {LAVA_COLUMNS.map((data, index) => (
      <LabObject key={`column-${index}`} position={data.position} size={data.size} resetToken={resetToken} />
    ))}
    <GoalBeacon position={[0, 8, -45]} />
  </>
);

const StageTwoWorld: React.FC<StageWorldProps> = ({ resetToken }) => (
  <>
    <Environment preset="city" />
    <ambientLight intensity={0.25} />
    <directionalLight position={[8, 16, 6]} intensity={1.0} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight position={[0, 5, -20]} intensity={0.6} color="#7cf4ff" distance={35} />

    <Platform position={[0, -0.25, -2]} size={[8, 0.5, 8]} safe interactive color="#1a1a1a" />
    {GHOST_GATE.map((data, index) => (
      <LabObject key={`gate-${index}`} position={data.position} size={data.size} resetToken={resetToken} />
    ))}
    {GHOST_GALLERY.map((data, index) => (
      <LabObject
        key={`gallery-${index}`}
        position={data.position}
        size={data.size}
        resetToken={resetToken}
        isTargetSurface
      />
    ))}
    <GoalBeacon position={[0, 2, -44]} />
  </>
);

const StageThreeWorld: React.FC<StageWorldProps> = ({ resetToken }) => (
  <>
    <Environment preset="night" />
    <ambientLight intensity={0.2} />
    <directionalLight position={[6, 14, 2]} intensity={0.9} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight position={[0, 8, -25]} intensity={0.7} color="#8bd0ff" distance={35} />

    <Platform position={[0, -0.25, 4]} size={[8, 0.5, 8]} safe interactive color="#050505" />
    {MIRROR_RIBS.map((data, index) => (
      <LabObject 
        key={`rib-${index}`} 
        position={data.position} 
        size={data.size} 
        rotation={data.rotation}
        resetToken={resetToken} 
      />
    ))}
    {MIRROR_BOOSTERS.map((data, index) => (
      <LabObject
        key={`mirror-${index}`}
        position={data.position}
        size={data.size}
        contactBoost={data.contactBoost}
        resetToken={resetToken}
        isTargetSurface
      />
    ))}
    <GoalBeacon position={[0, 34, -46]} />
  </>
);

interface WorldProps {
  resetToken: number;
  stageIndex: number;
}

export const World: React.FC<WorldProps> = ({ resetToken, stageIndex }) => {
  if (stageIndex === 0) {
    return <StageOneWorld resetToken={resetToken} />;
  }
  if (stageIndex === 1) {
    return <StageTwoWorld resetToken={resetToken} />;
  }
  return <StageThreeWorld resetToken={resetToken} />;
};