import React from 'react';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// --- 1. JELLY MATERIAL ---
// Uses vertex distortion to simulate wobbling fluid
export const JellyMaterial = ({ color = "#00ff00" }: { color?: string }) => {
  return (
    <MeshDistortMaterial
      color={color}
      speed={3}
      distort={0.4}
      radius={1}
      roughness={0.1}
      metalness={0.1}
      bumpScale={0.05}
      clearcoat={1}
      clearcoatRoughness={0.1}
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