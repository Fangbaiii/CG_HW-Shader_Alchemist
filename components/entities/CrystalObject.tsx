import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { useGLTF, Clone } from '@react-three/drei';
import * as THREE from 'three';
import { GunType } from '@/types';

/**
 * CrystalObject - 可交互的水晶实体
 * 
 * 支持线框枪转换：实体水晶 → 可穿透的线框水晶
 * 使用 Clone 确保每个实例独立，避免材质污染
 * 
 * 性能优化：
 * - 使用 memo 避免不必要的重渲染
 * - 材质在 useLayoutEffect 中一次性替换
 * - 使用简单的 wireframe 材质而非复杂 shader
 */

interface CrystalObjectProps {
    /** GLB 模型路径 */
    model: string;
    /** 位置 */
    position: [number, number, number];
    /** 旋转 (弧度) */
    rotation?: [number, number, number];
    /** 缩放 */
    scale?: number | [number, number, number];
    /** 是否可被线框枪击中并转换 */
    isInteractive?: boolean;
    /** 是否阻挡玩家移动（未线框化时） */
    isBlocker?: boolean;
    /** 是否为可站立的安全表面 */
    isSafeSurface?: boolean;
    /** 碰撞盒大小（覆盖模型自身包围盒） */
    collisionSize?: [number, number, number];
    /** 重置令牌 - 用于关卡重置时恢复初始状态 */
    resetToken?: number;
    /** 水晶颜色 */
    crystalColor?: string;
    /** 线框颜色 */
    wireframeColor?: string;
}

// 缓存用于线框转换的材质，避免重复创建
const wireframeMaterialCache = new Map<string, THREE.MeshBasicMaterial>();

const getWireframeMaterial = (color: string): THREE.MeshBasicMaterial => {
    if (!wireframeMaterialCache.has(color)) {
        wireframeMaterialCache.set(color, new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            wireframe: true,
            transparent: true,
            opacity: 0.5,
        }));
    }
    return wireframeMaterialCache.get(color)!;
};

export const CrystalObject: React.FC<CrystalObjectProps> = ({
    model,
    position,
    rotation = [0, 0, 0],
    scale = 1,
    isInteractive = true,
    isBlocker = true,
    isSafeSurface = false,
    collisionSize,
    resetToken,
    crystalColor = '#88ddff',
    wireframeColor = '#00ffff',
}) => {
    const [isWireframe, setIsWireframe] = useState(false);
    const { scene } = useGLTF(model);
    const groupRef = useRef<THREE.Group>(null);

    // 存储原始材质引用，用于恢复
    const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());

    // 重置时恢复原始状态
    useEffect(() => {
        setIsWireframe(false);
    }, [resetToken]);

    // 线框枪击中处理
    const handleHit = (gunType: GunType) => {
        if (gunType === GunType.GHOST && !isWireframe) {
            setIsWireframe(true);
        }
    };

    // 计算包围盒用于碰撞检测
    const boundingSize = useMemo(() => {
        if (collisionSize) return collisionSize;

        // 从模型计算包围盒
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // 应用缩放
        const s = typeof scale === 'number' ? scale : Math.max(...scale);
        return [size.x * s, size.y * s, size.z * s] as [number, number, number];
    }, [scene, scale, collisionSize]);

    // 动态替换材质
    useLayoutEffect(() => {
        if (!groupRef.current) return;

        groupRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // 首次遍历时保存原始材质
                if (!originalMaterialsRef.current.has(child)) {
                    originalMaterialsRef.current.set(child, child.material);
                }

                if (isWireframe) {
                    // 切换为线框材质
                    child.material = getWireframeMaterial(wireframeColor);
                } else {
                    // 恢复原始材质
                    const original = originalMaterialsRef.current.get(child);
                    if (original) {
                        child.material = original;
                    }
                }
            }
        });
    }, [isWireframe, wireframeColor]);

    return (
        <group
            ref={groupRef}
            position={position}
            rotation={rotation}
            scale={scale}
            userData={{
                isInteractive,
                hitHandler: handleHit,
                type: isWireframe ? GunType.GHOST : null,
                size: boundingSize,
                // 线框化后不阻挡玩家
                isBlocker: isBlocker && !isWireframe,
                isSafeSurface,
                // 标记为水晶对象
                isCrystal: true,
            }}
        >
            <Clone object={scene} />
        </group>
    );
};

// 预加载水晶模型
export const preloadCrystalModels = () => {
    useGLTF.preload('/models/Crystal_blue.glb');
    useGLTF.preload('/models/Crystal_cluster_blue.glb');
    useGLTF.preload('/models/Crystal_cluster_pink.glb');
    useGLTF.preload('/models/Crystal_cluster_white.glb');
};
