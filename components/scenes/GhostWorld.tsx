import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { Environment, Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LabObject } from '@/components/entities/LabObject';
import { GhostMaterial, GhostWireframeMaterial } from '@/components/materials';
import { GunType } from '@/types';

type LabDefinition = {
  position: [number, number, number];
  size?: [number, number, number];
  rotation?: [number, number, number];
  contactBoost?: [number, number, number];
  initialType?: GunType | null;
  isTargetSurface?: boolean;
  isSafeSurface?: boolean;
};

const GHOST_LEVEL_OBJECTS: LabDefinition[] = [
  // 1. First Gate - Blocks the start
  { position: [0, 1.5, -6], size: [8, 4, 0.5] },

  // 2. Platform after gate
  { position: [0, -0.5, -10], size: [4, 0.5, 4], isSafeSurface: true, isTargetSurface: true },

  // 3. Jump Sequence
  { position: [-3, 0.5, -16], size: [3, 0.5, 3], isSafeSurface: true, isTargetSurface: true },
  { position: [3, 1.5, -22], size: [3, 0.5, 3], isSafeSurface: true, isTargetSurface: true },
  { position: [0, 2.0, -28], size: [4, 0.5, 4], isSafeSurface: true, isTargetSurface: true },

  // 4. Final Barrier - Large wall blocking the goal
  { position: [0, 5.0, -35], size: [12, 10, 1] },

  // 5. Goal Platform
  { position: [0, 1.5, -44], size: [6, 0.5, 6], isSafeSurface: true, isTargetSurface: true },
];

// --- 裂缝数据定义 ---
// 定义星球表面的主要裂缝位置和参数
interface CrackDefinition {
  zStart: number;
  zEnd: number;
  xOffset: number;      // 裂缝中心X偏移
  width: number;        // 裂缝宽度
  intensity: number;    // 能量强度
}

const PLANET_CRACKS: CrackDefinition[] = [
  // 主裂缝 - 沿中线延伸
  { zStart: 5, zEnd: -60, xOffset: 0, width: 0.8, intensity: 1.0 },
  // 左侧分支裂缝
  { zStart: -5, zEnd: -45, xOffset: -8, width: 0.5, intensity: 0.7 },
  // 右侧分支裂缝  
  { zStart: -10, zEnd: -50, xOffset: 10, width: 0.6, intensity: 0.8 },
  // 小裂缝群
  { zStart: -15, zEnd: -35, xOffset: -15, width: 0.3, intensity: 0.5 },
  { zStart: -20, zEnd: -40, xOffset: 18, width: 0.4, intensity: 0.6 },
];

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

