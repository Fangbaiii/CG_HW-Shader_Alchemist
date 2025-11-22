import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GunType, GUN_CONFIGS } from '../types';
import { MeshWobbleMaterial } from '@react-three/drei';

interface GunModelProps {
  currentGun: GunType;
  isShooting: boolean;
}

export const GunModel: React.FC<GunModelProps> = ({ currentGun, isShooting }) => {
  const groupRef = useRef<THREE.Group>(null);
  const barrelRef = useRef<THREE.Mesh>(null);
  const liquidRef = useRef<THREE.Mesh>(null);
  
  const config = GUN_CONFIGS[currentGun];
  const color = new THREE.Color(config.emissive);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    // Sway animation (breathing)
    const t = state.clock.getElapsedTime();
    // Adjusted Y base to -0.25 to show more gun
    groupRef.current.position.y = -0.25 + Math.sin(t * 2) * 0.005; 
    groupRef.current.rotation.z = Math.sin(t * 1.5) * 0.01;

    // Recoil
    if (isShooting) {
        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, -0.3, 0.5);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.1, 0.5);
    } else {
        // Resting Z at -0.5 brings it closer to camera than -0.6
        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, -0.45, 0.1);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
    }
  });

  return (
    // Position: X=0.3 (Less right), Y=-0.25 (Higher), Z=-0.45 (Closer/Bigger)
    // Rotation: Less inward rotation to show side profile
    <group ref={groupRef} position={[0.35, -0.25, -0.45]} rotation={[0, 0.02, 0]}>
      {/* --- Gun Body (Sci-fi structure) --- */}
      <mesh position={[0, 0, 0.2]} castShadow>
        <boxGeometry args={[0.15, 0.2, 0.6]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Handle */}
      <mesh position={[0, -0.15, 0.4]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.12, 0.3, 0.15]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* --- Dynamic Core / Liquid Chamber --- */}
      <group position={[0, 0.08, 0.2]}>
          <mesh ref={liquidRef} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.4, 16]} />
            {/* The core material changes drastically based on gun type */}
            {currentGun === GunType.JELLY && (
               <MeshWobbleMaterial factor={0.4} speed={2} color={color} emissive={color} emissiveIntensity={2} toneMapped={false} />
            )}
            {currentGun === GunType.GHOST && (
               <meshBasicMaterial color={color} wireframe />
            )}
            {currentGun === GunType.MIRROR && (
                <meshStandardMaterial color="#fff" metalness={1} roughness={0} envMapIntensity={1} />
            )}
          </mesh>
          {/* Glass casing for the core */}
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 0.42, 16]} />
            <meshPhysicalMaterial 
                transmission={1} 
                opacity={0.3} 
                transparent 
                roughness={0} 
                thickness={0.1} 
            />
          </mesh>
      </group>

      {/* --- Barrel --- */}
      <mesh ref={barrelRef} position={[0, 0, -0.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.04, 0.4, 16]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Barrel Tip / Emitter */}
      <mesh position={[0, 0, -0.51]}>
        <torusGeometry args={[0.04, 0.01, 16, 100]} />
        <meshStandardMaterial color={config.color} emissive={config.color} emissiveIntensity={2} toneMapped={false} />
      </mesh>

      {/* Wires/Tubes */}
      <mesh position={[0.08, 0.05, 0]}>
         <tubeGeometry args={[new THREE.CatmullRomCurve3([
             new THREE.Vector3(0, 0, 0.4),
             new THREE.Vector3(0.05, 0.05, 0.2),
             new THREE.Vector3(0, 0, -0.2)
         ]), 20, 0.01, 8, false]} />
         <meshStandardMaterial color={config.color} emissive={config.color} emissiveIntensity={1} />
      </mesh>
    </group>
  );
};