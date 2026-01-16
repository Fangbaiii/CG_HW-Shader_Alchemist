import React, { useRef, useState } from 'react';
import { Text, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GunType } from '@/types';

interface SignboardProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  title: string;
  content: string[];
}

export const Signboard: React.FC<SignboardProps> = ({
  position,
  rotation = [0, 0, 0],
  scale = 1,
  title,
  content
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [isDestroyed, setIsDestroyed] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const opacityRef = useRef(0.9);

  // 淡出动画
  useFrame((state, delta) => {
    if (!isDestroyed || !groupRef.current) return;

    // 淡出
    opacityRef.current = Math.max(0, opacityRef.current - delta * 1.5);

    // 更新所有材质的透明度
    groupRef.current.traverse((child) => {
      if ((child as THREE.Mesh).material) {
        const material = (child as THREE.Mesh).material as THREE.Material;
        if ('opacity' in material) {
          (material as any).opacity = opacityRef.current;
        }
      }
    });

    // 完全消失后隐藏
    if (opacityRef.current <= 0) {
      setIsVisible(false);
    }
  });

  // 子弹击中处理
  const handleHit = (gunType: GunType) => {
    if (gunType === GunType.JELLY && !isDestroyed) {
      setIsDestroyed(true);
    }
  };

  if (!isVisible) return null;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      scale={scale}
      userData={{
        isInteractive: true,
        hitHandler: handleHit,
        isSignboard: true
      }}
    >
      {/* 背景板 */}
      <RoundedBox args={[3, 2, 0.1]} radius={0.1} smoothness={4}>
        <meshStandardMaterial
          color="#2a0808"
          emissive="#4a1008"
          emissiveIntensity={0.15}
          transparent
          opacity={0.9}
          roughness={0.2}
          metalness={0.8}
        />
      </RoundedBox>

      {/* 边框 */}
      <RoundedBox args={[3.06, 2.06, 0.08]} radius={0.12} smoothness={4} position={[0, 0, -0.02]}>
        <meshStandardMaterial
          color="#ff4400"
          emissive="#ff4400"
          emissiveIntensity={0.8}
          transparent
          opacity={0.9}
          roughness={0.3}
          metalness={0.6}
        />
      </RoundedBox>

      {/* 发光 */}
      <pointLight
        position={[0, 0, 0.2]}
        color="#ff4400"
        intensity={0.5}
        distance={3}
        decay={2}
      />

      {/* 标题 */}
      <Text
        position={[0, 0.6, 0.06]}
        fontSize={0.25}
        color="#ff8844"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#2a0000"
      >
        <meshBasicMaterial attach="material" transparent opacity={0.9} />
        {title}
      </Text>

      {/* 内容 */}
      <Text
        position={[0, -0.15, 0.06]}
        fontSize={0.14}
        color="#ffccaa"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.6}
        lineHeight={1.6}
        textAlign="left"
        outlineWidth={0.005}
        outlineColor="#3a1008"
      >
        <meshBasicMaterial attach="material" transparent opacity={0.9} />
        {content.join('\n')}
      </Text>
    </group>
  );
};
