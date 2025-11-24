import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CubeCamera, RoundedBox } from '@react-three/drei';
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

    // Common props for the mesh
    const meshProps = {
        ref: meshRef,
        userData: { isInteractive: true, hitHandler: hitHandler, type: type },
        castShadow: true,
        receiveShadow: true
    };

    // If it's JELLY, we use RoundedBox as the main mesh
    if (type === GunType.JELLY) {
        return (
            <group>
                {/* Back Face Mesh - Rendered first for volumetric look */}
                <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.2} smoothness={8} renderOrder={1}>
                     <JellyMaterial color="#39FF14" side={THREE.BackSide} />
                </RoundedBox>
                {/* Front Face Mesh - Rendered second, handles interaction */}
                <RoundedBox args={[1.5, 1.5, 1.5]} radius={0.2} smoothness={8} {...meshProps} renderOrder={2}>
                     <JellyMaterial color="#39FF14" side={THREE.FrontSide} />
                </RoundedBox>
            </group>
        );
    }

    // For other types, we use a standard mesh with BoxGeometry
    return (
      <mesh {...meshProps}>
        <boxGeometry args={[1.5, 1.5, 1.5, segments, segments, segments]} />
        
        {type === null && <LabMaterial />}
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
         // Optimization: Reduced resolution to 64 to improve performance
         <CubeCamera resolution={64} frames={Infinity}>
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