import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { GunType } from '@/types';
import { JellyMaterial, GhostMaterial, MirrorMaterial, GhostWireframeMaterial, ObsidianMaterial, PlanetBlockMaterial, CyberGridMaterial } from '@/components/materials';

interface LabObjectProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  initialType?: GunType | null;
  // 来自 pgh 分支的新属性，用于关卡设计
  size?: [number, number, number];
  contactBoost?: [number, number, number];
  isTargetSurface?: boolean;
  isSafeSurface?: boolean;
  resetToken?: number;
  stageId?: number;
  onTypeChange?: (type: GunType) => void;
}

// Inner Mesh Component
const LabObjectMesh = ({
  type,
  hitHandler,
  envMap,
  size = [1.5, 1.5, 1.5], // 默认大小
  contactBoost,
  isTargetSurface,
  isSafeSurface,
  stageId = 0
}: {
  type: GunType | null,
  hitHandler: (t: GunType) => void,
  envMap?: THREE.Texture,
  size?: [number, number, number],
  contactBoost?: [number, number, number],
  isTargetSurface?: boolean,
  isSafeSurface?: boolean,
  stageId?: number
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
          <JellyMaterial color="#24b60aff" side={THREE.BackSide} />
        </RoundedBox>
        <RoundedBox args={size} radius={0.2} smoothness={8} {...meshProps} renderOrder={2}>
          <JellyMaterial color="#39FF14" side={THREE.FrontSide} />
        </RoundedBox>
      </group>
    );
  }

  // 默认状态（type === null）根据关卡使用不同材质
  if (type === null) {
    // 第一关：立方体 + 黑曜石材质
    if (stageId === 0) {
      return (
        <mesh {...meshProps}>
          <boxGeometry args={[size[0], size[1], size[2]]} />
          <ObsidianMaterial />
        </mesh>
      );
    }

    // 第二关：星球方块材质
    if (stageId === 1) {
      return (
        <mesh {...meshProps}>
          <boxGeometry args={[size[0], size[1], size[2]]} />
          <PlanetBlockMaterial />
        </mesh>
      );
    }

    // 第三关：赛博网格材质
    if (stageId === 2) {
      return (
        <mesh {...meshProps}>
          <boxGeometry args={[size[0], size[1], size[2]]} />
          <CyberGridMaterial />
        </mesh>
      );
    }

    // 默认：简单立方体 + 深灰金属材质
    return (
      <mesh {...meshProps}>
        <boxGeometry args={[size[0], size[1], size[2]]} />
        <meshStandardMaterial
          color="#2a2a2a"
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>
    );
  }

  // 其他类型使用标准 BoxGeometry，应用 size 和 envMap
  return (
    <mesh {...meshProps}>
      <boxGeometry args={[size[0], size[1], size[2], segments, segments, segments]} />

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
  rotation,
  initialType = null,
  size = [1.5, 1.5, 1.5],
  resetToken,
  contactBoost,
  isTargetSurface,
  isSafeSurface,
  stageId = 0,
  onTypeChange,
  ...props
}) => {
  const [type, setType] = useState<GunType | null>(initialType);

  useEffect(() => {
    setType(initialType);
  }, [resetToken, initialType]);

  const hit = (gunType: GunType) => {
    setType(gunType);
    if (onTypeChange) {
      onTypeChange(gunType);
    }
  };

  return (
    <group position={position} rotation={rotation ? new THREE.Euler(...rotation) : undefined} userData={{
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
        stageId={stageId}
        {...props}
      />
    </group>
  );
};