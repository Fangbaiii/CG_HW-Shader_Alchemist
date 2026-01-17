import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CrystalObject } from '@/components/entities/CrystalObject';
import { JellyMaterial } from '@/components/materials';
import { GunType } from '@/types';
import { ModelLoader } from '@/components/entities/ModelLoader';

// --- 天空行星定义 ---
type PlanetDefinition = {
  model: string;
  position: [number, number, number];
  scale: number;
  rotationSpeed?: number;  // 自转速度
};

const SKY_PLANETS: PlanetDefinition[] = [
  { model: '/models/Planet1.glb', position: [-35, 40, -50], scale: 2, rotationSpeed: 0.1 },
  { model: '/models/Planet3.glb', position: [25, 55, -35], scale: 1.5, rotationSpeed: 0.12 },


];

// --- 旋转行星组件 ---
interface RotatingPlanetProps {
  model: string;
  position: [number, number, number];
  scale: number;
  rotationSpeed: number;
}

const RotatingPlanet: React.FC<RotatingPlanetProps> = ({ model, position, scale, rotationSpeed }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <ModelLoader
        path={model}
        scale={scale}
        castShadow={false}
        receiveShadow={false}
      />
    </group>
  );
};

// --- 关卡类型定义 ---
type LabDefinition = {
  position: [number, number, number];
  size?: [number, number, number];
  rotation?: [number, number, number];
  contactBoost?: [number, number, number];
  initialType?: GunType | null;
  isTargetSurface?: boolean;
  isSafeSurface?: boolean;
};

type CrystalDefinition = {
  model: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  isInteractive?: boolean;
  isBlocker?: boolean;
  isSafeSurface?: boolean;
  collisionSize?: [number, number, number];
};

// --- 水晶障碍物 - 阻挡玩家，需要线框枪穿透 ---
const CRYSTAL_BARRIERS: CrystalDefinition[] = [
  // 1. 入口水晶墙
  {
    model: '/models/Crystal_blue.glb',
    position: [0, -2, -10],
    scale: 0.8,
    collisionSize: [8, 8, 4],
    rotation: [0, 2, 0],
  },
  // 2. 中段左侧水晶
  {
    model: '/models/Crystal_cluster_blue.glb',
    position: [-9, -5, -22],
    scale: [2, 4, 2],
    rotation: [0, 0.5, 0],
    collisionSize: [3, 5, 2],
  },
  // 3. 中段右侧水晶
  {
    model: '/models/Crystal_cluster_pink.glb',
    position: [-2.5, -1, -62],
    scale: [24, 24, 24],
    rotation: [0, -0.3, 0],
    collisionSize: [4, 4, 2],
  },
  // 4.水晶屏障
  {
    model: '/models/Crystal_cluster_white.glb',
    position: [-12, 0, -43],
    scale: 50.0,
    collisionSize: [10, 8, 3],
  },
];

// --- 浮空平台定义 ---
type FloatingPlatformDef = {
  position: [number, number, number];
  radius: number;  // 上表面半径
  height?: number;
};

const FLOATING_PLATFORMS: FloatingPlatformDef[] = [
  { position: [0, 0.5, -15], radius: 2.5 },
  { position: [-16, 0.5, -30], radius: 2.0 },
  { position: [-14, 1.5, -35], radius: 2.0 },
  { position: [-12, 2.5, -50], radius: 2.5 },
  { position: [0, 2, -70], radius: 3.5 },  // 终点平台
];

