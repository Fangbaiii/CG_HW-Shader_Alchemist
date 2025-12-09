import React from 'react';
import { Environment } from '@react-three/drei';
import { LabObject } from './LabObject';
import { VolcanoWorld } from './VolcanoWorld';
import { GhostWorld } from './GhostWorld';

type LabDefinition = {
  position: [number, number, number];
  size?: [number, number, number];
  rotation?: [number, number, number];
  contactBoost?: [number, number, number];
  isTargetSurface?: boolean;
  isSafeSurface?: boolean;
};

// --- 第三关关卡数据 ---
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

// 第三关的平台组件 - 简单立方体
const SimplePlatform = ({
  position,
  size,
  safe = false,
  interactive = false,
}: {
  position: [number, number, number];
  size: [number, number, number];
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

    <SimplePlatform position={[0, -0.25, 4]} size={[8, 0.5, 8]} safe interactive />
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
    return <GhostWorld resetToken={resetToken} />;
  }
  return <StageThreeWorld resetToken={resetToken} />;
};