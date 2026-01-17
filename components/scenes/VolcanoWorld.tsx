import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { Environment, Sparkles, SoftShadows } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LabObject } from '@/components/entities/LabObject';
import { ModelLoader } from '@/components/entities/ModelLoader';
import { FloatingModel } from '@/components/entities/FloatingModel';
import { Signboard } from '@/components/ui/Signboard';
import { LavaMaterial, VolcanoSkyMaterial, ObsidianMaterial, VolcanoWithLavaMaterial } from '@/components/materials';

// --- 类型定义 ---
type LabDefinition = {
  position: [number, number, number];
  size?: [number, number, number];
  rotation?: [number, number, number];
  contactBoost?: [number, number, number];
  isTargetSurface?: boolean;
  isSafeSurface?: boolean;
};

// --- 关卡数据 ---
const JELLY_FLOATERS: LabDefinition[] = [
  { position: [-1.6, 0.5, -6], size: [1.6, 1.6, 1.6], isTargetSurface: true },
  { position: [-1.2, 2.5, -22], size: [1.7, 1.7, 1.7], isTargetSurface: true },
  { position: [2.4, 4.0, -38], size: [1.9, 1.9, 1.9], isTargetSurface: true },
  { position: [1.9, 6.5, -56], size: [2.2, 1.8, 2.2], isTargetSurface: true },
];

const LAVA_COLUMNS: LabDefinition[] = [
  { position: [-6, 2.5, -15], size: [1.2, 6, 1.2] },
  { position: [6, 2.5, -15], size: [1.2, 6, 1.2] },
  { position: [-8, 3.5, -27], size: [1.4, 7, 1.4] },
  { position: [8, 3.5, -27], size: [1.4, 7, 1.4] },
  { position: [-4, 1.5, -10], size: [1, 5, 1] },
  { position: [4, 1.5, -10], size: [1, 5, 1] },
];

// --- 六边形黑曜石平台 ---
const Platform = ({
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

  // 六边形平台：半径基于 size 的最大水平值，高度为 size[1]
  const hexRadius = Math.max(size[0], size[2]) * 0.55;
  const hexHeight = size[1];

  return (
    <mesh
      position={position}
      rotation={[0, Math.PI / 6, 0]}
      castShadow
      receiveShadow
      userData={Object.keys(userData).length ? userData : undefined}
    >
      <cylinderGeometry args={[hexRadius, hexRadius, hexHeight, 6, 1]} />
      <ObsidianMaterial />
    </mesh>
  );
};

// --- 岩浆平面 ---
const LavaPlane: React.FC = () => {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3, -20]} receiveShadow userData={{ isLava: true }}>
      <planeGeometry args={[300, 300, 64, 64]} />
      <LavaMaterial />
    </mesh>
  );
};

// --- 火山天空穹顶 ---
const VolcanoSky: React.FC = () => {
  return (
    <mesh>
      <sphereGeometry args={[200, 32, 32]} />
      <VolcanoSkyMaterial />
    </mesh>
  );
};


// --- 悬浮巨石 (Instanced for performance) ---
// Configuration data for all floating rocks
const FLOATING_ROCKS_DATA = [
  { position: [-20, 16, -25] as [number, number, number], size: 2.5, rotationSpeed: 1 },
  { position: [20, 16, -25] as [number, number, number], size: 3, rotationSpeed: 1.2 },
  { position: [-12, 20, -45] as [number, number, number], size: 2, rotationSpeed: 0.8 },
  { position: [12, 20, -45] as [number, number, number], size: 1.8, rotationSpeed: 1.1 },
  { position: [-26, 14, -55] as [number, number, number], size: 2.8, rotationSpeed: 1.5 },
  { position: [26, 14, -55] as [number, number, number], size: 3.5, rotationSpeed: 1.3 },
];

/**
 * Optimized FloatingRocks using InstancedMesh
 * Reduces 6 draw calls to 1, and 6 useFrame callbacks to 1
 */
