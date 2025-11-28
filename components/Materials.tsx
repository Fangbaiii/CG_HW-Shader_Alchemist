import React, { useRef } from 'react';
import { MeshDistortMaterial, shaderMaterial } from '@react-three/drei';
import { extend, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// --- CUSTOM JELLY SHADER MATERIAL ---
const JellyShaderMaterialImpl = shaderMaterial(
  { 
    uTime: 0, 
    uColor: new THREE.Color('#39FF14') 
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
export const JellyMaterial = ({ color = "#39FF14", side = THREE.FrontSide }: { color?: string, side?: THREE.Side }) => {
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

// --- DEFAULT LAB MATERIAL ---
export const LabMaterial = () => (
    <meshStandardMaterial color="#dddddd" roughness={0.8} metalness={0.2} />
);