// --- 装饰性水晶 - 不阻挡，仅视觉 ---
const DECORATIVE_CRYSTALS: CrystalDefinition[] = [
  { model: '/models/Crystal_blue.glb', position: [-20, -2, 20], scale: 1.2, isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_cluster_pink.glb', position: [-10, -1, 5], scale: 12, rotation: [0, 1.2, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_cluster_blue.glb', position: [-16, -5, -12], scale: 1.0, isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_cluster_white.glb', position: [14, 3, -12], scale: 20, rotation: [0, -0.8, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_blue.glb', position: [12, -0.5, -28], scale: 1.4, isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_cluster_pink.glb', position: [26, 0, -10], scale: [24, 24, 24], rotation: [0, 0.5, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_blue.glb', position: [15, -1, 10], scale: 0.6, isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_blue.glb', position: [7, -0.5, -30], scale: 0.5, rotation: [0, 2.1, 0], isInteractive: false, isBlocker: false },
  // 远处地平线水晶群
  { model: '/models/Crystal_cluster_white.glb', position: [-45, -3, -55], scale: 35, rotation: [0, 0.8, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_cluster_pink.glb', position: [38, -2, -65], scale: 28, rotation: [0, -1.2, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_blue.glb', position: [-55, -1, -35], scale: 2.0, rotation: [0, 1.5, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_cluster_blue.glb', position: [50, -3, -45], scale: 2.5, rotation: [0, -0.6, 0], isInteractive: false, isBlocker: false },
  // 左侧区域
  { model: '/models/Crystal_blue.glb', position: [-35, -2, -8], scale: 1.8, rotation: [0, 0.3, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_cluster_pink.glb', position: [-42, -1, -25], scale: 18, rotation: [0, 2.2, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_cluster_white.glb', position: [-30, 0, -40], scale: 22, rotation: [0, -0.5, 0], isInteractive: false, isBlocker: false },
  // 右侧区域
  { model: '/models/Crystal_blue.glb', position: [35, -1, 5], scale: 1.5, rotation: [0, -1.8, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_cluster_blue.glb', position: [42, -2, -20], scale: 1.8, rotation: [0, 0.9, 0], isInteractive: false, isBlocker: false },
  // 起点后方
  { model: '/models/Crystal_cluster_pink.glb', position: [5, -1, 25], scale: 15, rotation: [0, -0.4, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_blue.glb', position: [-15, -2, 35], scale: 2.2, rotation: [0, 1.0, 0], isInteractive: false, isBlocker: false },
  { model: '/models/Crystal_cluster_white.glb', position: [20, 0, 30], scale: 25, rotation: [0, 2.5, 0], isInteractive: false, isBlocker: false },
];

// --- 终点信标 ---
const GoalBeacon = ({ position }: { position: [number, number, number] }) => (
  <group position={position}>
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.2, 0.15, 16, 64]} />
      <meshStandardMaterial color="#88ddff" emissive="#88ddff" emissiveIntensity={0.6} metalness={1} roughness={0.1} />
    </mesh>
    <mesh position={[0, 1.2, 0]}>
      <octahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color="#ffffff" emissive="#88ddff" emissiveIntensity={1} />
    </mesh>
    <pointLight color="#88ddff" intensity={1.2} distance={25} decay={2} />
  </group>
);

// --- Low-Poly 渐变天空 ---
const GradientSky: React.FC = () => {
  const skyMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTopColor: { value: new THREE.Color('#4466aa') },     // 天顶蓝紫
      uHorizonColor: { value: new THREE.Color('#ffe4a0') }, // 地平线暖黄
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uTopColor;
      uniform vec3 uHorizonColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        h = clamp(h * 0.8 + 0.3, 0.0, 1.0);
        vec3 color = mix(uHorizonColor, uTopColor, h);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    side: THREE.BackSide,
  }), []);

  return (
    <mesh>
      <sphereGeometry args={[180, 16, 16]} />
      <primitive object={skyMaterial} attach="material" />
    </mesh>
  );
};

// --- Low-Poly 地表 - 暖色调米灰风格 ---
const CrystalPlanetSurface: React.FC = () => {
  const { camera } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  // 创建并修改几何体 - 一次性生成 Low-Poly 地形
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(200, 200, 32, 32);
    const pos = geo.getAttribute('position');

    // 简单的确定性噪声函数
    const noise = (x: number, z: number, scale: number) => {
      return Math.sin(x * scale) * Math.cos(z * scale * 0.7) * 0.5 +
        Math.sin(x * scale * 1.3 + 1.0) * Math.cos(z * scale * 1.1) * 0.3;
    };

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);  // 平面几何体的 Y 实际是 XZ 平面的 Z

      // 多层噪声叠加形成地形
      let height = noise(x, y, 0.03) * 5.0;    // 大尺度丘陵
      height += noise(x, y, 0.08) * 2.5;       // 中等起伏
      height += noise(x, y, 0.2) * 1.0;        // 小细节

      pos.setZ(i, height);  // 平面旋转后 Z 变成 Y
    }

    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, []);

  // 基于高度的颜色计算
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#8a8070',      // 暖灰基色
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,     // Low-Poly 关键！
  }), []);

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -2, -25]}
      receiveShadow
    />
  );
};

// --- 起始平台 - 倒金字塔浮空样式 ---
const StartingPlatform: React.FC = () => {
  return <FloatingPlatform position={[0, -1, -2]} radius={4} height={1.5} />;
};

// --- 通用浮空平台组件 - 支持果冻枪交互 ---
interface FloatingPlatformProps {
  position: [number, number, number];
  radius: number;
  height?: number;
  resetToken?: number;
}

