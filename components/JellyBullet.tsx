import React, { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { GunType } from '../types';

interface JellyBulletProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  onHit: () => void; // Callback to remove bullet from list
}

export const JellyBullet: React.FC<JellyBulletProps> = ({ position, direction, onHit }) => {
  const ref = useRef<THREE.Mesh>(null);
  const [exploded, setExploded] = useState(false);
  const speed = 25; // Fast but visible
  const { scene } = useThree();
  
  // Store initial position to avoid re-calculating on every render if props change (they shouldn't)
  const initialPos = useRef(position.clone());
  
  useFrame((state, delta) => {
    if (!ref.current) return;

    if (exploded) {
        // Explosion animation
        ref.current.scale.multiplyScalar(1 + 15 * delta);
        const material = ref.current.material as THREE.Material;
        if (material.opacity > 0) {
            material.opacity -= delta * 4;
        } else {
            onHit(); // Remove bullet
        }
        return;
    }

    // Movement
    const moveDistance = speed * delta;
    const moveStep = direction.clone().multiplyScalar(moveDistance);
    const nextPos = ref.current.position.clone().add(moveStep);

    // Collision Detection
    // Raycast from current position to next position
    const rayDirection = direction.clone().normalize();
    const raycaster = new THREE.Raycaster(ref.current.position, rayDirection, 0, moveDistance + 0.1);
    
    // Intersect with everything in the scene
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    // Filter intersects
    const hit = intersects.find(i => {
        // Ignore the bullet itself
        if (i.object === ref.current) return false;
        // Ignore the player (usually represented by a camera or a specific object, but here we might hit walls/objects)
        // Assuming player is not in the hittable objects list or we ignore it based on distance/type
        // For now, let's assume we hit anything that is a Mesh
        return i.object.type === 'Mesh';
    });

    if (hit) {
        // Move to hit point
        ref.current.position.copy(hit.point);
        setExploded(true);

        // Trigger interaction
        // Traverse up to find the interactive parent if the hit object itself isn't one
        let target: THREE.Object3D | null = hit.object;
        while (target) {
            if (target.userData && target.userData.isInteractive && target.userData.hitHandler) {
                target.userData.hitHandler(GunType.JELLY);
                break;
            }
            target = target.parent;
        }
    } else {
        // No hit, move forward
        ref.current.position.copy(nextPos);
        
        // Cleanup if too far
        if (ref.current.position.distanceTo(initialPos.current) > 100) {
            onHit();
        }
    }
  });

  return (
    <mesh ref={ref} position={initialPos.current} scale={0.3}>
      <sphereGeometry args={[1, 32, 32]} />
      <MeshDistortMaterial
        color="#39FF14"
        speed={8} // High speed for "alive" feel
        distort={0.8} // High distortion
        radius={1}
        transparent
        opacity={0.9}
        emissive="#39FF14"
        emissiveIntensity={0.5}
        toneMapped={false}
      />
    </mesh>
  );
};
