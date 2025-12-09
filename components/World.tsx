import React, { useState, useEffect, useMemo } from 'react';
import { Environment, Stars, Sparkles, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LabObject } from './LabObject';
import { VolcanoWorld } from './VolcanoWorld';
import { GhostWorld } from './GhostWorld';
import { LaserPuzzle } from './LaserPuzzle';
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

// --- 第三关关卡数据 ---
// 1. 初始平台
const STAGE3_START_PLATFORM: LabDefinition = { position: [0, -0.25, 4], size: [8, 0.5, 8], isSafeSurface: true };

// 2. 激光谜题区域
// Emitter: [0, 2, -5] -> Shooting +X
// Mirror 1 (Needs activation): [8, 2, -5] -> Reflects to -Z
// Mirror 2 (Needs activation): [8, 2, -15] -> Reflects to -X
// Receiver: [0, 2, -15]
// Obstacles to block direct path
const LASER_PUZZLE_OBSTACLES: LabDefinition[] = [
    // Wall blocking direct path from Emitter to Receiver
    { position: [0, 2, -10], size: [4, 4, 1] },
];

const LASER_PUZZLE_MIRRORS: LabDefinition[] = [
    // Mirror 1 Position
    { position: [8, 2, -5], size: [2, 2, 2] },
    // Mirror 2 Position
    { position: [8, 2, -15], size: [2, 2, 2] },
];

// 3. 终点路径
// Bridge (Hidden initially)
const BRIDGE_POS: [number, number, number] = [0, 0, -25];
const BRIDGE_SIZE: [number, number, number] = [4, 0.5, 15];

// Final Tower
const FINAL_TOWER_PLATFORMS: LabDefinition[] = [
    { position: [0, 5, -35], size: [6, 0.5, 6], isSafeSurface: true, isTargetSurface: true },
    { position: [0, 10, -40], size: [4, 0.5, 4], isSafeSurface: true, isTargetSurface: true },
    { position: [0, 15, -46], size: [4, 0.5, 4], isSafeSurface: true, isTargetSurface: true },
];

import { CyberGridMaterial } from './Materials';

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

  // 第三关：赛博网格风格
  return (
    <mesh 
      position={position} 
      castShadow 
      receiveShadow 
      userData={Object.keys(userData).length ? userData : undefined}
    >
      <boxGeometry args={size} />
      <CyberGridMaterial />
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
    <pointLight color="#7cf4ff" intensity={2} distance={5} />
  </group>
);

const CyberBackground = () => {
  return (
    <group>
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={300} scale={[100, 50, 100]} size={6} speed={0.4} opacity={0.5} color="#00ffff" />
      
      {/* Distant Cityscape - Procedural Buildings */}
      {Array.from({ length: 40 }).map((_, i) => {
        const angle = (i / 40) * Math.PI * 2;
        const radius = 40 + Math.random() * 20;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const h = 10 + Math.random() * 40;
        return (
          <mesh key={i} position={[x, h/2 - 20, z]}>
            <boxGeometry args={[3, h, 3]} />
            <meshStandardMaterial 
                color="#000000" 
                emissive={Math.random() > 0.5 ? "#ff00ff" : "#00ffff"} 
                emissiveIntensity={0.5} 
            />
          </mesh>
        );
      })}
      
      {/* Floating Rings */}
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
         <mesh position={[0, 30, -50]} rotation={[Math.PI/4, 0, 0]}>
            <torusGeometry args={[20, 0.5, 16, 100]} />
            <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2} />
         </mesh>
      </Float>
    </group>
  );
};

interface StageWorldProps {
  resetToken: number;
}