// --- 消解星球地表 (Dissolving Planet Surface) ---
// 荒芜的星球表面，带有地平线曲率和发光裂缝
const PlanetSurface: React.FC = () => {
  const { camera } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // 生成裂缝数据传入shader的uniform数组
  const crackData = useMemo(() => {
    const data: number[] = [];
    PLANET_CRACKS.forEach(crack => {
      data.push(crack.zStart, crack.zEnd, crack.xOffset, crack.width, crack.intensity);
    });
    return new Float32Array(data);
  }, []);

  // 自定义着色器材质
  const planetMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPlayerPos: { value: new THREE.Vector3(0, 0, 0) },
        // 地表颜色 - 提亮以显示地形细节
        uBaseColor: { value: new THREE.Color('#746e68') },      // 中灰褐色
        uDarkColor: { value: new THREE.Color('#3a3835') },      // 深灰色但可见
        // 裂缝能量色
        uCrackColor: { value: new THREE.Color('#00ffff') },     // 青色能量
        uCrackGlow: { value: new THREE.Color('#00aaff') },      // 蓝色辉光
        // 地平线参数
        uHorizonCurvature: { value: 0.15 },                     // 曲率强度
        uMaxDistance: { value: 80.0 },                          // 最大曲率距离
        uFlatRadius: { value: 8.0 },                            // 玩家附近保持平坦的半径
        // 裂缝数据
        uCrackCount: { value: PLANET_CRACKS.length },
        uCrackData: { value: crackData },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec3 uPlayerPos;
        uniform float uHorizonCurvature;
        uniform float uMaxDistance;
        uniform float uFlatRadius;
        
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying float vDistToPlayer;
        varying float vTerrainHeight;
        
        // 简化噪声函数
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        void main() {
          vUv = uv;
          
          // 计算世界坐标
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          
          // 计算到玩家的水平距离
          vec2 toPlayer = worldPos.xz - uPlayerPos.xz;
          float distToPlayer = length(toPlayer);
          vDistToPlayer = distToPlayer;
          
          // 生成地形高度（多层FBM噪声叠加，增强崎岖感）
          float terrainNoise = fbm(worldPos.xz * 0.05) * 2.0;      // 大尺度起伏
          terrainNoise += fbm(worldPos.xz * 0.12) * 1.2;           // 中尺度崎岖
          terrainNoise += fbm(worldPos.xz * 0.3) * 0.5;            // 小尺度岩石细节
          terrainNoise += noise(worldPos.xz * 0.8) * 0.25;         // 微小的碗粒感
          terrainNoise -= 1.5; // 整体下压，使地面基础更低
          vTerrainHeight = terrainNoise;
          
          // 地平线曲率 - 只在远处生效
          float flatFactor = smoothstep(uFlatRadius, uFlatRadius + 10.0, distToPlayer);
          float horizonFactor = pow(clamp(distToPlayer / uMaxDistance, 0.0, 1.0), 2.0);
          float horizonOffset = horizonFactor * uHorizonCurvature * distToPlayer * flatFactor;
          
          // 应用高度偏移 - 近处保持平坦以便行走，远处崎岖
          float terrainScale = mix(0.3, 1.0, flatFactor); // 近处地形较平缓
          worldPos.y += terrainNoise * terrainScale;
          worldPos.y -= horizonOffset; // 地平线向下弯曲（模拟星球曲面）
          
          vWorldPosition = worldPos.xyz;
          
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uBaseColor;
        uniform vec3 uDarkColor;
        uniform vec3 uCrackColor;
        uniform vec3 uCrackGlow;
        uniform int uCrackCount;
        uniform float uCrackData[25]; // 5个裂缝 * 5个参数
        
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        varying float vDistToPlayer;
        varying float vTerrainHeight;
        
        // 噪声函数
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 3; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        // 计算到裂缝的距离
        float crackDistance(vec2 pos, float zStart, float zEnd, float xOffset, float width) {
          // 裂缝是沿Z轴的线段，带有噪声扰动
          if (pos.y < zEnd || pos.y > zStart) return 100.0;
          
          // 裂缝路径的X坐标带有蜿蜒效果
          float t = (pos.y - zEnd) / (zStart - zEnd);
          float crackX = xOffset + sin(pos.y * 0.3 + xOffset) * 2.0;
          crackX += fbm(vec2(pos.y * 0.5, xOffset)) * 3.0 - 1.5;
          
          // 到裂缝中心的距离
          float dist = abs(pos.x - crackX);
          
          // 裂缝宽度随深度变化（向远处收紧）
          float depthFactor = 1.0 - t * 0.5;
          float effectiveWidth = width * depthFactor;
          
          return dist / effectiveWidth;
        }
        
        void main() {
          vec2 pos = vWorldPosition.xz;
          
          // 基础地表颜色 - 使用噪声混合
          float surfaceNoise = fbm(pos * 0.15);
          float detailNoise = noise(pos * 0.8) * 0.3;
          vec3 baseColor = mix(uDarkColor, uBaseColor, surfaceNoise + detailNoise);
          
          // 添加细节纹理
          float rockDetail = fbm(pos * 0.5) * 0.15;
          baseColor *= (0.85 + rockDetail);
          
          // 基于地形高度的着色 - 高处亮，低处暗，强调凹凸感
          float heightShading = (vTerrainHeight + 1.5) * 0.35 + 0.4; // 映射到 0.4~1.2
          heightShading = clamp(heightShading, 0.35, 1.3);
          heightShading = pow(heightShading, 1.4); // 增强对比度
          baseColor *= heightShading;
          
          // 计算裂缝
          float minCrackDist = 100.0;
          float crackIntensity = 0.0;
          
          for (int i = 0; i < 5; i++) {
            if (i >= uCrackCount) break;
            int idx = i * 5;
            float zStart = uCrackData[idx];
            float zEnd = uCrackData[idx + 1];
            float xOffset = uCrackData[idx + 2];
            float width = uCrackData[idx + 3];
            float intensity = uCrackData[idx + 4];
            
            float dist = crackDistance(pos, zStart, zEnd, xOffset, width);
            if (dist < minCrackDist) {
              minCrackDist = dist;
              crackIntensity = intensity;
            }
          }
          
          // 裂缝发光效果
          float crackGlow = 0.0;
          if (minCrackDist < 1.0) {
            // 裂缝内部 - 强烈发光
            float crackCore = 1.0 - smoothstep(0.0, 0.3, minCrackDist);
            float crackEdge = 1.0 - smoothstep(0.3, 1.0, minCrackDist);
            
            // 能量脉冲动画
            float pulse = sin(uTime * 2.0 - vWorldPosition.z * 0.2) * 0.3 + 0.7;
            float flicker = noise(vec2(vWorldPosition.z * 0.5, uTime * 3.0)) * 0.2 + 0.8;
            
            crackGlow = (crackCore * 1.5 + crackEdge * 0.5) * crackIntensity * pulse * flicker;
          }
          
          // 裂缝边缘的辉光扩散
          float glowSpread = 1.0 - smoothstep(1.0, 3.0, minCrackDist);
          glowSpread *= crackIntensity * 0.15;
          
          // 混合最终颜色
          vec3 finalColor = baseColor;
          
          // 添加裂缝辉光
          finalColor = mix(finalColor, uCrackGlow, glowSpread);
          finalColor = mix(finalColor, uCrackColor, crackGlow);
          
          // 距离淡出
          float distFade = 1.0 - smoothstep(60.0, 100.0, vDistToPlayer);
          
          // 边缘雾化 - 使用更亮的雾色
          float fogFactor = smoothstep(50.0, 120.0, vDistToPlayer);
          finalColor = mix(finalColor, vec3(0.08, 0.07, 0.07), fogFactor * 0.6);
          
          gl_FragColor = vec4(finalColor, distFade);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });
  }, [crackData]);

  // 动画更新
  useFrame((state) => {
    if (planetMaterial) {
      planetMaterial.uniforms.uTime.value = state.clock.elapsedTime;
      planetMaterial.uniforms.uPlayerPos.value.copy(camera.position);
    }
  });

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, -25]}
      receiveShadow
    >
      <planeGeometry args={[200, 150, 96, 96]} />
      <primitive object={planetMaterial} attach="material" />
    </mesh>
  );
};

