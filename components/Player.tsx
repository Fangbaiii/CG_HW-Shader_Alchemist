import React, { useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, Hud, PerspectiveCamera, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { GunModel } from './GunModel';
import { GunType } from '../types';

const SPEED = 5.0;
const JUMP_FORCE = 6.0;
const GRAVITY = 18.0;
const PLAYER_RADIUS = 0.3;
const OBJECT_SIZE = 1.5; 

interface PlayerProps {
  currentGun: GunType;
  onShoot: () => void;
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

  // Raycaster for shooting
  const raycaster = useRef(new THREE.Raycaster());

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
            velocity.current.y = JUMP_FORCE;
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
      onShoot();
      // Raycast from center of screen (using the main world camera)
      raycaster.current.setFromCamera(new THREE.Vector2(0, 0), camera);
      const intersects = raycaster.current.intersectObjects(scene.children, true);

      for (let i = 0; i < intersects.length; i++) {
          const object = intersects[i].object;
          if (object.userData && object.userData.isInteractive && object.userData.hitHandler) {
              object.userData.hitHandler(currentGun);
              break;
          }
      }
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
    
    velocity.current.y -= GRAVITY * delta;
    camera.position.y += velocity.current.y * delta;
    
    if (camera.position.y < 1.7) {
        camera.position.y = 1.7;
        velocity.current.y = 0;
        canJump.current = true;
    } else {
       if (checkCollision(camera.position)) {
           if (velocity.current.y > 0) {
               velocity.current.y = 0;
               camera.position.y -= velocity.current.y * delta; 
           } 
           else if (velocity.current.y < 0) {
                velocity.current.y = 0;
                canJump.current = true;
                camera.position.y -= velocity.current.y * delta; 
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
      </Hud>
    </>
  );
};