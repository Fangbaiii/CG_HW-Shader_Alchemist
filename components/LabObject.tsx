import React, { useState, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { GunType } from '../types';
import { JellyMaterial, GhostMaterial, MirrorMaterial, GhostWireframeMaterial, LabMaterial } from './Materials';

interface LabObjectProps {
  position: [number, number, number];
  initialType?: GunType | null;
  // 来自 pgh 分支的新属性，用于关卡设计
  size?: [number, number, number];
  contactBoost?: [number, number, number];
  isTargetSurface?: boolean;
  isSafeSurface?: boolean;
  resetToken?: number;
}

// Inner Mesh Component
const LabObjectMesh = ({ 
  type, 
  hitHandler, 
  envMap,
  size = [1.5, 1.5, 1.5], // 默认大小
  contactBoost,
  isTargetSurface,
  isSafeSurface
}: { 
  type: GunType | null, 
  hitHandler: (t: GunType) => void, 
  envMap?: THREE.Texture,
  size?: [number, number, number],
  contactBoost?: [number, number, number],
  isTargetSurface?: boolean,
  isSafeSurface?: boolean
}) => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!meshRef.current) return;
        // Animation logic if needed
    });

    const segments = type === GunType.JELLY ? 32 : 1;

    // 合并了 pgh 的 userData 逻辑
    const meshProps = {
        ref: meshRef,
        userData: { 
            // Optimization: Removed isInteractive and other logic props from Mesh
            // because they are now on the parent Group. This prevents double-counting
            // in collision systems and improves performance.
        },
        castShadow: true,
        receiveShadow: true
    };

    // Jelly 使用 RoundedBox，但也需要应用 size
    if (type === GunType.JELLY) {
        return (
            <group>
                <RoundedBox args={size} radius={0.2} smoothness={8} renderOrder={1}>
                     <JellyMaterial color="#39FF14" side={THREE.BackSide} />
                </RoundedBox>
                <RoundedBox args={size} radius={0.2} smoothness={8} {...meshProps} renderOrder={2}>
                     <JellyMaterial color="#39FF14" side={THREE.FrontSide} />
                </RoundedBox>
            </group>
        );
    }

    // 其他类型使用标准 BoxGeometry，应用 size 和 envMap
    return (
      <mesh {...meshProps}>
        {/* 使用 pgh 的动态尺寸 */}
        <boxGeometry args={[size[0], size[1], size[2], segments, segments, segments]} />
        
        {type === null && <LabMaterial />}
        {/* 保留 main 的 envMap */}
        {type === GunType.MIRROR && <MirrorMaterial envMap={envMap} />}
        {type === GunType.GHOST && <GhostMaterial />}
        
        {type === GunType.GHOST && (
            <mesh scale={[1.01, 1.01, 1.01]}>
                <boxGeometry args={[size[0], size[1], size[2]]} />
                <GhostWireframeMaterial />
            </mesh>
        )}
      </mesh>
    );
};

export const LabObject: React.FC<LabObjectProps> = ({ 
    position, 
    initialType = null, 
    size = [1.5, 1.5, 1.5],
    resetToken,
    contactBoost,
    isTargetSurface,
    isSafeSurface,
    ...props 
}) => {
  const [type, setType] = useState<GunType | null>(initialType);
  
  useEffect(() => {
    setType(initialType);
  }, [resetToken, initialType]);

  const hit = (gunType: GunType) => {
    setType(gunType);
  };

  return (
    <group position={position} userData={{ 
        isInteractive: true, 
        hitHandler: hit, 
        type: type,
        size,
        contactBoost,
        isTargetSurface,
        isSafeSurface
    }}>
         <LabObjectMesh 
            type={type} 
            hitHandler={hit} 
            size={size}
            contactBoost={contactBoost}
            isTargetSurface={isTargetSurface}
            isSafeSurface={isSafeSurface}
            {...props} 
         />
    </group>
  );
};