import React, { useRef } from 'react';
import { MeshDistortMaterial, shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// --- CUSTOM JELLY SHADER MATERIAL ---
const JellyShaderMaterialImpl = shaderMaterial(
  { 
    uTime: 0, 
    uColor: new THREE.Color('#26b809ff') 
  },
  // Vertex Shader
  `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vPos; // Pass local position to fragment shader
    uniform float uTime;

    void main() {
      // Use normalized position as a smoothed normal to prevent mesh splitting at edges
      // Since BoxGeometry has split vertices at corners with different normals, 
      // using the original 'normal' attribute causes faces to separate when displaced.
      // normalize(position) gives a continuous direction for shared spatial positions.
      // FIX: Handle (0,0,0) case to prevent NaN (Black Cross artifact)
      // If position is too close to center, fallback to original normal instead of arbitrary (0,1,0)
      vec3 smoothedNormal = length(position) > 0.001 ? normalize(position) : normal;

      // 1. Calculate Normal for lighting
      // We use the smoothed normal for lighting too, to give it a soft, organic look
      vNormal = normalize(normalMatrix * smoothedNormal);

      // 2. Superimposed Sine Waves for Displacement
      // Base breathing wave
      float breath = sin(uTime * 2.0) * 0.05;
      // Wave traveling along Y axis (gravity/sagging feel)
      float gravityWave = sin(position.y * 4.0 - uTime * 3.0) * 0.05;
      // High frequency tremble
      float tremble = sin(position.x * 10.0 + position.z * 8.0 + uTime * 10.0) * 0.02;

      float totalDisplacement = breath + gravityWave + tremble;

      // 3. Apply displacement with floor constraint
      vec3 displacement = smoothedNormal * totalDisplacement;

      // FIX: Prevent floor clipping (Jelly bottom sticking to floor)
      // The box bottom is at y = -0.75. We want the bottom to stick to the floor.
      // smoothstep returns 0.0 at -0.75 and 1.0 at -0.25, creating a transition zone.
      float heightFactor = smoothstep(-0.75, -0.25, position.y);
      
      // Attenuate Y displacement near the bottom so it doesn't dig into the floor
      displacement.y *= heightFactor;

      vec3 newPosition = position + displacement;

      // Hard floor constraint: never let any vertex go below -0.75
      newPosition.y = max(newPosition.y, -0.75);
      
      vPos = position; // Pass original position for static noise

      vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vPos;
    uniform vec3 uColor;

    // Pseudo-random function
    float random(vec3 st) {
        return fract(sin(dot(st.xyz, vec3(12.9898,78.233,45.5432))) * 43758.5453123);
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      vec3 lightDir = normalize(vec3(5.0, 5.0, 5.0)); // Fixed light source

      // 1. Wetness (Specular)
      // Blinn-Phong or Phong
      vec3 reflectDir = reflect(-lightDir, normal);
      float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0); // High shininess
      vec3 specular = vec3(1.0) * spec;

      // 2. Fresnel Effect (Edge Glow)
      // Calculate angle between view direction and normal
      float viewDotNormal = max(dot(viewDir, normal), 0.0);
      float fresnel = pow(1.0 - viewDotNormal, 3.0);
      
      // 3. Color Gradient (Yellow-Green Center -> Green Edge)
      // Mix based on distance from center or fresnel
      vec3 centerColor = vec3(0.8, 1.0, 0.2); // Yellowish Green
      vec3 edgeColor = vec3(0.2, 1.0, 0.4);   // Pure Green
      
      // Mix based on fresnel: center is yellow-green, edges are pure green
      vec3 baseColor = mix(centerColor, edgeColor, fresnel);

      // 4. Bubbles (3D Noise with Neighbor Search)
      // Create a grid of cells
      float scale = 2.0;
      // FIX: Offset position to avoid negative coordinate discontinuity artifacts (Black Cross)
      // fract() has a discontinuity at 0 for negative numbers in some implementations or logic
      vec3 shiftedPos = vPos + vec3(1000.0);
      vec3 cell = floor(shiftedPos * scale);
      vec3 local = fract(shiftedPos * scale);
      
      float bubbleMask = 0.0;
      vec3 bubbleNormalAccum = vec3(0.0);
      
      // Search neighbor cells (3x3x3) to prevent cutting off bubbles at cell boundaries
      for (int z = -1; z <= 1; z++) {
        for (int y = -1; y <= 1; y++) {
          for (int x = -1; x <= 1; x++) {
             vec3 neighbor = vec3(float(x), float(y), float(z));
             vec3 currentCell = cell + neighbor;
             
             // Random position for bubble in that cell
             vec3 bubblePos = neighbor + vec3(random(currentCell), random(currentCell + 1.0), random(currentCell + 2.0));
             
             // Distance from current fragment to this bubble center
             float dist = length(local - bubblePos);
             
             // Random size
             float bubbleRadius = random(currentCell + 3.0) * 0.3 + 0.05; 
             
             // Check if inside bubble
             if (dist < bubbleRadius) {
                 // Soft edge for the bubble
                 float b = 1.0 - smoothstep(bubbleRadius - 0.01, bubbleRadius + 0.01, dist);
                 bubbleMask = max(bubbleMask, b);
                 
                 // Calculate normal for this bubble (approximate)
                 if (b > 0.0) {
                    bubbleNormalAccum = normalize(local - bubblePos);
                 }
             }
          }
        }
      }
      
      // Fake 3D lighting for bubble
      vec3 bubbleLightDir = normalize(vec3(1.0, 1.0, 1.0));
      float bSpec = 0.0;
      if (bubbleMask > 0.0) {
          bSpec = pow(max(dot(bubbleNormalAccum, bubbleLightDir), 0.0), 32.0);
      }
      
      // Add bubbles to color (white with highlight)
      vec3 bubbleColor = vec3(1.0) * bubbleMask * (0.4 + bSpec * 2.0);

      // 5. Combine
      // Center is more transparent, edges are more opaque and white
      vec3 finalColor = baseColor + specular + vec3(1.0) * fresnel * 0.5 + bubbleColor;
      
      float alpha = 0.15 + fresnel * 0.5 + bubbleMask * 0.8; // Edges and bubbles are less transparent

      gl_FragColor = vec4(finalColor, alpha);
    }
  `
);

extend({ JellyShaderMaterialImpl });

// Add type definition for the new material
declare module '@react-three/fiber' {
  interface ThreeElements {
    jellyShaderMaterialImpl: any;
  }
}

// --- 1. JELLY MATERIAL ---
// Uses custom shader to simulate wobbling fluid
export const JellyMaterial = ({ color = "#33d017ff", side = THREE.FrontSide }: { color?: string, side?: THREE.Side }) => {
  const materialRef = useRef<any>(null);
  
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });

  return (
    <jellyShaderMaterialImpl
      ref={materialRef}
      uColor={new THREE.Color(color)}
      transparent
      side={side}
      depthWrite={false}      // Disable depth write to prevent self-occlusion artifacts
    />
  );
};

