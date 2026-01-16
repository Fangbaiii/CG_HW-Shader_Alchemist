import React, { useLayoutEffect, useRef, memo } from 'react';
import { useGLTF, Clone } from '@react-three/drei';
import * as THREE from 'three';

/**
 * ModelLoader - 通用的 GLB/GLTF 模型加载器
 * 
 * 使用 React.memo 防止父组件状态变化导致的不必要重渲染
 * 使用 drei 的 Clone 组件确保每个实例都是独立的克隆
 */

interface ModelLoaderProps {
    /** 模型文件路径（相对于 public 文件夹） */
    path: string;
    /** 位置 [x, y, z] */
    position?: [number, number, number];
    /** 旋转 [x, y, z] (弧度) */
    rotation?: [number, number, number];
    /** 缩放（数字或 [x, y, z]） */
    scale?: number | [number, number, number];
    /** 是否投射阴影 */
    castShadow?: boolean;
    /** 是否接收阴影 */
    receiveShadow?: boolean;
}

// 内部组件 - 实际渲染逻辑
const ModelLoaderInner: React.FC<ModelLoaderProps> = ({
    path,
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = 1,
    castShadow = true,
    receiveShadow = true,
}) => {
    const { scene } = useGLTF(path);
    const groupRef = useRef<THREE.Group>(null);

    // 标记所有子对象为装饰物，让碰撞检测忽略它们
    useLayoutEffect(() => {
        if (groupRef.current) {
            groupRef.current.traverse((child) => {
                child.userData.isDecoration = true;
                child.userData.ignoreRaycast = true;
            });
        }
    }, []);

    return (
        <group ref={groupRef}>
            <Clone
                object={scene}
                position={position}
                rotation={rotation}
                scale={scale}
                castShadow={castShadow}
                receiveShadow={receiveShadow}
            />
        </group>
    );
};

// 使用 memo 包装，只有当 props 真正变化时才重渲染
// 这可以防止父组件状态变化（如射击、切枪）导致模型重新克隆
export const ModelLoader = memo(ModelLoaderInner, (prevProps, nextProps) => {
    // 返回 true 表示 props 相等，不需要重渲染
    // 返回 false 表示 props 不同，需要重渲染
    return (
        prevProps.path === nextProps.path &&
        prevProps.castShadow === nextProps.castShadow &&
        prevProps.receiveShadow === nextProps.receiveShadow &&
        // 位置、旋转、缩放需要深度比较
        JSON.stringify(prevProps.position) === JSON.stringify(nextProps.position) &&
        JSON.stringify(prevProps.rotation) === JSON.stringify(nextProps.rotation) &&
        JSON.stringify(prevProps.scale) === JSON.stringify(nextProps.scale)
    );
});

// 设置显示名称便于调试
ModelLoader.displayName = 'ModelLoader';

/**
 * 预加载模型（可选，用于优化加载性能）
 */
export function preloadModel(path: string) {
    useGLTF.preload(path);
}
