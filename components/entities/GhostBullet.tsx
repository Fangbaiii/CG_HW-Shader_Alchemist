import React, { useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { GhostMaterial } from '@/components/materials';
import { GunType } from '@/types';

interface GhostBulletProps {
    position: THREE.Vector3;
    direction: THREE.Vector3;
    onHit: () => void;
}

const GLITCH_CHARS = ['0', '1', '<', '>', '/', '?', '{', '}', '█', '▓', '▒', '░', 'ERROR', 'NULL', 'NaN', '§', '¶', '∆', '∇', '!=', '&&', '||'];

export const GhostBullet: React.FC<GhostBulletProps> = ({ position, direction, onHit }) => {
    const groupRef = useRef<THREE.Group>(null);
    const [exploded, setExploded] = useState(false);
    const speed = 40; // Fast
    const { scene } = useThree();
    const initialPos = useRef(position.clone());

    const [charIndex, setCharIndex] = useState(Math.floor(Math.random() * GLITCH_CHARS.length));
    const [timer, setTimer] = useState(0);

    useFrame((state, delta) => {
        if (!groupRef.current) return;

        if (exploded) {
            // Glitch explosion: expand and scramble
            groupRef.current.scale.multiplyScalar(1 + 15 * delta);
            groupRef.current.rotation.z += 20 * delta;
            groupRef.current.rotation.y += 20 * delta;

            // Fade out logic (scale down to invert or just check scale)
            if (groupRef.current.scale.x > 8) {
                onHit();
            }
            return;
        }

        // Update glitch text periodically
        const newTimer = timer + delta;
        if (newTimer > 0.08) { // Change every 0.08s
            setCharIndex(Math.floor(Math.random() * GLITCH_CHARS.length));
            setTimer(0);
        } else {
            setTimer(newTimer);
        }

        // Movement
        const moveDistance = speed * delta;
        const moveStep = direction.clone().multiplyScalar(moveDistance);
        const nextPos = groupRef.current.position.clone().add(moveStep);

        // Rotate the whole group wildly
        groupRef.current.rotation.z += 10 * delta;
        groupRef.current.rotation.x += 10 * delta;

        // Collision Detection
        const rayDirection = direction.clone().normalize();
        const raycaster = new THREE.Raycaster(groupRef.current.position, rayDirection, 0, moveDistance + 0.1);
        const intersects = raycaster.intersectObjects(scene.children, true);

        // Filter intersects - CRITICAL: Exclude gun model, crosshair, and UI elements
        const hit = intersects.find(i => {
            // Ignore bullet itself (Text generates meshes)
            let isSelf = false;
            i.object.traverseAncestors(a => { if (a === groupRef.current) isSelf = true; });
            if (isSelf) return false;

            // Ignore gun model and crosshair - only accept objects with game-relevant userData
            let target: THREE.Object3D | null = i.object;
            while (target) {
                const userData = target.userData;
                // Accept if it's interactive, a platform, lava, or has safe surface
                if (userData && (
                    userData.isInteractive ||
                    userData.isSafeSurface ||
                    userData.isLava ||
                    userData.isTargetSurface
                )) {
                    return true;
                }
                target = target.parent;
            }
            return false;
        });

        if (hit) {
            groupRef.current.position.copy(hit.point);
            setExploded(true);

            // Traverse up to find the interactive parent
            let target: THREE.Object3D | null = hit.object;
            while (target) {
                if (target.userData && target.userData.isInteractive && target.userData.hitHandler) {
                    target.userData.hitHandler(GunType.GHOST);
                    break;
                }
                target = target.parent;
            }
        } else {
            groupRef.current.position.copy(nextPos);
            if (groupRef.current.position.distanceTo(initialPos.current) > 100) {
                onHit();
            }
        }
    });

    const text = GLITCH_CHARS[charIndex];

    return (
        <group ref={groupRef} position={initialPos.current}>
            {/* Main Glitch Text */}
            <Text
                color="#00FFFF"
                fontSize={0.4}
                anchorX="center"
                anchorY="middle"
            >
                {text}
            </Text>

            {/* Random geometric noise */}
            <mesh position={[0, 0, 0]} rotation={[Math.random(), Math.random(), 0]}>
                <icosahedronGeometry args={[0.3, 0]} />
                <meshBasicMaterial color="#00FFFF" wireframe transparent opacity={0.3} />
            </mesh>
        </group>
    );
};