// --- 2. GHOST/WIREFRAME MATERIAL ---
// A complex component that renders a transparent shell + glowing wireframe
export const GhostMaterial = () => {
  return (
    <>
      {/* Inner Transparent Core */}
      <meshPhysicalMaterial
        color="#00ffff"
        transparent
        opacity={0.1}
        roughness={0}
        metalness={0.8}
        side={THREE.DoubleSide}
        emissive="#004444"
        emissiveIntensity={0.2}
      />
    </>
  );
};
// Helper for the wireframe overlay logic, usually used as a child mesh
export const GhostWireframeMaterial = () => (
    <meshBasicMaterial
      color="#00ffff"
      wireframe
      transparent
      opacity={0.4}
    />
);

// --- 3. MIRROR MATERIAL ---
// Pure PBR reflection with optional dynamic envMap
export const MirrorMaterial = ({ envMap }: { envMap?: THREE.Texture }) => {
  return (
    <meshStandardMaterial
      color="#ffffff"
      roughness={0.0}
      metalness={1.0}
      envMap={envMap}
      envMapIntensity={1}
    />
  );
};

// --- 4. LAVA MATERIAL ---
// Procedural flowing lava shader
const LavaShaderMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor1: new THREE.Color('#ff3300'), // Bright orange/red
    uColor2: new THREE.Color('#330000'), // Dark red/black
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying float vDisplacement;
    uniform float uTime;

    // Simplex noise function (simplified)
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy) );
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1;
      i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
      vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
      m = m*m ;
      m = m*m ;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
      vec3 g;
      g.x  = a0.x  * x0.x  + h.x  * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      vUv = uv;
      
      // Flowing noise
      float noise = snoise(uv * 3.0 + uTime * 0.2);
      vDisplacement = noise;
      
      // Slight vertex displacement for waves
      vec3 newPos = position;
      newPos.z += noise * 0.5; 

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec2 vUv;
    varying float vDisplacement;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uTime;

    void main() {
      // Mix colors based on displacement/noise
      // High displacement = hot (bright), Low = cold (dark)
      float mixFactor = smoothstep(-1.0, 1.0, vDisplacement);
      
      // Add some pulsing glow
      float pulse = sin(uTime * 2.0) * 0.1;
      
      vec3 color = mix(uColor2, uColor1, mixFactor + pulse);
      
      // Add "cracks" or brighter veins
      float veins = smoothstep(0.4, 0.5, vDisplacement);
      color += vec3(1.0, 0.8, 0.0) * veins * 0.5;

      gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ LavaShaderMaterialImpl });

