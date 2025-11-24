import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GunType } from '../types';
import { JellyMaterial, GhostMaterial, MirrorMaterial, GhostWireframeMaterial, LabMaterial } from './Materials';

interface LabObjectProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
  contactBoost?: [number, number, number];
  initialType?: GunType | null;
  resetToken?: number;
  isTargetSurface?: boolean;
  isSafeSurface?: boolean;
}

// Inner Mesh Component to handle the specific rendering logic and refs
// This allows us to wrap it conditionally with CubeCamera without code duplication
const LabObjectMesh = ({ 
  type, 
  hitHandler,
  size,
  contactBoost,
  isTargetSurface = false,
  isSafeSurface = false
}: { 
  type: GunType | null, 
  hitHandler: (t: GunType) => void,
  size: [number, number, number],
  contactBoost?: [number, number, number],
  isTargetSurface?: boolean,
  isSafeSurface?: boolean
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
        userData={{
          isInteractive: true,
          hitHandler: hitHandler,
          type: type,
          size,
          contactBoost,
          isTargetSurface,
          isSafeSurface,
        }}
        castShadow 
        receiveShadow
      >
        <boxGeometry args={[size[0], size[1], size[2], segments, segments, segments]} />
        
        {type === null && <LabMaterial />}
        {type === GunType.JELLY && <JellyMaterial color="#39FF14" />}
        {type === GunType.MIRROR && <MirrorMaterial />}
        {type === GunType.GHOST && <GhostMaterial />}
        
        {/* Ghost needs a second mesh for the wireframe overlay effect */}
        {type === GunType.GHOST && (
          <mesh scale={[1.01, 1.01, 1.01]}>
            <boxGeometry args={[size[0], size[1], size[2]]} />
                <GhostWireframeMaterial />
            </mesh>
        )}
      </mesh>
    );
};

    export const LabObject: React.FC<LabObjectProps> = ({ position, rotation = [0, 0, 0], size = [1.5, 1.5, 1.5], contactBoost, initialType = null, resetToken = 0, isTargetSurface, isSafeSurface }) => {
      const [type, setType] = useState<GunType | null>(initialType);

      React.useEffect(() => {
        setType(initialType ?? null);
      }, [initialType, resetToken]);
  
  const hit = (gunType: GunType) => {
    setType(gunType);
  };

  return (
    <group position={position} rotation={rotation}>
      <LabObjectMesh
        type={type}
        hitHandler={hit}
        size={size}
        contactBoost={contactBoost}
        isTargetSurface={isTargetSurface}
        isSafeSurface={isSafeSurface}
      />
    </group>
  );
};