const FloatingPlatform: React.FC<FloatingPlatformProps> = ({ position, radius, height = 1.2, resetToken }) => {
  const [type, setType] = useState<GunType | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // 重置时恢复原始状态
  useEffect(() => {
    setType(null);
  }, [resetToken]);

  // 被枪击中时的处理函数
  const hit = (gunType: GunType) => {
    setType(gunType);
  };

  const platformMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color('#1a3366') },
        uEdgeColor: { value: new THREE.Color('#00ccff') },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uBaseColor;
        uniform vec3 uEdgeColor;
        varying vec3 vNormal;
        void main() {
          float rim = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
          vec3 baseColor = mix(uBaseColor, uBaseColor * 1.4, rim * 0.5);
          float pulse = sin(uTime * 2.0) * 0.15 + 0.85;
          vec3 finalColor = mix(baseColor, uEdgeColor, rim * 0.6 * pulse);
          float alpha = 0.9 + rim * 0.1;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
    });
  }, []);

  useFrame((state) => {
    if (platformMaterial) {
      platformMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const bottomRadius = radius * 0.6;
  const collisionSize: [number, number, number] = [radius * 2, height, radius * 2];

  // 果冻状态 - 使用 JellyMaterial
  if (type === GunType.JELLY) {
    return (
      <group position={position} userData={{
        isInteractive: true,
        hitHandler: hit,
        type: type,
        size: collisionSize,
        isSafeSurface: true,
        contactBoost: [0, 15, 0],  // 果冻弹跳效果
      }}>
        {/* 内层 */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[radius, bottomRadius, height, 6]} />
          <JellyMaterial color="#24b60aff" side={THREE.BackSide} />
        </mesh>
        {/* 外层 */}
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[radius, bottomRadius, height, 6]} />
          <JellyMaterial color="#39FF14" side={THREE.FrontSide} />
        </mesh>
        <pointLight position={[0, -height / 2 - 0.5, 0]} intensity={0.5} color="#39FF14" distance={8} />
      </group>
    );
  }

  // 默认状态 - 使用原有材质
  return (
    <group position={position} userData={{
      isInteractive: true,
      hitHandler: hit,
      type: type,
      size: collisionSize,
      isSafeSurface: true,
    }}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, bottomRadius, height, 6]} />
        <primitive object={platformMaterial} attach="material" />
      </mesh>
      <pointLight position={[0, -height / 2 - 0.5, 0]} intensity={0.3} color="#66ccff" distance={6} />
    </group>
  );
};

// --- 主场景组件 ---
interface CrystalWorldProps {
  resetToken: number;
}

export const CrystalWorld: React.FC<CrystalWorldProps> = ({ resetToken }) => (
  <>
    {/* Level 2: 水晶世界 (Crystal World) - 暖色调 */}

    {/* 渐变天空 */}
    <GradientSky />

    {/* 天空行星 */}
    {SKY_PLANETS.map((planet, index) => (
      <RotatingPlanet
        key={`sky-planet-${index}`}
        model={planet.model}
        position={planet.position}
        scale={planet.scale}
        rotationSpeed={planet.rotationSpeed ?? 0.1}
      />
    ))}

    {/* 禁用默认背景色和雾效 - 天空球已包含 */}
    <fog attach="fog" args={['#c0b090', 60, 180]} />

    {/* Low-Poly 地表 */}
    <CrystalPlanetSurface />

    {/* 光照 - 增强对比度突出 Low-Poly 棱角 */}
    <ambientLight intensity={0.2} color="#d0c8b0" />
    <directionalLight
      position={[20, 40, 15]}
      intensity={2.0}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      color="#fff8e0"
    />
    <hemisphereLight args={['#87ceeb', '#5a5550', 0.3]} />

    {/* 水晶辉光点光源 */}
    <pointLight position={[0, 3, -20]} intensity={0.6} color="#88ddff" distance={60} />
    <pointLight position={[-8, 2, -30]} intensity={0.4} color="#ff88dd" distance={50} />
    <pointLight position={[10, 2, -40]} intensity={0.4} color="#88ffdd" distance={50} />

    {/* 起始平台 */}
    <StartingPlatform />

    {/* 水晶障碍物 - 需要线框枪穿透 */}
    {CRYSTAL_BARRIERS.map((data, index) => (
      <CrystalObject
        key={`crystal-barrier-${index}`}
        model={data.model}
        position={data.position}
        rotation={data.rotation}
        scale={data.scale}
        isInteractive={data.isInteractive !== false}
        isBlocker={data.isBlocker !== false}
        isSafeSurface={data.isSafeSurface}
        collisionSize={data.collisionSize}
        resetToken={resetToken}
      />
    ))}

    {/* 装饰性水晶 */}
    {DECORATIVE_CRYSTALS.map((data, index) => (
      <CrystalObject
        key={`crystal-deco-${index}`}
        model={data.model}
        position={data.position}
        rotation={data.rotation}
        scale={data.scale}
        isInteractive={false}
        isBlocker={false}
        resetToken={resetToken}
      />
    ))}

    {/* 浮空平台 - 倒金字塔样式，支持果冻枪 */}
    {FLOATING_PLATFORMS.map((data, index) => (
      <FloatingPlatform
        key={`floating-platform-${index}`}
        position={data.position}
        radius={data.radius}
        height={data.height}
        resetToken={resetToken}
      />
    ))}

    {/* 终点信标 */}
    <GoalBeacon position={[0, 3, -70]} />
  </>
);