// --- 起始平台 (星球风格) ---
const StartingPlatform: React.FC = () => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const platformMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBaseColor: { value: new THREE.Color('#c8c4bc') },  // 更白的浅灰色
        uCrackColor: { value: new THREE.Color('#00ffff') }, // 青色裂缝，与地表裂缝一致
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vUv = uv;
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uBaseColor;
        uniform vec3 uCrackColor;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        void main() {
          vec2 pos = vPosition.xz;
          
          // 基础地表颜色带噪声 - 与星球地表一致的纹理
          float surfaceNoise = noise(pos * 2.0) * 0.15;
          float detailNoise = noise(pos * 5.0) * 0.08;
          vec3 baseColor = uBaseColor * (0.9 + surfaceNoise + detailNoise);
          
          // 两条蜿蜒裂缝
          // 裂缝1：从左前到右后
          float crack1X = -1.5 + sin(pos.y * 1.5) * 0.8 + noise(vec2(pos.y * 2.0, 0.0)) * 0.5;
          float crack1Dist = abs(pos.x - crack1X);
          float crack1 = 1.0 - smoothstep(0.0, 0.08, crack1Dist);
          float crack1Glow = 1.0 - smoothstep(0.08, 0.4, crack1Dist);
          
          // 裂缝2：从右前到左后
          float crack2X = 1.8 + sin(pos.y * 1.2 + 2.0) * 0.6 + noise(vec2(pos.y * 2.5, 5.0)) * 0.4;
          float crack2Dist = abs(pos.x - crack2X);
          float crack2 = 1.0 - smoothstep(0.0, 0.06, crack2Dist);
          float crack2Glow = 1.0 - smoothstep(0.06, 0.35, crack2Dist);
          
          // 合并裂缝
          float crackCore = max(crack1, crack2);
          float crackGlow = max(crack1Glow, crack2Glow);
          
          // 能量脉冲
          float pulse = sin(uTime * 2.0 + pos.y * 0.5) * 0.3 + 0.7;
          crackCore *= pulse;
          crackGlow *= pulse * 0.3;
          
          // 混合颜色
          vec3 finalColor = baseColor;
          finalColor = mix(finalColor, uCrackColor * 0.3, crackGlow);
          finalColor = mix(finalColor, uCrackColor * 1.5, crackCore);
          
          // 轻微自发光
          finalColor += uBaseColor * 0.05;
          
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  }, []);

  useFrame((state) => {
    if (platformMaterial) {
      platformMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh
      position={[0, -0.25, -2]}
      castShadow
      receiveShadow
      userData={{ isSafeSurface: true, isInteractive: true, size: [8, 0.5, 8], type: null }}
    >
      <boxGeometry args={[8, 0.5, 8]} />
      <primitive object={platformMaterial} attach="material" />
    </mesh>
  );
};

// --- 废墟山脉 (Ruined Mountains) ---
// 崎岖的山峰，使用LatheGeometry生成，参考火山生成方法
const RuinedMountain: React.FC<{
  position: [number, number, number];
  scale?: number;
  baseRadius?: number;
  height?: number;
  roughness?: number;
  color?: string;
}> = ({
  position,
  scale = 1,
  baseRadius = 8,
  height = 12,
  roughness = 1.5,
  color = '#5a5550'
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // 生成山体轮廓点
    const points = useMemo(() => {
      const pts: THREE.Vector2[] = [];
      const segments = 20;

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        let radius: number;
        if (t < 0.1) {
          radius = baseRadius * (1 - t * 0.3);
        } else if (t < 0.7) {
          const localT = (t - 0.1) / 0.6;
          radius = baseRadius * (0.97 - localT * 0.6) * (1 + Math.sin(localT * Math.PI * 3) * 0.08);
        } else {
          const localT = (t - 0.7) / 0.3;
          radius = baseRadius * (0.37 - localT * 0.35) * (1 - localT * 0.5);
        }

        const y = t * height;
        pts.push(new THREE.Vector2(Math.max(0.1, radius), y));
      }
      return pts;
    }, [baseRadius, height]);

    // 生成修改后的几何体 - 只执行一次
    const modifiedGeometry = useMemo(() => {
      const geometry = new THREE.LatheGeometry(points, 24);
      const pos = geometry.getAttribute('position');

      // 确定性随机数生成器
      const seed = Math.abs(position[0] * 1000 + position[2]);
      let s = seed;
      const random = () => {
        s = (s * 9301 + 49297) % 233280;
        return s / 233280;
      };

      // 保存原始位置以便计算
      const originalPositions = new Float32Array(pos.count * 3);
      for (let i = 0; i < pos.count; i++) {
        originalPositions[i * 3] = pos.getX(i);
        originalPositions[i * 3 + 1] = pos.getY(i);
        originalPositions[i * 3 + 2] = pos.getZ(i);
      }

      for (let i = 0; i < pos.count; i++) {
        const x = originalPositions[i * 3];
        const y = originalPositions[i * 3 + 1];
        const z = originalPositions[i * 3 + 2];

        // 根据高度调整噪声强度：底部稳定，中上部崎岖
        const heightFactor = Math.pow(y / height, 0.5);
        const noiseStrength = roughness * heightFactor;

        // 多层噪声叠加 - 增强崎岖感
        const angle = Math.atan2(z, x);
        const noise1 = Math.sin(angle * 5 + y * 0.3) * noiseStrength * 0.5;
        const noise2 = Math.sin(angle * 11 + y * 0.7) * noiseStrength * 0.3;
        const noise3 = Math.sin(angle * 17 + y * 1.2) * noiseStrength * 0.1;
        const noise4 = (random() - 0.5) * noiseStrength * 0.6;

        const offset = noise1 + noise2 + noise3 + noise4;

        // 径向偏移
        const dist = Math.sqrt(x * x + z * z);
        if (dist > 0.1) {
          const scale = 1 + offset / dist;
          pos.setX(i, x * scale);
          pos.setZ(i, z * scale);
        }

        // 垂直方向变化 - 增强岩石层次感
        const verticalNoise = (random() - 0.5) * roughness * 0.3;
        pos.setY(i, y + verticalNoise);
      }

      pos.needsUpdate = true;
      geometry.computeVertexNormals();

      return geometry;
    }, [points, roughness, height, position]);

    return (
      <mesh ref={meshRef} position={position} scale={scale} castShadow receiveShadow geometry={modifiedGeometry}>
        <meshStandardMaterial
          color={color}
          roughness={0.95}
          metalness={0.15}
          flatShading
          emissive="#3a3530"
          emissiveIntensity={0.25}
        />
      </mesh>
    );
  };

// 山脉群组
const MountainRange: React.FC = () => {
  // 分布在玩家周围远处的山脉 - 提亮颜色
  // Note: roughness is pre-calculated in useMemo to avoid re-computing on each render
  const mountains = useMemo(() => [
    // 左侧山脉群
    { position: [-35, -20, -25] as [number, number, number], scale: 1.2, height: 18, baseRadius: 10, color: '#5a5550', roughness: 1.35 },
    { position: [-50, -20, -15] as [number, number, number], scale: 0.9, height: 14, baseRadius: 8, color: '#524d45', roughness: 1.55 },
    { position: [-42, -20, -5] as [number, number, number], scale: 1.0, height: 12, baseRadius: 7, color: '#585248', roughness: 1.42 },

    // 右侧山脉群
    { position: [38, -20, -30] as [number, number, number], scale: 1.3, height: 20, baseRadius: 11, color: '#5a5550', roughness: 1.28 },
    { position: [52, -20, -18] as [number, number, number], scale: 0.85, height: 13, baseRadius: 7, color: '#4f4a42', roughness: 1.62 },
    { position: [45, -20, -8] as [number, number, number], scale: 1.1, height: 15, baseRadius: 9, color: '#565048', roughness: 1.45 },

    // 后方远景山脉
    { position: [0, -20, -55] as [number, number, number], scale: 1.5, height: 20, baseRadius: 14, color: '#4a4540', roughness: 1.38 },
    { position: [-10, -20, -50] as [number, number, number], scale: 1.1, height: 16, baseRadius: 9, color: '#504b45', roughness: 1.52 },
    { position: [22, -20, -52] as [number, number, number], scale: 1.25, height: 19, baseRadius: 11, color: '#4d4842', roughness: 1.33 },

    // 前方两侧点缀
    { position: [-30, -20, 15] as [number, number, number], scale: 0.7, height: 10, baseRadius: 6, color: '#585550', roughness: 1.58 },
    { position: [32, -20, 18] as [number, number, number], scale: 0.8, height: 11, baseRadius: 6.5, color: '#565350', roughness: 1.48 },
  ], []);

  return (
    <group>
      {mountains?.map((mt, i) => (
        <RuinedMountain
          key={i}
          position={mt.position}
          scale={mt.scale}
          height={mt.height}
          baseRadius={mt.baseRadius}
          roughness={mt.roughness}
          color={mt.color}
        />
      ))}
    </group>
  );
};


// --- 星云背景 (Nebula Background) ---
// 绚丽瑰丽的星云效果，使用简单的精灵片实现高性能
const NebulaCloud: React.FC<{
  position: [number, number, number];
  scale?: number;
  color1?: string;
  color2?: string;
  opacity?: number;
}> = ({
  position,
  scale = 50,
  color1 = '#ff00aa',
  color2 = '#00aaff',
  opacity = 0.3
}) => {
    const material = useMemo(() => {
      return new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor1: { value: new THREE.Color(color1) },
          uColor2: { value: new THREE.Color(color2) },
          uOpacity: { value: opacity },
        },
        vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
        fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform float uOpacity;
        
        varying vec2 vUv;
        
        // 简化的噪声函数
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < 4; i++) {
            value += amplitude * noise(p);
            p *= 2.0;
            amplitude *= 0.5;
          }
          return value;
        }
        
        void main() {
          vec2 uv = vUv - 0.5;
          float dist = length(uv);
          
          // 基础云层
          vec2 q = vec2(fbm(vUv * 3.0 + uTime * 0.02), fbm(vUv * 3.0 + vec2(5.0, 1.0)));
          float f = fbm(vUv * 2.0 + q + uTime * 0.01);
          
          // 颜色混合
          vec3 color = mix(uColor1, uColor2, f);
          
          // 边缘淡出
          float fadeEdge = 1.0 - smoothstep(0.2, 0.5, dist);
          
          // 云层密度变化
          float density = f * fadeEdge;
          density = smoothstep(0.2, 0.8, density);
          
          float alpha = density * uOpacity * fadeEdge;
          
          gl_FragColor = vec4(color * (0.5 + density * 0.5), alpha);
        }
      `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
    }, [color1, color2, opacity]);

    useFrame((state) => {
      material.uniforms.uTime.value = state.clock.elapsedTime;
    });

    return (
      <mesh position={position}>
        <planeGeometry args={[scale, scale]} />
        <primitive object={material} attach="material" />
      </mesh>
    );
  };

// 星云群组
const NebulaField: React.FC = () => {
  const nebulae = useMemo(() => [
    // ===== 左侧星云 (玩家左边) =====
    { position: [-80, 120, 50] as [number, number, number], scale: 90, color1: '#ff00aa', color2: '#aa00ff', opacity: 0.25 },
    { position: [-120, 150, -60] as [number, number, number], scale: 100, color1: '#00ddff', color2: '#00ffdd', opacity: 0.22 },

    // ===== 右侧星云 (玩家右边) =====
    { position: [80, 120, 80] as [number, number, number], scale: 90, color1: '#00aaff', color2: '#00ffaa', opacity: 0.25 },
    { position: [120, 150, -20] as [number, number, number], scale: 100, color1: '#0088ff', color2: '#aa00ff', opacity: 0.22 },

    // ===== 前方星云 (正前方远景) =====
    { position: [0, 160, -200] as [number, number, number], scale: 200, color1: '#ff3388', color2: '#8833ff', opacity: 0.23 },
    { position: [-50, 140, -200] as [number, number, number], scale: 120, color1: '#ffaa00', color2: '#ff6600', opacity: 0.18 },
    { position: [50, 140, -200] as [number, number, number], scale: 300, color1: '#00ff48', color2: '#ff00aa', opacity: 0.18 },
    { position: [50, 160, 200] as [number, number, number], scale: 300, color1: '#0008ff', color2: '#ff00aa', opacity: 0.18 },
    { position: [50, 140, 200] as [number, number, number], scale: 300, color1: '#ffb700', color2: '#ff00aa', opacity: 0.18 },

  ], []);
  return (
    <group>
      {nebulae?.map((nebula, index) => (
        <NebulaCloud
          key={index}
          position={nebula.position}
          scale={nebula.scale}
          color1={nebula.color1}
          color2={nebula.color2}
          opacity={nebula.opacity}
        />
      ))}
    </group>
  );
};

// --- 深渊粒子流 (Abyss Particle Stream) ---
// 从裂缝中向上喷射的能量粒子，带有向外弯曲效果
// 使用 GPU Instancing 优化性能
const AbyssParticleStream: React.FC<{
  position: [number, number, number];
  radius?: number;
  height?: number;
  color?: string;
  count?: number;
  particleType?: 'cube' | 'digit' | 'dot';
  density?: number;
  outwardBend?: number; // 新增：向外弯曲强度（模拟能量向太空泄漏）
}> = ({
  position,
  radius = 8.0,
  height = 60,
  color = '#00ffff',
  count = 40,
  particleType = 'cube',
  density = 1.0,
  outwardBend = 0.0
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // 实际粒子数量根据密度调整
    const actualCount = Math.floor(count * density);

    // 生成粒子初始数据 - 使用更自然的分布
    const particles = useMemo(() => {
      const arr = [];
      for (let i = 0; i < actualCount; i++) {
        // 使用平方根分布让粒子在半径内更均匀
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        // 初始高度分布在整个范围内
        const initialY = Math.random() * height - height / 2;

        // 上升速度 - 缓慢而优雅
        const speed = 1.5 + Math.random() * 2.5;

        // 粒子大小 - 小巧精致
        const size = 0.15 + Math.random() * 0.25;

        // 相位偏移，用于摇摆动画
        const phase = Math.random() * Math.PI * 2;
        const phaseY = Math.random() * Math.PI * 2;

        // 摇摆幅度
        const wobbleAmplitude = 0.3 + Math.random() * 0.5;

        // 亮度变化
        const brightness = 0.5 + Math.random() * 0.5;

        // 数字类型 (0 或 1)
        const digitType = Math.random() > 0.5 ? 1 : 0;

        arr.push({
          x, z, initialY, speed, size, phase, phaseY,
          wobbleAmplitude, brightness, digitType
        });
      }
      return arr;
    }, [actualCount, radius, height]);

    // 颜色
    const colorObj = useMemo(() => new THREE.Color(color), [color]);

    useFrame((state) => {
      if (!meshRef.current) return;

      const time = state.clock.elapsedTime;

      particles.forEach((p, i) => {
        // 计算当前Y位置 - 循环上升
        let y = ((p.initialY + time * p.speed) % height);
        if (y > height / 2) y -= height;
        if (y < -height / 2) y += height;

        // 优雅的摇摆运动 - 像气泡一样
        const wobbleX = Math.sin(time * 0.8 + p.phase) * p.wobbleAmplitude;
        const wobbleZ = Math.cos(time * 0.6 + p.phaseY) * p.wobbleAmplitude * 0.8;

        // 计算向外弯曲效果 - 粒子越高，向外偏移越大
        const heightProgress = (y + height / 2) / height; // 0 到 1
        const bendFactor = heightProgress * heightProgress * outwardBend;

        // 从粒子源点向外的方向
        const outwardX = p.x * bendFactor;
        const outwardZ = p.z * bendFactor;

        // 轻微的旋转
        const rotY = time * 0.5 + p.phase;
        const rotX = Math.sin(time * 0.3 + p.phase) * 0.2;

        dummy.position.set(
          position[0] + p.x + wobbleX + outwardX,
          position[1] + y,
          position[2] + p.z + wobbleZ + outwardZ
        );

        dummy.rotation.set(rotX, rotY, 0);
        dummy.scale.setScalar(p.size);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });

      meshRef.current.instanceMatrix.needsUpdate = true;
    });

    // 根据粒子类型选择几何体
    const geometry = useMemo(() => {
      switch (particleType) {
        case 'cube':
          return <boxGeometry args={[1, 1, 1]} />;
        case 'dot':
          return <sphereGeometry args={[0.5, 6, 6]} />;
        case 'digit':
        default:
          return <planeGeometry args={[1, 1]} />;
      }
    }, [particleType]);

    return (
      <instancedMesh ref={meshRef} args={[undefined, undefined, actualCount]}>
        {geometry}
        <meshBasicMaterial
          color={colorObj}
          transparent
          opacity={0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    );
  };

// --- 全局飘浮粒子 (Ambient Floating Particles) ---
// 覆盖整个场景的稀疏粒子，营造空气感
const AmbientParticles: React.FC<{
  count?: number;
  spread?: [number, number, number];
  color?: string;
}> = ({
  count = 200,
  spread = [80, 40, 100],
  color = '#00ffff'
}) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);

    // 生成环境粒子
    const particles = useMemo(() => {
      const arr = [];
      for (let i = 0; i < count; i++) {
        // 在整个空间中随机分布
        const x = (Math.random() - 0.5) * spread[0];
        const y = (Math.random() - 0.5) * spread[1];
        const z = -Math.random() * spread[2] - 5; // 主要在前方

        const speed = 0.3 + Math.random() * 0.8;
        const size = 0.05 + Math.random() * 0.1;
        const phase = Math.random() * Math.PI * 2;
        const phaseY = Math.random() * Math.PI * 2;
        const wobbleAmp = 0.5 + Math.random() * 1.0;

        arr.push({ x, y, z, speed, size, phase, phaseY, wobbleAmp });
      }
      return arr;
    }, [count, spread]);

    const colorObj = useMemo(() => new THREE.Color(color), [color]);

    useFrame((state) => {
      if (!meshRef.current) return;

      const time = state.clock.elapsedTime;

      particles.forEach((p, i) => {
        // 缓慢上升
        let y = p.y + (time * p.speed) % spread[1];
        if (y > spread[1] / 2) y -= spread[1];

        // 轻微飘动
        const wobbleX = Math.sin(time * 0.5 + p.phase) * p.wobbleAmp;
        const wobbleZ = Math.cos(time * 0.4 + p.phaseY) * p.wobbleAmp * 0.6;

        dummy.position.set(p.x + wobbleX, y, p.z + wobbleZ);
        dummy.scale.setScalar(p.size);
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });

      meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 4, 4]} />
        <meshBasicMaterial
          color={colorObj}
          transparent
          opacity={0.4}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </instancedMesh>
    );
  };

// --- 检查点区域增强粒子 ---
// 在关键位置（检查点、平台）附近有更密集的粒子
const CheckpointGlow: React.FC<{
  position: [number, number, number];
  color?: string;
}> = ({ position, color = '#00ffff' }) => {
  return (
    <group position={position}>
      {/* 局部密集粒子流 - 带向外弯曲 */}
      <AbyssParticleStream
        position={[0, 0, 0]}
        radius={4}
        height={30}
        color={color}
        count={30}
        particleType="cube"
        density={1.5}
        outwardBend={0.3}
      />

    </group>
  );
};

// --- 共享的数字纹理 (全局单例) ---
let sharedDigitTexture: THREE.CanvasTexture | null = null;




// --- 裂缝能量流系统 ---
// 沿裂缝分布的能量粒子流，向上喷射并向外弯曲
const CrackEnergyStreams: React.FC = () => {
  // 基于裂缝数据生成能量流源点
  const streams = useMemo(() => {
    const result: Array<{
      position: [number, number, number];
      radius: number;
      color: string;
      count: number;
      outwardBend: number;
    }> = [];

    PLANET_CRACKS.forEach(crack => {
      // 沿每条裂缝放置2-3个能量流源点
      const crackLength = crack.zStart - crack.zEnd;
      const numStreams = Math.floor(crackLength / 20) + 1;

      for (let i = 0; i < numStreams; i++) {
        const t = i / Math.max(numStreams - 1, 1);
        const z = crack.zStart - t * crackLength;

        // 裂缝路径带有蜿蜒效果
        const x = crack.xOffset + Math.sin(z * 0.3 + crack.xOffset) * 2.0;

        result.push({
          position: [x, -0.5, z] as [number, number, number],
          radius: crack.width * 2 + 1,
          color: crack.intensity > 0.7 ? '#00ffff' : '#00aaff',
          count: Math.floor(20 * crack.intensity),
          outwardBend: 0.4 + crack.intensity * 0.3,
        });
      }
    });

    return result;
  }, []);

  return (
    <>
      {/* 裂缝能量流 - 从裂缝中喷射向太空 */}
      {streams?.map((stream, index) => (
        <AbyssParticleStream
          key={`crack-stream-${index}`}
          position={stream.position}
          radius={stream.radius}
          height={50}
          color={stream.color}
          count={stream.count}
          particleType="cube"
          outwardBend={stream.outwardBend}
        />
      ))}

      {/* 全局环境粒子 - 稀疏的能量尘埃 */}
      <AmbientParticles
        count={100}
        spread={[80, 40, 100]}
        color="#00ddff"
      />
    </>
  );
};

// --- 主场景组件 ---
interface GhostWorldProps {
  resetToken: number;
}

export const GhostWorld: React.FC<GhostWorldProps> = ({ resetToken }) => (
  <>
    {/* 
       Level 2: 消解星球 (Dissolving Planet)
       正在崩解的星球表面，核心能量通过裂缝向外泄漏
       配合幽灵枪的穿透能力，营造末日星球的氛围
    */}
    <color attach="background" args={['#0a0910']} />
    <fog attach="fog" args={['#151215', 50, 150]} />

    {/* <Environment preset="night" /> */}
    <Stars radius={150} depth={80} count={4000} factor={5} saturation={0.2} fade speed={0.3} />

    {/* 绚丽星云背景 - 在星空中增添瑰丽色彩 */}
    <NebulaField />

    {/* 消解星球地表 - 带地平线曲率和发光裂缝 */}
    <PlanetSurface />

    {/* 裂缝能量流 - 从裂缝中喷射向太空 */}
    <CrackEnergyStreams />

    {/* 光照 - 适配荒芜星球风格 */}
    <ambientLight intensity={0.45} />
    <directionalLight
      position={[10, 25, 8]}
      intensity={0.9}
      castShadow
      shadow-mapSize-width={1024}
      shadow-mapSize-height={1024}
      color="#ffeedd"
    />
    {/* 半球光 - 模拟天空和地面的环境反射 */}
    <hemisphereLight args={['#4466aa', '#332211', 0.3]} />
    {/* 裂缝能量的环境辉光 */}
    <pointLight position={[0, 3, -20]} intensity={0.8} color="#00ffff" distance={60} />
    <pointLight position={[-8, 2, -30]} intensity={0.5} color="#00aaff" distance={50} />
    <pointLight position={[10, 2, -40]} intensity={0.5} color="#00ddff" distance={50} />
    {/* 深处微光 */}
    <pointLight position={[0, -3, -25]} intensity={0.3} color="#00ffaa" distance={70} />

    {/* 起始平台 - 星球风格 */}
    <StartingPlatform />

    {/* 关卡物体 - 幽灵墙和平台 */}
    {GHOST_LEVEL_OBJECTS?.map((data, index) => (
      <LabObject
        key={`ghost-obj-${index}`}
        position={data.position}
        size={data.size}
        rotation={data.rotation}
        contactBoost={data.contactBoost}
        initialType={data.initialType}
        isTargetSurface={data.isTargetSurface}
        isSafeSurface={data.isSafeSurface}
        resetToken={resetToken}
        stageId={1}
      />
    ))}

    {/* 废墟山脉 - 远景 */}
    <MountainRange />

    {/* 终点信标 */}
    <GoalBeacon position={[0, 2, -44]} />
  </>
);
