import React from 'react';
import * as THREE from 'three';

/**
 * 水晶默认材质 - 半透明发光晶体效果
 * 使用 meshPhysicalMaterial 实现折射和透射
 */
export const CrystalMaterial: React.FC<{ color?: string }> = ({ color = '#88ddff' }) => (
    <meshPhysicalMaterial
        color={color}
        transparent
        opacity={0.75}
        roughness={0.08}
        metalness={0.2}
        transmission={0.5}
        thickness={1.0}
        emissive={color}
        emissiveIntensity={0.15}
        side={THREE.DoubleSide}
    />
);

/**
 * 水晶线框材质 - 被线框枪击中后的状态
 * 使用简单的 wireframe 模式保证性能
 */
export const CrystalWireframeMaterial: React.FC<{ color?: string }> = ({ color = '#00ffff' }) => (
    <meshBasicMaterial
        color={color}
        wireframe
        transparent
        opacity={0.5}
    />
);