declare module '@react-three/fiber' {
  interface ThreeElements {
    jellyShaderMaterialImpl: any;
    lavaShaderMaterialImpl: any;
  }
}

export const LavaMaterial = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });
  return <lavaShaderMaterialImpl ref={materialRef} />;
};

// --- VOLCANO SKY SHADER ---
// 程序化火山天空：底部橙红色 -> 中间暗红 -> 顶部灰黑色
const VolcanoSkyMaterialImpl = shaderMaterial(
  {
    uTime: 0,
  },
  // Vertex Shader
  `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec3 vWorldPosition;
    uniform float uTime;
    
    // Simple noise for cloud/smoke effect
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
      float f = 0.0;
      f += 0.5 * noise(p); p *= 2.02;
      f += 0.25 * noise(p); p *= 2.03;
      f += 0.125 * noise(p); p *= 2.01;
      f += 0.0625 * noise(p);
      return f / 0.9375;
    }
    
    void main() {
      // Normalize direction
      vec3 dir = normalize(vWorldPosition);
      
      // Height factor (0 at horizon, 1 at top)
      float height = dir.y * 0.5 + 0.5;
      
      // Base sky colors
      vec3 horizonColor = vec3(0.4, 0.08, 0.02);  // 暗橙红色地平线
      vec3 midColor = vec3(0.15, 0.03, 0.02);     // 暗红色中间
      vec3 zenithColor = vec3(0.05, 0.03, 0.03);  // 灰黑色天顶
      
      // Mix colors based on height
      vec3 skyColor;
      if (height < 0.3) {
        // Below horizon - glow from lava
        skyColor = mix(vec3(0.6, 0.15, 0.02), horizonColor, height / 0.3);
      } else if (height < 0.6) {
        skyColor = mix(horizonColor, midColor, (height - 0.3) / 0.3);
      } else {
        skyColor = mix(midColor, zenithColor, (height - 0.6) / 0.4);
      }
      
      // Add smoke/ash clouds
      vec2 cloudUV = dir.xz / (dir.y + 0.5) * 2.0;
      float cloudNoise = fbm(cloudUV + uTime * 0.02);
      float cloudMask = smoothstep(0.3, 0.7, cloudNoise) * smoothstep(0.2, 0.5, height);
      
      vec3 smokeColor = vec3(0.08, 0.06, 0.06);
      skyColor = mix(skyColor, smokeColor, cloudMask * 0.6);
      
      // Add some ember glow near horizon
      float emberGlow = smoothstep(0.4, 0.25, height) * (0.5 + 0.5 * sin(uTime * 0.5));
      skyColor += vec3(0.3, 0.05, 0.0) * emberGlow * 0.3;
      
      gl_FragColor = vec4(skyColor, 1.0);
    }
  `
);

