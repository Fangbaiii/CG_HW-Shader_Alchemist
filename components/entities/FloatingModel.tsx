import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ModelLoader } from './ModelLoader';
import * as THREE from 'three';

/**
 * FloatingModel - 带悬浮动画的模型加载器
 * 
 * 让模型在垂直方向上下浮动，并可选择性地缓慢旋转
 */

interface FloatingModelProps {
    /** 模型文件路径 */
    path: string;
    /** 基准位置 [x, y, z] */
    position: [number, number, number];
    /** 旋转 [x, y, z] (弧度) */
    rotation?: [number, number, number];
    /** 缩放 */
    scale?: number | [number, number, number];
    /** 是否投射阴影 */
    castShadow?: boolean;
    /** 是否接收阴影 */
    receiveShadow?: boolean;
    /** 浮动幅度（上下移动的距离） */
    floatAmplitude?: number;
    /** 浮动速度（数值越大越快） */
    floatSpeed?: number;
    /** 是否启用Y轴旋转动画 */
    enableRotation?: boolean;
    /** Y轴旋转速度 */
    rotationSpeed?: number;
}

export const FloatingModel: React.FC<FloatingModelProps> = ({
    path,
    position,
    rotation = [0, 0, 0],
    scale = 1,
    castShadow = true,
    receiveShadow = true,
    floatAmplitude = 0.5,
    floatSpeed = 1.0,
    enableRotation = true,
    rotationSpeed = 0.3,
}) => {
    const groupRef = useRef<THREE.Group>(null);

    useFrame((state) => {
        if (!groupRef.current) return;

        const time = state.clock.elapsedTime;

        // 上下浮动动画
        const yOffset = Math.sin(time * floatSpeed) * floatAmplitude;
        groupRef.current.position.y = position[1] + yOffset;

        // 可选的缓慢旋转
        if (enableRotation) {
            groupRef.current.rotation.y = rotation[1] + Math.sin(time * rotationSpeed) * 0.3;
        }
    });

    return (
        <group ref={groupRef} position={[position[0], position[1], position[2]]}>
            <ModelLoader
                path={path}
                position={[0, 0, 0]} // 相对于 group 的位置
                rotation={rotation}
                scale={scale}
                castShadow={castShadow}
                receiveShadow={receiveShadow}
            />
        </group>
    );
};
