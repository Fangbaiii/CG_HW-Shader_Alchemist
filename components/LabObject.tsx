import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CubeCamera } from '@react-three/drei';
import * as THREE from 'three';
import { GunType } from '../types';
import { JellyMaterial, GhostMaterial, MirrorMaterial, GhostWireframeMaterial, LabMaterial } from './Materials';

interface LabObjectProps {
  position: [number, number, number];
  initialType?: GunType | null;
}

// Inner Mesh Component to handle the specific rendering logic and refs
// This allows us to wrap it conditionally with CubeCamera without code duplication
const LabObjectMesh = ({ 
  type, 
  hitHandler, 
  envMap 
}: { 
  type: GunType | null, 
  hitHandler: (t: GunType) => void, 
  envMap?: THREE.Texture 
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    // Animation logic - Removed Ghost movement as requested to avoid clipping
    useFrame((state) => {
        if (!meshRef.current) return;
        
        if (type === GunType.JELLY) {
             // Small wobble for jelly if needed, or rely on shader
        } 
    });

    // Adjust geometry segments based on type
    // Jelly needs high tessellation for vertex displacement (32x32x32)
    // Ghost needs low tessellation (1x1x1) so wireframe isn't too dense
    // Others can use standard low tessellation
    const segments = type === GunType.JELLY ? 32 : 1;

    return (
      <mesh 
        ref={meshRef} 
        // IMPORTANT: Add type to userData for collision detection in Player.tsx
        userData={{ isInteractive: true, hitHandler: hitHandler, type: type }}
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[1.5, 1.5, 1.5, segments, segments, segments]} />
        
        {type === null && <LabMaterial />}
        {type === GunType.JELLY && <JellyMaterial color="#39FF14" />}
        {type === GunType.MIRROR && <MirrorMaterial envMap={envMap} />}
        {type === GunType.GHOST && <GhostMaterial />}
        
        {/* Ghost needs a second mesh for the wireframe overlay effect */}
        {type === GunType.GHOST && (
            <mesh scale={[1.01, 1.01, 1.01]}>
                <boxGeometry args={[1.5, 1.5, 1.5]} />
                <GhostWireframeMaterial />
            </mesh>
        )}
      </mesh>
    );
};

export const LabObject: React.FC<LabObjectProps> = ({ position, initialType = null }) => {
  const [type, setType] = useState<GunType | null>(initialType);
  
  const hit = (gunType: GunType) => {
    setType(gunType);
  };

  return (
    <group position={position}>
      {type === GunType.MIRROR ? (
         // If it is a mirror, wrap in CubeCamera to generate real-time reflection texture
         <CubeCamera resolution={128} frames={Infinity}>
            {(texture) => (
                <LabObjectMesh type={type} hitHandler={hit} envMap={texture} />
            )}
         </CubeCamera>
      ) : (
         <LabObjectMesh type={type} hitHandler={hit} />
      )}
    </group>
  );
};