extend({ VolcanoSkyMaterialImpl });

declare module '@react-three/fiber' {
  interface ThreeElements {
    jellyShaderMaterialImpl: any;
    lavaShaderMaterialImpl: any;
    volcanoSkyMaterialImpl: any;
  }
}

export const VolcanoSkyMaterial = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });
  return <volcanoSkyMaterialImpl ref={materialRef} side={THREE.BackSide} />;
};

// --- LAVA FALL SHADER ---
// 流动的岩浆瀑布效果
const LavaFallMaterialImpl = shaderMaterial(
  {
    uTime: 0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec2 vUv;
    uniform float uTime;
    
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
      vec2 uv = vUv;
      
      // Flowing downward
      float flow = uTime * 0.5;
      
      // Create flowing lava streams
      float n1 = noise(vec2(uv.x * 3.0, uv.y * 8.0 - flow));
      float n2 = noise(vec2(uv.x * 5.0 + 1.0, uv.y * 12.0 - flow * 1.2));
      
      float stream = smoothstep(0.3, 0.7, n1) * 0.7 + smoothstep(0.4, 0.6, n2) * 0.3;
      
      // Color: dark crust to bright lava
      vec3 crustColor = vec3(0.1, 0.02, 0.01);
      vec3 lavaColor = vec3(1.0, 0.4, 0.0);
      vec3 brightLava = vec3(1.0, 0.8, 0.2);
      
      vec3 color = mix(crustColor, lavaColor, stream);
      color = mix(color, brightLava, smoothstep(0.7, 0.9, stream));
      
      // Edge fade
      float edgeFade = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x);
      
      gl_FragColor = vec4(color, edgeFade * 0.9);
    }
  `
);

extend({ LavaFallMaterialImpl });

// --- VOLCANO ROCK SHADER ---
// 火山岩体材质 - 带有发光裂缝效果
const VolcanoRockMaterialImpl = shaderMaterial(
  {
    uTime: 0,
  },
  // Vertex Shader
  `
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    void main() {
      vPosition = position;
      vNormal = normal;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    uniform float uTime;
    
    // Voronoi for cracks
    vec2 hash2(vec2 p) {
      return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
    }
    
    float voronoi(vec2 p) {
      vec2 n = floor(p);
      vec2 f = fract(p);
      float md = 1.0;
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          vec2 r = g + o - f;
          float d = dot(r, r);
          md = min(md, d);
        }
      }
      return md;
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
      float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
      float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    void main() {
      // 使用3D位置生成裂缝
      vec2 crackUV = vPosition.xz * 0.08 + vPosition.y * 0.05;
      
      // Voronoi裂缝
      float v = voronoi(crackUV * 3.0);
      float crack = smoothstep(0.0, 0.02, v) * smoothstep(0.08, 0.03, v);
      
      // 添加一些大裂缝
      float bigCrack = smoothstep(0.0, 0.01, v) * smoothstep(0.03, 0.015, v);
      
      // 高度影响 - 越靠近顶部裂缝越多越亮
      float heightFactor = smoothstep(-20.0, 20.0, vPosition.y);
      
      // 基础岩石颜色
      float rockNoise = noise(vPosition.xz * 0.2);
      vec3 rockColor = mix(vec3(0.08, 0.04, 0.03), vec3(0.12, 0.06, 0.04), rockNoise);
      
      // 裂缝发光颜色
      vec3 lavaGlow = vec3(1.0, 0.3, 0.0);
      vec3 brightGlow = vec3(1.0, 0.7, 0.1);
      
      // 脉动效果
      float pulse = 0.7 + 0.3 * sin(uTime * 1.5 + vPosition.y * 0.5);
      
      // 混合裂缝
      float crackIntensity = (crack * 0.6 + bigCrack * 1.0) * heightFactor * pulse;
      vec3 crackColor = mix(lavaGlow, brightGlow, bigCrack);
      
      vec3 finalColor = mix(rockColor, crackColor, crackIntensity);
      
      // 添加边缘光
      float rimLight = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
      finalColor += vec3(0.3, 0.05, 0.0) * rimLight * heightFactor * 0.3;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ VolcanoRockMaterialImpl });