const FloatingRocksInstanced = () => {
  const instancedMeshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempMatrix = useMemo(() => new THREE.Matrix4(), []);

  // Store initial Y positions for floating animation
  const initialYPositions = useMemo(() =>
    FLOATING_ROCKS_DATA?.map(rock => rock.position[1]) ?? [],
    []);

  // Initialize instance matrices on mount
  useLayoutEffect(() => {
    if (!instancedMeshRef.current) return;
    if (!FLOATING_ROCKS_DATA) return;

    FLOATING_ROCKS_DATA.forEach((rock, i) => {
      tempObject.position.set(rock.position[0], rock.position[1], rock.position[2]);
      tempObject.scale.setScalar(rock.size);
      tempObject.rotation.set(0, 0, 0);
      tempObject.updateMatrix();
      instancedMeshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  }, [tempObject]);

  // Animate all instances with a single useFrame
  useFrame((state) => {
    if (!instancedMeshRef.current) return;

    const time = state.clock.elapsedTime;

    FLOATING_ROCKS_DATA.forEach((rock, i) => {
      // Get current matrix
      instancedMeshRef.current!.getMatrixAt(i, tempMatrix);
      tempMatrix.decompose(tempObject.position, tempObject.quaternion, tempObject.scale);

      // Apply rotation (cumulative)
      tempObject.rotation.y += rock.rotationSpeed * 0.01;
      tempObject.rotation.x += rock.rotationSpeed * 0.005;

      // Apply floating Y position
      tempObject.position.y = initialYPositions[i] + Math.sin(time * 0.5 + rock.position[0]) * 0.5;

      // Update instance matrix
      tempObject.updateMatrix();
      instancedMeshRef.current!.setMatrixAt(i, tempObject.matrix);
    });

    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, FLOATING_ROCKS_DATA.length]}
      frustumCulled={false}
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#1a1210"
        roughness={0.9}
        metalness={0.1}
        emissive="#ff2200"
        emissiveIntensity={0.05}
      />
    </instancedMesh>
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

// --- 火山关卡主组件 ---
export interface VolcanoWorldProps {
  resetToken: number;
}

export const VolcanoWorld: React.FC<VolcanoWorldProps> = ({ resetToken }) => (
  <>
    {/* 全局雾气已移除，现在使用 Shader 中的边界局部雾化 */}
    {/* 岩浆材质：在远处 (80-150米) 淡出到雾色 */}
    {/* 天空材质：底部柔和混合雾色 */}
    {/* <fogExp2 attach="fog" args={['#4a1208', 0.01]} /> */}

    {/* 
       Level 1: 熔岩火山 (Volcanic Lava)
       - 程序化火山天空穹顶
       - 远景火山剪影
       - 悬浮巨石
       - 岩浆瀑布
       - 火山口岩壁
    */}

    {/* 程序化火山天空 - 替代纯色背景 */}
    <VolcanoSky />



    {/* HDRI 环境光 - 仅用于反射和环境光照，不替换背景 */}
    <Environment
      preset="sunset"      // 使用 Drei 内置的日落预设（轻量且高质量）
      background={false}   // ⚠️ 不替换背景，保留程序化天空
      blur={0.3}           // 轻微模糊提升性能
    />

    {/* 保留 sunset 环境光用于物体反射 */}
    {/* <Environment preset="sunset" /> */}

    {/* 增强的粒子效果 - 漂浮灰烬和火星 */}
    <Sparkles
      count={100}
      scale={[40, 25, 60]}
      size={10}
      speed={0.6}
      opacity={0.9}
      color="#ff6600"
      position={[0, 8, -20]}
    />
    {/* 额外的小火星层 */}
    <Sparkles
      count={150}
      scale={[30, 15, 50]}
      size={3}
      speed={1.5}
      opacity={0.7}
      color="#ffaa00"
      position={[0, 3, -15]}
    />

    {/* 光照系统 */}
    <ambientLight intensity={0.8} color="#ff9966" />
    <directionalLight
      position={[12, 18, 4]}
      intensity={0.01}
      color="#ffaa77"
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
    />
    {/* 来自岩浆的底部光照 - 核心氛围光 */}
    <pointLight position={[0, -2, -20]} intensity={0.2} color="#ff4400" distance={80} decay={1} />
    <pointLight position={[-15, -2, -30]} intensity={0.2} color="#ff3300" distance={50} decay={2} />
    <pointLight position={[15, -2, -10]} intensity={0.2} color="#ff5500" distance={50} decay={2} />

    {/* === 活火山 - 带有岩浆河流和裂缝发光 === */}
    {/* 原有的程序化火山已注释 */}
    {/* <ActiveVolcano position={[-65, -2, -75]} scale={1.3} rotation={0.3} /> */}
    {/* <ActiveVolcano position={[75, -10, -85]} scale={1.5} rotation={-0.2} /> */}
    {/* <ActiveVolcano position={[0, -12, -110]} scale={1.8} rotation={0} /> */}
    {/* <ActiveVolcano position={[-85, -7, -35]} scale={1.0} rotation={0.8} /> */}
    {/* <ActiveVolcano position={[90, -9, -45]} scale={1.1} rotation={-0.6} /> */}


    {/* === 外部 GLB 模型火山 === */}
    {/* 左前方火山 */}
    <ModelLoader
      path="/models/Volcano.glb"
      position={[-40, 5, -20]}
      scale={25}
      rotation={[0, 1, 0]}
    />

    {/* 右前方火山 */}
    <ModelLoader
      path="/models/Volcano.glb"
      position={[30, 0, -20]}
      scale={[20, 10, 20]}
      rotation={[0, -1, 0]}
    />

    <ModelLoader
      path="/models/Volcano.glb"
      position={[70, 2, 20]}
      scale={28}
      rotation={[0, -0.4, 0]}
    />
    <ModelLoader
      path="/models/Volcano2.glb"
      position={[-20, -2, 20]}
      scale={0.1}
      rotation={[0, 2, 0]}
    />
    <ModelLoader
      path="/models/Volcano2.glb"
      position={[50, -5, -90]}
      scale={0.2}
      rotation={[0, 0.5, 0]}
    />

    {/* === 怪兽系统 === */}

    {/* 大BOSS：骷髅王 - 放在远处中央 */}
    <group position={[0, -5, -100]}>
      <ModelLoader
        path="/models/Skeleton.glb"
        scale={50}
        rotation={[0, 0, 0]}
      />
      {/* BOSS 红色光环 */}
      <pointLight color="#ff0000" intensity={4} distance={20} decay={2} />
      {/* BOSS 周围的火焰粒子 */}
      <Sparkles
        count={80}
        scale={8}
        size={8}
        speed={0.4}
        opacity={1.0}
        color="#ff3300"
      />
    </group>

    {/* 小恶魔群 - 分布在场景各处 */}

    {/* 左前方巡逻恶魔 - 放在左侧明显位置 */}
    <group position={[-20, 5, -18]}>
      <FloatingModel
        path="/models/Demon.glb"
        position={[0, 0, 0]}
        scale={2}
        rotation={[0, 0.8, 0]}
        floatAmplitude={0.6}
        floatSpeed={1.2}
        rotationSpeed={0.4}
      />
      <pointLight color="#ff4400" intensity={1.5} distance={8} />
    </group>

    {/* 右前方巡逻恶魔 - 放在右侧明显位置 */}
    <group position={[20, 5, -18]}>
      <FloatingModel
        path="/models/Demon.glb"
        position={[0, 0, 0]}
        scale={2.2}
        rotation={[0, -0.6, 0]}
        floatAmplitude={0.7}
        floatSpeed={1.0}
        rotationSpeed={0.35}
      />
      <pointLight color="#ff4400" intensity={1.5} distance={8} />
    </group>

    {/* 左侧高空哨兵 */}
    <FloatingModel
      path="/models/Demon.glb"
      position={[-30, 12, -30]}
      scale={1.8}
      rotation={[0, 1.2, 0]}
      floatAmplitude={0.8}
      floatSpeed={0.8}
      rotationSpeed={0.5}
    />

    {/* 右侧高空哨兵 */}
    <FloatingModel
      path="/models/Demon.glb"
      position={[30, 12, -30]}
      scale={1.9}
      rotation={[0, -1.0, 0]}
      floatAmplitude={0.75}
      floatSpeed={0.9}
      rotationSpeed={0.45}
    />

    {/* 远处左翼守卫 */}
    <FloatingModel
      path="/models/Demon.glb"
      position={[-35, 8, -55]}
      scale={2.5}
      rotation={[0, 0.5, 0]}
      floatAmplitude={0.5}
      floatSpeed={1.1}
      rotationSpeed={0.3}
    />

    {/* 远处右翼守卫 */}
    <FloatingModel
      path="/models/Demon.glb"
      position={[38, 9, -58]}
      scale={2.4}
      rotation={[0, -0.7, 0]}
      floatAmplitude={0.55}
      floatSpeed={1.15}
      rotationSpeed={0.32}
    />

    {/* BOSS 两侧的精英守卫 */}
    <group position={[-30, 8, -75]}>
      <FloatingModel
        path="/models/Demon_big.glb"
        position={[0, 0, 0]}
        scale={6.0}
        rotation={[0, 0.3, 0]}
        floatAmplitude={0.4}
        floatSpeed={0.7}
        rotationSpeed={0.25}
      />
      <pointLight color="#ff3300" intensity={2} distance={10} />
    </group>

    <group position={[30, 8, -75]}>
      <FloatingModel
        path="/models/Demon_big.glb"
        position={[0, 0, 0]}
        scale={6.0}
        rotation={[0, -0.3, 0]}
        floatAmplitude={0.4}
        floatSpeed={0.75}
        rotationSpeed={0.28}
      />
      <pointLight color="#ff3300" intensity={2} distance={10} />
    </group>


    {/* === 悬浮巨石 (Instanced for performance) === */}
    <FloatingRocksInstanced />

    {/* === 游戏场景 === */}
    <Platform position={[0, -0.25, 8]} size={[10, 0.5, 10]} safe interactive />
    <Signboard
      position={[0, 4.5, 1]}
      rotation={[0.2, 0, 0]}
      scale={2}
      title="炼金术士试炼"
      content={[
        "欢迎来到模拟训练场。",
        "按 [1] [2] [3] 切换元素枪。",
        "左键射击以改变物质属性。",
        "目标：抵达终点信标。",
        "祝你好运，新兵。"
      ]}
    />
    <LavaPlane />
    {JELLY_FLOATERS?.map((data, index) => (
      <LabObject
        key={`jelly-${index}`}
        position={data.position}
        size={data.size}
        resetToken={resetToken}
        isTargetSurface
      />
    ))}
    {LAVA_COLUMNS?.map((data, index) => (
      <LabObject key={`column-${index}`} position={data.position} size={data.size} resetToken={resetToken} />
    ))}
    <GoalBeacon position={[0, 15, -68]} />
  </>
);
