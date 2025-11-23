import React, { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, Hud, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GunModel } from './GunModel';
import { GunType } from '../types';
import { Crosshair } from './Crosshair';

const SPEED = 3.5;
const JUMP_FORCE = 9.0;
const GRAVITY = 18.0;
const PLAYER_RADIUS = 0.3;
const OBJECT_SIZE = 1.5; 

interface PlayerProps {
  currentGun: GunType;
  onShoot: (origin: THREE.Vector3, direction: THREE.Vector3) => void;
}

export const Player: React.FC<PlayerProps> = ({ currentGun, onShoot }) => {
  const { camera, scene } = useThree();
  const [isLocked, setIsLocked] = useState(false);
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const moveLeft = useRef(false);
  const moveRight = useRef(false);
  const canJump = useRef(false);
  
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const [isShooting, setIsShooting] = useState(false);
  const [isHovering, setIsHovering] = useState(false); // New state for hovering

  // Raycaster for shooting
  const raycaster = useRef(new THREE.Raycaster());
  
  // Physics / Jelly Logic Refs
  const downRaycaster = useRef(new THREE.Raycaster());
  const isOnJelly = useRef(false);
  const jellyNormal = useRef(new THREE.Vector3(0, 1, 0));

  // Frame counter ref
  const frameCounter = useRef(0);

  useEffect(() => {
    const onKeyDown = (event: any) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward.current = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft.current = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward.current = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight.current = true;
          break;
        case 'Space':
          if (canJump.current) {
            if (isOnJelly.current) {
                // Super Jump on Jelly
                velocity.current.y = JUMP_FORCE * 2.5;
            } else {
                velocity.current.y = JUMP_FORCE;
            }
            canJump.current = false;
          }
          break;
      }
    };

    const onKeyUp = (event: any) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward.current = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          moveLeft.current = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward.current = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          moveRight.current = false;
          break;
      }
    };

    const onMouseDown = (event: any) => {
        if (!isLocked) return;
        setIsShooting(true);
        handleShoot();
        setTimeout(() => setIsShooting(false), 150);
    };

    const doc = (window as any).document;
    if (doc) {
      doc.addEventListener('keydown', onKeyDown);
      doc.addEventListener('keyup', onKeyUp);
      doc.addEventListener('mousedown', onMouseDown);
    }

    return () => {
      if (doc) {
        doc.removeEventListener('keydown', onKeyDown);
        doc.removeEventListener('keyup', onKeyUp);
        doc.removeEventListener('mousedown', onMouseDown);
      }
    };
  }, [isLocked, currentGun]); 

  const handleShoot = () => {
      // Calculate origin and direction
      // Origin: slightly in front of the camera to avoid clipping with player collider if any
      const origin = camera.position.clone();
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
      
      // Adjust origin to be slightly lower and to the right to match gun position visually (optional, but looks better)
      // For now, center screen is fine for aiming accuracy.
      
      onShoot(origin, direction);

      // All guns now use projectiles, so we remove the legacy hitscan logic entirely
      /* 
      if (currentGun !== GunType.JELLY && currentGun !== GunType.GHOST) {
        // ... legacy hitscan code ...
      }
      */
  };

  const checkCollision = (newPos: THREE.Vector3) => {
      const colliders: THREE.Object3D[] = [];
      scene.traverse((child) => {
          if (child.userData.isInteractive) {
              colliders.push(child);
          }
      });

      for (const obj of colliders) {
          // Ghost objects allow pass-through
          if (obj.userData.type === GunType.GHOST) continue;

          const objPos = new THREE.Vector3();
          obj.getWorldPosition(objPos);

          const halfSize = OBJECT_SIZE / 2;
          const objMinX = objPos.x - halfSize;
          const objMaxX = objPos.x + halfSize;
          const objMinZ = objPos.z - halfSize;
          const objMaxZ = objPos.z + halfSize;
          const objMinY = objPos.y - halfSize;
          const objMaxY = objPos.y + halfSize;

          const pMinX = newPos.x - PLAYER_RADIUS;
          const pMaxX = newPos.x + PLAYER_RADIUS;
          const pMinZ = newPos.z - PLAYER_RADIUS;
          const pMaxZ = newPos.z + PLAYER_RADIUS;
          
          const pFeet = newPos.y - 1.7; 
          const pHead = newPos.y + 0.1; 

          const overlapX = pMinX <= objMaxX && pMaxX >= objMinX;
          const overlapZ = pMinZ <= objMaxZ && pMaxZ >= objMinZ;
          const overlapY = pFeet <= objMaxY && pHead >= objMinY;

          if (overlapX && overlapZ && overlapY) {
              return true;
          }
      }
      return false;
  };

  useFrame((state, delta) => {
    if (!isLocked) return;

    // --- PHYSICS / MOVEMENT ---
    
    // 1. Jelly Detection (Raycasting)
    downRaycaster.current.set(camera.position, new THREE.Vector3(0, -1, 0));
    downRaycaster.current.far = 2.0; // Eye height (1.7) + tolerance
    
    const intersects = downRaycaster.current.intersectObjects(scene.children, true);
    isOnJelly.current = false;
    jellyNormal.current.set(0, 1, 0);

    for (const hit of intersects) {
        if (hit.object.userData.isInteractive) {
            if (hit.object.userData.type === GunType.JELLY) {
                isOnJelly.current = true;
                if (hit.face) {
                    jellyNormal.current.copy(hit.face.normal!);
                    // Transform normal to world space to handle rotation
                    // We use transformDirection which applies rotation of the object
                    jellyNormal.current.transformDirection(hit.object.matrixWorld);
                }
            }
            break; // Found the ground
        }
    }

    // 2. Aim Detection (Crosshair)
    // Optimization: Run raycast only every 4 frames to save performance
    frameCounter.current += 1;
    if (frameCounter.current % 4 === 0) {
        // We reuse the main raycaster for this, but we need to set it from camera
        raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
        // Limit distance for interaction feedback if desired, or infinite
        raycaster.current.far = 100; 
        const aimIntersects = raycaster.current.intersectObjects(scene.children, true);
        let foundInteractive = false;
        for (const hit of aimIntersects) {
            if (hit.object.userData.isInteractive) {
                foundInteractive = true;
                break;
            }
        }
        if (foundInteractive !== isHovering) {
            setIsHovering(foundInteractive);
        }
    }

    velocity.current.y -= GRAVITY * delta;
    camera.position.y += velocity.current.y * delta;
    
    if (camera.position.y < 1.7) {
        camera.position.y = 1.7;
        velocity.current.y = 0;
        canJump.current = true;
    } else {
       if (checkCollision(camera.position)) {
           if (velocity.current.y > 0) {
               // Hit head
               camera.position.y -= velocity.current.y * delta; // Undo move
               velocity.current.y = 0;
           } 
           else if (velocity.current.y < 0) {
                // Landing
                const oldVelocityY = velocity.current.y;
                camera.position.y -= oldVelocityY * delta; // Undo move
                
                if (isOnJelly.current && oldVelocityY < -2.0) {
                    // Trampoline Effect
                    // Bounce direction: Normal * Speed * Damping
                    const speed = -oldVelocityY * 0.9;
                    velocity.current.copy(jellyNormal.current).multiplyScalar(speed);
                } else {
                    velocity.current.y = 0;
                    canJump.current = true;
                }
           }
       }
    }

    // Damping
    velocity.current.x -= velocity.current.x * 10.0 * delta;
    velocity.current.z -= velocity.current.z * 10.0 * delta;

    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize();

    if (moveForward.current || moveBackward.current) velocity.current.z += direction.current.z * 40.0 * delta * SPEED;
    if (moveLeft.current || moveRight.current) velocity.current.x -= direction.current.x * 40.0 * delta * SPEED;

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

    const moveX = right.clone().multiplyScalar(-velocity.current.x * delta);
    camera.position.add(moveX);
    if (checkCollision(camera.position)) {
        camera.position.sub(moveX); 
        velocity.current.x = 0;
    }

    const moveZ = forward.clone().multiplyScalar(velocity.current.z * delta);
    camera.position.add(moveZ);
    if (checkCollision(camera.position)) {
        camera.position.sub(moveZ); 
        velocity.current.z = 0;
    }

    // Increment frame counter
    frameCounter.current++;
  }); 

  return (
    <>
      <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />
      
      {/* 
          HUD RENDERER 
          Using Drei's Hud component renders the gun in a separate pass on top of the scene.
          This solves both the "clipping through walls" issue and the "black screen" issue
          caused by manual gl.render calls.
      */}
      <Hud renderPriority={1}>
          {/* The gun has its own fixed camera, so it stays locked to the screen */}
          <PerspectiveCamera makeDefault position={[0, 0, 0]} fov={75} />
          
          {/* Lighting for the gun model */}
          <ambientLight intensity={0.8} />
          <pointLight position={[2, 2, 5]} intensity={1.5} />
          <Environment preset="city" />
          
          {/* The Gun */}
          <GunModel currentGun={currentGun} isShooting={isShooting} />
          
          {/* The Crosshair */}
          <Crosshair currentGun={currentGun} isShooting={isShooting} isHovering={isHovering} />
      </Hud>
    </>
  );
};