// --- LAVA STREAM SHADER ---
// 岩浆河流材质 - 用于TubeGeometry的流动岩浆
const LavaStreamMaterialImpl = shaderMaterial(
  {
    uTime: 0,
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    uniform float uTime;
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
      float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
      float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    void main() {
      // 沿着管道流动
      float flow = uTime * 0.8;
      vec2 flowUV = vec2(vUv.x * 2.0, vUv.y * 10.0 - flow);
      
      // 多层噪声
      float n1 = noise(flowUV);
      float n2 = noise(flowUV * 2.0 + 10.0);
      float n3 = noise(flowUV * 0.5 + 5.0);
      
      float lavaPattern = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
      
      // 颜色渐变
      vec3 darkLava = vec3(0.15, 0.02, 0.0);
      vec3 hotLava = vec3(1.0, 0.4, 0.0);
      vec3 brightLava = vec3(1.0, 0.9, 0.3);
      
      vec3 color = mix(darkLava, hotLava, smoothstep(0.3, 0.6, lavaPattern));
      color = mix(color, brightLava, smoothstep(0.7, 0.9, lavaPattern));
      
      // 边缘冷却效果
      float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
      color = mix(vec3(0.05, 0.02, 0.01), color, edge);
      
      // 发光强度
      float glow = smoothstep(0.4, 0.8, lavaPattern) * edge;
      
      gl_FragColor = vec4(color, 0.95);
    }
  `
);

extend({ LavaStreamMaterialImpl });

declare module '@react-three/fiber' {
  interface ThreeElements {
    jellyShaderMaterialImpl: any;
    lavaShaderMaterialImpl: any;
    volcanoSkyMaterialImpl: any;
    lavaFallMaterialImpl: any;
    volcanoRockMaterialImpl: any;
    lavaStreamMaterialImpl: any;
  }
}

export const LavaFallMaterial = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });
  return <lavaFallMaterialImpl ref={materialRef} transparent side={THREE.DoubleSide} />;
};

export const VolcanoRockMaterial = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });
  return <volcanoRockMaterialImpl ref={materialRef} />;
};

// --- LOW POLY VOLCANO ROCK MATERIAL ---
// 使用 flatShading 产生 Low Poly 玄武岩效果
export const LowPolyVolcanoRockMaterial = () => (
  <meshStandardMaterial 
    color="#1a1a1a" 
    roughness={0.9} 
    metalness={0.2}
    flatShading={true}
  />
);

export const LavaStreamMaterial = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });
  return <lavaStreamMaterialImpl ref={materialRef} transparent />;
};

// --- OBSIDIAN MATERIAL ---
// 黑曜石材质 - 深黑色带发光裂纹效果
const ObsidianMaterialImpl = shaderMaterial(
  {
    uTime: 0,
  },
  // Vertex Shader
  `
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    
    void main() {
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    uniform float uTime;
    
    // Voronoi for cracks
    vec2 hash2(vec2 p) {
      return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
    }
    
    float voronoi(vec2 p) {
      vec2 n = floor(p);
      vec2 f = fract(p);
      float md = 1.0;
      float md2 = 1.0;
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash2(n + g);
          vec2 r = g + o - f;
          float d = dot(r, r);
          if (d < md) {
            md2 = md;
            md = d;
          } else if (d < md2) {
            md2 = d;
          }
        }
      }
      return md2 - md; // Edge detection
    }
    
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453);
      float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453);
      float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453);
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }
    
    void main() {
      // 使用3D位置生成裂缝
      vec2 crackUV = vPosition.xz * 0.5 + vPosition.y * 0.3;
      
      // Voronoi裂缝边缘
      float crack = voronoi(crackUV * 2.0);
      float crackLine = smoothstep(0.0, 0.03, crack) * smoothstep(0.08, 0.02, crack);
      
      // 基础黑曜石颜色 - 深黑色带微妙变化
      float rockNoise = noise(vPosition.xz * 0.8 + vPosition.y * 0.5);
      vec3 baseColor = mix(vec3(0.02, 0.02, 0.03), vec3(0.06, 0.05, 0.07), rockNoise);
      
      // 添加微弱的紫色/蓝色光泽（黑曜石特有）
      float sheen = pow(max(0.0, dot(vNormal, normalize(vec3(1.0, 1.0, 0.5)))), 8.0);
      baseColor += vec3(0.05, 0.02, 0.08) * sheen;
      
      // 裂缝发光颜色 - 暗橙/红色岩浆光
      vec3 crackGlow = vec3(0.8, 0.2, 0.05);
      
      // 微弱的脉动效果
      float pulse = 0.6 + 0.4 * sin(uTime * 0.8 + vPosition.x * 0.5 + vPosition.z * 0.5);
      
      // 混合裂缝
      vec3 finalColor = mix(baseColor, crackGlow, crackLine * pulse * 0.7);
      
      // 简单光照
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
      float diff = max(0.0, dot(vNormal, lightDir)) * 0.5 + 0.5;
      finalColor *= diff;
      
      // 边缘高光
      float rimLight = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0))), 3.0);
      finalColor += vec3(0.15, 0.05, 0.02) * rimLight * 0.3;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ ObsidianMaterialImpl });

