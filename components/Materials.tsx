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
    uniform float uTime;

    void main() {
      // Use normalized position as a smoothed normal to prevent mesh splitting at edges
      // Since BoxGeometry has split vertices at corners with different normals, 
      // using the original 'normal' attribute causes faces to separate when displaced.
      // normalize(position) gives a continuous direction for shared spatial positions.
      vec3 smoothedNormal = normalize(position);

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

      vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  // Fragment Shader
  `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    uniform vec3 uColor;

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
      
      // 3. Combine
      // Center is more transparent, edges are more opaque and white
      vec3 finalColor = uColor + specular + vec3(1.0) * fresnel * 0.8;
      
      float alpha = 0.6 + fresnel * 0.4; // Edges are less transparent

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
export const JellyMaterial = ({ color = "#39FF14" }: { color?: string }) => {
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
      side={THREE.FrontSide} // Fix: Use FrontSide to prevent seeing internal grid lines and bottom Z-fighting
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