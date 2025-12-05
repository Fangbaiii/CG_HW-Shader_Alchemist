import React from 'react';
import { Environment, Stars } from '@react-three/drei';
import { LabObject } from './LabObject';
import { VolcanoWorld } from './VolcanoWorld';
import { ObsidianMaterial } from './Materials';

type LabDefinition = {
  position: [number, number, number];
  size?: [number, number, number];
  rotation?: [number, number, number];
  contactBoost?: [number, number, number];
  isTargetSurface?: boolean;
  isSafeSurface?: boolean;
};

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
  { position: [0, 10, -24], size: [16, 0.5, 16] },
  { position: [0, 20, -24], size: [12, 0.5, 12] },
  { position: [0, 30, -24], size: [8, 0.5, 8] },
];

// 第二关和第三关的平台组件 - 简单立方体
const SimplePlatform = ({
  position,
  size,
  color = '#1a1a1a',
  safe = false,
  interactive = false,
  stageId = 1,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
  safe?: boolean;
  interactive?: boolean;
  stageId?: number;
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

  // 第二关：深青色发光风格
  if (stageId === 1) {
    return (
      <mesh 
        position={position} 
        castShadow 
        receiveShadow 
        userData={Object.keys(userData).length ? userData : undefined}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial 
          color="#e8f0f0ff" 
          roughness={0.6} 
          metalness={0.4}
          emissive="#d7e3e3ff"
          emissiveIntensity={0.15}
        />
      </mesh>
    );
  }

  // 第三关：金属灰色风格
  return (
    <mesh 
      position={position} 
      castShadow 
      receiveShadow 
      userData={Object.keys(userData).length ? userData : undefined}
    >
      <boxGeometry args={size} />
      <meshStandardMaterial 
        color="#1a1a1a" 
        roughness={0.2} 
        metalness={0.9}
      />
    </mesh>
  );
};

// --- 终点信标 ---
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

const StageTwoWorld: React.FC<StageWorldProps> = ({ resetToken }) => (
  <>
    <color attach="background" args={['#001212']} />
    <fog attach="fog" args={['#001212', 6, 45]} />
    
    {/* 
       Level 2: 幽灵 (Ghost)
       使用 'night' 预设。
       添加 Stars 模拟深空/虚空感，配合幽灵枪的科幻感。
    */}
    <Environment preset="night" />
    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

    <ambientLight intensity={0.4} />
    <directionalLight position={[8, 16, 6]} intensity={1.0} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight position={[0, 5, -20]} intensity={0.6} color="#7cf4ff" distance={35} />

    <SimplePlatform position={[0, -0.25, -2]} size={[8, 0.5, 8]} safe interactive stageId={1} />
    {GHOST_GATE.map((data, index) => (
      <LabObject key={`gate-${index}`} position={data.position} size={data.size} resetToken={resetToken} stageId={1} />
    ))}
    {GHOST_GALLERY.map((data, index) => (
      <LabObject
        key={`gallery-${index}`}
        position={data.position}
        size={data.size}
        resetToken={resetToken}
        isTargetSurface
        stageId={1}
      />
    ))}
    <GoalBeacon position={[0, 2, -44]} />
  </>
);

const StageThreeWorld: React.FC<StageWorldProps> = ({ resetToken }) => (
  <>
    <color attach="background" args={['#050510']} />
    {/* 减少雾的浓度，让天空盒可见 */}
    <fog attach="fog" args={['#050510', 20, 90]} />
    
    {/* 
       Level 3: 镜面 (Mirror)
       这是最重要的部分。
       1. background: 让环境贴图直接显示为背景。
       2. blur: 模糊背景，让它看起来像遥远的城市光影，而不是清晰的照片。
       这会让你的镜面枪反射出非常漂亮的城市霓虹色彩。
    */}
    <Environment preset="city" background blur={0.6} />
    
    <ambientLight intensity={0.2} />
    <directionalLight position={[6, 14, 2]} intensity={0.9} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight position={[0, 8, -25]} intensity={0.7} color="#8bd0ff" distance={35} />

    <SimplePlatform position={[0, -0.25, 4]} size={[8, 0.5, 8]} safe interactive stageId={2} />
    {MIRROR_RIBS.map((data, index) => (
      <LabObject 
        key={`rib-${index}`} 
        position={data.position} 
        size={data.size} 
        resetToken={resetToken}
        stageId={2}
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
        stageId={2}
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
    return <VolcanoWorld resetToken={resetToken} />;
  }
  if (stageIndex === 1) {
    return <StageTwoWorld resetToken={resetToken} />;
  }
  return <StageThreeWorld resetToken={resetToken} />;
};