declare module '@react-three/fiber' {
  interface ThreeElements {
    jellyShaderMaterialImpl: any;
    lavaShaderMaterialImpl: any;
    volcanoSkyMaterialImpl: any;
    lavaFallMaterialImpl: any;
    volcanoRockMaterialImpl: any;
    lavaStreamMaterialImpl: any;
    obsidianMaterialImpl: any;
  }
}

export const ObsidianMaterial = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });
  return <obsidianMaterialImpl ref={materialRef} />;
};

// --- PLANET BLOCK MATERIAL ---
// Alien Tech-Rock: Dark metallic rock with pulsing energy veins and holographic rim
const PlanetBlockShaderMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uBaseColor: new THREE.Color('#1a1a2e'), // Deep dark blue/purple rock
    uCrackColor: new THREE.Color('#00ffff'), // Cyan energy
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uBaseColor;
    uniform vec3 uCrackColor;
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    varying vec3 vViewPosition;

    // Simplex Noise
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) { 
      const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
      const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

      // First corner
      vec3 i  = floor(v + dot(v, C.yyy) );
      vec3 x0 = v - i + dot(i, C.xxx) ;

      // Other corners
      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min( g.xyz, l.zxy );
      vec3 i2 = max( g.xyz, l.zxy );

      //   x0 = x0 - 0.0 + 0.0 * C.xxx;
      //   x1 = x0 - i1  + 1.0 * C.xxx;
      //   x2 = x0 - i2  + 2.0 * C.xxx;
      //   x3 = x0 - 1.0 + 3.0 * C.xxx;
      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
      vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

      // Permutations
      i = mod289(i); 
      vec4 p = permute( permute( permute( 
                 i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
               + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
               + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

      // Gradients: 7x7 points over a square, mapped onto an octahedron.
      // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
      float n_ = 0.142857142857; // 1.0/7.0
      vec3  ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4( x.xy, y.xy );
      vec4 b1 = vec4( x.zw, y.zw );

      //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
      //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

      vec3 p0 = vec3(a0.xy,h.x);
      vec3 p1 = vec3(a0.zw,h.y);
      vec3 p2 = vec3(a1.xy,h.z);
      vec3 p3 = vec3(a1.zw,h.w);

      //Normalise gradients
      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      // Mix final noise value
      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                    dot(p2,x2), dot(p3,x3) ) );
    }

    void main() {
        vec3 viewDir = normalize(vViewPosition);
        vec3 normal = normalize(vNormal);
        
        // 1. Base Rock Texture (Dark, Metallic)
        float n = snoise(vPosition * 2.0);
        vec3 rockColor = mix(uBaseColor * 0.5, uBaseColor * 1.5, n * 0.5 + 0.5);
        
        // 2. Tech Grid / Circuit Pattern
        // Use UVs for a clean grid
        vec2 gridUV = vUv * 4.0;
        vec2 grid = abs(fract(gridUV) - 0.5) / fwidth(gridUV);
        float line = min(grid.x, grid.y);
        float gridFactor = 1.0 - smoothstep(0.0, 1.0, line);
        
        // 3. Energy Veins (Moving Noise)
        float energyNoise = snoise(vPosition * 1.5 + vec3(0.0, uTime * 0.3, 0.0));
        float vein = smoothstep(0.4, 0.6, energyNoise);
        
        // 4. Fresnel Rim Light (Holographic feel)
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.5);
        
        // --- Composition ---
        vec3 finalColor = rockColor;
        
        // Add Grid (Subtle)
        finalColor += uCrackColor * gridFactor * 0.3;
        
        // Add Veins (Bright)
        finalColor = mix(finalColor, uCrackColor, vein * 0.8);
        
        // Add Fresnel (Strong at edges)
        finalColor += uCrackColor * fresnel * 0.6;
        
        // Pulse effect on veins
        float pulse = 0.8 + 0.2 * sin(uTime * 3.0);
        if (vein > 0.1) finalColor *= pulse;

        gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ PlanetBlockShaderMaterialImpl });

