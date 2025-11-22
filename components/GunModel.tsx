import React, { useRef } from 'react';
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

    // Idle Sway animation (Breathing)
    const t = state.clock.getElapsedTime();
    
    // Base position
    let targetY = -0.28; // Slightly lower
    let targetZ = -0.5;  // Adjusted for HUD camera FOV

    // Add breathing sway
    targetY += Math.sin(t * 2) * 0.005;
    const swayRotZ = Math.sin(t * 1.5) * 0.02;

    // Recoil Logic
    if (isShooting) {
        // Kick back
        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ + 0.15, 0.5);
        // Kick up
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.1, 0.5);
    } else {
        // Return to idle
        groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
        groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
    }

    // Apply sway to Y
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.1);
    
    // Apply sway to Z rotation
    groupRef.current.rotation.z = swayRotZ;
  });

  return (
    // Initial position is set here, but overridden by useFrame immediately
    <group ref={groupRef} position={[0.35, -0.28, -0.5]} rotation={[0, 0.04, 0]}>
      {/* --- Gun Body --- */}
      <mesh position={[0, 0, 0.2]}>
        <boxGeometry args={[0.15, 0.2, 0.6]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Handle */}
      <mesh position={[0, -0.15, 0.4]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.12, 0.3, 0.15]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* --- Dynamic Core --- */}
      <group position={[0, 0.08, 0.2]}>
          <mesh ref={liquidRef} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.4, 16]} />
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
          {/* Glass cover for core */}
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

      {/* Muzzle Ring */}
      <mesh position={[0, 0, -0.51]}>
        <torusGeometry args={[0.04, 0.01, 16, 100]} />
        <meshStandardMaterial color={config.color} emissive={config.color} emissiveIntensity={2} toneMapped={false} />
      </mesh>

      {/* Wires */}
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