const StageThreeWorld: React.FC<StageWorldProps> = ({ resetToken }) => {
  const [isPuzzleSolved, setIsPuzzleSolved] = useState(false);
  const [nodeStates, setNodeStates] = useState([false, false, false]); // 3 Mirrors
  const bridgeGroupRef = React.useRef<THREE.Group>(null);

  // Reset puzzle on death/reset
  useEffect(() => {
      setNodeStates([false, false, false]);
      setIsPuzzleSolved(false);
      if (bridgeGroupRef.current) {
          bridgeGroupRef.current.position.y = -10;
      }
  }, [resetToken]);

  // Puzzle Configuration
  const emitterPos = new THREE.Vector3(0, 2, 0);
  const node1Pos = new THREE.Vector3(10, 2, 0);
  const node2Pos = new THREE.Vector3(10, 2, -20);
  const node3Pos = new THREE.Vector3(-10, 2, -20);
  const receiverPos = new THREE.Vector3(-10, 2, 0);

  // Calculate Laser Path based on active mirrors
  const laserPoints = React.useMemo(() => {
      const points = [emitterPos];
      
      // Segment 1: Emitter -> Node 1
      if (nodeStates[0]) {
          points.push(node1Pos);
          
          // Segment 2: Node 1 -> Node 2
          if (nodeStates[1]) {
              points.push(node2Pos);
              
              // Segment 3: Node 2 -> Node 3
              if (nodeStates[2]) {
                  points.push(node3Pos);
                  
                  // Segment 4: Node 3 -> Receiver
                  points.push(receiverPos);
              } else {
                  // Missed Node 3 (Shoot past it)
                  points.push(new THREE.Vector3(-15, 2, -20));
              }
          } else {
              // Missed Node 2 (Shoot past it)
              points.push(new THREE.Vector3(10, 2, -25));
          }
      } else {
          // Missed Node 1 (Shoot past it)
          points.push(new THREE.Vector3(15, 2, 0));
      }
      return points;
  }, [nodeStates]);

  useEffect(() => {
      // Check if path reached receiver
      const solved = nodeStates[0] && nodeStates[1] && nodeStates[2];
      setIsPuzzleSolved(solved);
  }, [nodeStates]);

  useFrame((state, delta) => {
      if (bridgeGroupRef.current) {
          const targetY = isPuzzleSolved ? 0 : -10;
          bridgeGroupRef.current.position.y = THREE.MathUtils.lerp(bridgeGroupRef.current.position.y, targetY, delta * 2);
      }
  });

  const handleNodeHit = (index: number, type: GunType) => {
      if (type === GunType.MIRROR) {
          setNodeStates(prev => {
              const next = [...prev];
              next[index] = true;
              return next;
          });
      }
  };

  return (
  <>
    <color attach="background" args={['#000205']} />
    <fog attach="fog" args={['#000205', 30, 90]} />
    
    {/* Rich Cyber Atmosphere */}
    <Environment preset="sunset" background blur={0.5} />
    <CyberBackground />
    
    <ambientLight intensity={0.5} color="#00ffff" />
    <directionalLight position={[6, 14, 2]} intensity={1.5} color="#ff00ff" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    <pointLight position={[0, 8, -25]} intensity={2} color="#00ffff" distance={50} />

    {/* Start Platform */}
    <SimplePlatform position={[0, -2, 5]} size={[8, 1, 8]} safe interactive />

    {/* Puzzle Platforms */}
    <SimplePlatform position={[10, -2, 0]} size={[6, 1, 6]} safe interactive />
    <SimplePlatform position={[10, -2, -20]} size={[6, 1, 6]} safe interactive />
    <SimplePlatform position={[-10, -2, -20]} size={[6, 1, 6]} safe interactive />
    <SimplePlatform position={[-10, -2, 0]} size={[6, 1, 6]} safe interactive />

    {/* Laser System */}
    <LaserPuzzle 
        points={laserPoints}
        solved={isPuzzleSolved}
    />

    {/* Puzzle Nodes (Mirrors) */}
    {/* Node 1 */}
    <LabObject 
        position={[10, 2, 0]} 
        size={[2, 2, 2]} 
        resetToken={resetToken} 
        stageId={2}
        onTypeChange={(t) => handleNodeHit(0, t)}
    />
    {/* Node 2 */}
    <LabObject 
        position={[10, 2, -20]} 
        size={[2, 2, 2]} 
        resetToken={resetToken} 
        stageId={2}
        onTypeChange={(t) => handleNodeHit(1, t)}
    />
    {/* Node 3 */}
    <LabObject 
        position={[-10, 2, -20]} 
        size={[2, 2, 2]} 
        resetToken={resetToken} 
        stageId={2}
        onTypeChange={(t) => handleNodeHit(2, t)}
    />

    {/* Receiver */}
    <mesh position={[-10, 2, 0]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
            color={isPuzzleSolved ? "#00ff00" : "#333333"} 
            emissive={isPuzzleSolved ? "#00ff00" : "#000000"}
            emissiveIntensity={2}
        />
    </mesh>

    {/* The Bridge - Now Interactive LabObject */}
    <group ref={bridgeGroupRef} position={[-10, -10, -10]}>
        <LabObject 
            position={[0, 0, 0]} 
            size={[4, 0.5, 15]} 
            resetToken={resetToken}
            stageId={2}
            isSafeSurface
        />
    </group>

    {/* Final Tower */}
    <LabObject position={[-10, 5, -25]} size={[6, 0.5, 6]} resetToken={resetToken} stageId={2} isTargetSurface isSafeSurface />
    <LabObject position={[-10, 10, -30]} size={[4, 0.5, 4]} resetToken={resetToken} stageId={2} isTargetSurface isSafeSurface />
    <LabObject position={[-10, 15, -35]} size={[4, 0.5, 4]} resetToken={resetToken} stageId={2} isTargetSurface isSafeSurface />
    
    {/* Ghost Gate - Blocks the goal */}
    {/* Player must shoot this with Ghost Gun to pass through */}
    <LabObject 
        position={[-10, 17, -33]} 
        size={[4, 4, 0.5]} 
        resetToken={resetToken} 
        stageId={2} 
        initialType={null} // Solid initially
    />

    <GoalBeacon position={[-10, 17, -35]} />
  </>
  );
};

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