declare module '@react-three/fiber' {
  interface ThreeElements {
    planetBlockShaderMaterialImpl: any;
  }
}

export const PlanetBlockMaterial = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });
  return <planetBlockShaderMaterialImpl ref={materialRef} />;
};

// --- 6. CYBER GRID MATERIAL (Level 3) ---
// A retro-futuristic neon grid shader for the "Cyber City" theme
const CyberGridShaderMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#00ffff'), // Cyan grid
    uBaseColor: new THREE.Color('#050510'), // Dark background
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    varying vec3 vPos;
    void main() {
      vUv = uv;
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    varying vec2 vUv;
    varying vec3 vPos;
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uBaseColor;

    void main() {
      // Create a grid pattern
      float gridSize = 10.0; // Density
      
      // Moving grid effect
      float move = uTime * 0.2;
      
      // Calculate grid lines
      // Use absolute position for world-aligned grid feel, or UV for object-aligned
      // Here we use UV for simplicity on cubes
      float x = fract(vUv.x * gridSize + move);
      float y = fract(vUv.y * gridSize);
      
      float lineThickness = 0.05;
      float gridX = step(1.0 - lineThickness, x);
      float gridY = step(1.0 - lineThickness, y);
      
      float grid = max(gridX, gridY);
      
      // Pulse effect
      float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + vPos.y * 5.0);
      
      vec3 finalColor = mix(uBaseColor, uColor, grid * pulse);
      
      // Add a subtle glow at the bottom
      float glow = 1.0 - vUv.y;
      finalColor += uColor * glow * 0.2;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
);

extend({ CyberGridShaderMaterialImpl });

declare module '@react-three/fiber' {
  interface ThreeElements {
    cyberGridShaderMaterialImpl: any;
  }
}

export const CyberGridMaterial = () => {
  const materialRef = useRef<any>(null);
  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
    }
  });
  return <cyberGridShaderMaterialImpl ref={materialRef} />;
};

// --- DEFAULT LAB MATERIAL ---
export const LabMaterial = () => (
    <meshStandardMaterial color="#dddddd" roughness={0.8} metalness={0.2} />
);