import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GunType } from '../types';

interface MirrorBulletProps {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  onHit: () => void;
}

export const MirrorBullet: React.FC<MirrorBulletProps> = ({ position, direction, onHit }) => {
  const ref = useRef<THREE.Mesh>(null);
  const speed = 50; // Fast and sharp
  const { scene } = useThree();
  const initialPos = useRef(position.clone());
  const raycaster = useRef(new THREE.Raycaster());

  useFrame((state, delta) => {
    if (!ref.current) return;

    // Movement
    const moveDistance = speed * delta;
    const moveStep = direction.clone().multiplyScalar(moveDistance);
    const nextPos = ref.current.position.clone().add(moveStep);

    // Rotation - Slow, elegant rotation to showcase the environment reflection
    ref.current.rotation.x += delta * 0.5;
    ref.current.rotation.y += delta * 0.8;
    ref.current.rotation.z += delta * 0.2;

    // Collision Detection
    const rayDirection = direction.clone().normalize();
    raycaster.current.set(ref.current.position, rayDirection);
    raycaster.current.far = moveDistance + 0.1;
    
    const intersects = raycaster.current.intersectObjects(scene.children, true);
    
    const hit = intersects.find(i => {
        if (i.object === ref.current) return false;
        // Ignore Lines and other non-mesh objects to prevent lag
        if (i.object.type === 'Line' || i.object.type === 'LineSegments') return false;
        return i.object.type === 'Mesh';
    });

    if (hit) {
        // Trigger interaction immediately without explosion visual
        // Traverse up to find the interactive parent
        let target: THREE.Object3D | null = hit.object;
        let loopCount = 0;
        while (target && loopCount < 20) { // Safety break
            if (target.userData && target.userData.isInteractive && target.userData.hitHandler) {
                target.userData.hitHandler(GunType.MIRROR);
                break;
            }
            target = target.parent;
            loopCount++;
        }
        
        onHit(); // Disappear immediately
    } else {
        ref.current.position.copy(nextPos);
        if (ref.current.position.distanceTo(initialPos.current) > 100) {
            onHit();
        }
    }
  });

  return (
    <mesh ref={ref} position={initialPos.current} scale={0.25}>
      {/* Sharp, faceted crystal shape (Octahedron is perfect for a diamond/crystal shard) */}
      <octahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial
        color="#ffffff" 
        roughness={0.0}
        metalness={1.0}
        envMapIntensity={2.0} // Strong reflections
        clearcoat={1.0}
        clearcoatRoughness={0.0}
        flatShading={true} // Emphasize the facets
      />
    </mesh>
  );
};
