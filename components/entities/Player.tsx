import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { GunModel } from './GunModel';
import { GunType, GUN_CONFIGS, GunConfig } from '@/types';
import { Crosshair } from '@/components/ui/Crosshair';
import { MaterialAnimationProvider, useAnimatedMaterial } from '@/components/materials';

const SPEED = 3.5;
const JUMP_FORCE = 9.0;
const GRAVITY = 18.0;
const PLAYER_RADIUS = 0.3;
const PLAYER_EYE_HEIGHT = 1.7;
const DEATH_HEIGHT = -2.5;

interface PlayerProps {
  currentGun: GunType;
  onShoot: (origin: THREE.Vector3, direction: THREE.Vector3) => void;
  onDeath?: (reason: 'lava' | 'void') => void;
  onStageComplete?: () => void;
  spawnPoint: THREE.Vector3;
  goalZ: number;
  stageId: number;
  isFrozen?: boolean;
}

export const Player: React.FC<PlayerProps> = ({ currentGun, onShoot, onDeath, onStageComplete, spawnPoint, goalZ, stageId, isFrozen = false }) => {
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
  const [isHovering, setIsHovering] = useState(false);

  // Raycaster for shooting
  const raycaster = useRef(new THREE.Raycaster());

  // Physics / Jelly Logic Refs
  const downRaycaster = useRef(new THREE.Raycaster());
  const isOnJelly = useRef(false);
  const isOnMirror = useRef(false);
  const jellyNormal = useRef(new THREE.Vector3(0, 1, 0));
  const mirrorBoost = useRef(new THREE.Vector3());
  const surfaceType = useRef<GunType | null>(null);
  const deathCooldown = useRef(0);
  const stageCompleteRef = useRef(false);
  const isDying = useRef(false);

  // Optimization: Cache colliders to avoid traversing scene every frame
  const collidersRef = useRef<THREE.Object3D[]>([]);

  // ============================================================================
  // VECTOR CACHING OPTIMIZATION
  // Pre-allocated vectors to avoid per-frame object creation and GC pressure.
  // These are reused across frames instead of creating new ones.
  // ============================================================================

  // Constant vectors (never modified)
  const DOWN_VECTOR = useRef(new THREE.Vector3(0, -1, 0)).current;
  const ZERO_VEC2 = useRef(new THREE.Vector2(0, 0)).current;

  // Temporary vectors for per-frame calculations (avoid .clone())
  const tempVec3 = useRef(new THREE.Vector3()).current;
  const tempVec3_2 = useRef(new THREE.Vector3()).current;
  const tempVec3_3 = useRef(new THREE.Vector3()).current;
  const forwardVec = useRef(new THREE.Vector3()).current;
  const rightVec = useRef(new THREE.Vector3()).current;
  const moveVec = useRef(new THREE.Vector3()).current;
  const collisionCheckVec = useRef(new THREE.Vector3()).current;

  // Update colliders list periodically or on stage change
  useEffect(() => {
    const updateColliders = () => {
      const gathered: THREE.Object3D[] = [];
      scene.traverse((child) => {
        if (child.userData.isInteractive || child.userData.isSafeSurface || child.userData.isLava) {
          gathered.push(child);
        }
      });
      collidersRef.current = gathered;
    };

    // Run immediately and on stage change
    updateColliders();

    // Run periodically to catch any late-mounted objects (e.g. async loading)
    const interval = setInterval(updateColliders, 2000);

    return () => clearInterval(interval);
  }, [scene, stageId]);

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
              velocity.current.y = JUMP_FORCE * 1.5;
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

  useEffect(() => {
    camera.position.copy(spawnPoint);
    velocity.current.set(0, 0, 0);
    canJump.current = true;
    stageCompleteRef.current = false;
  }, [camera, spawnPoint, stageId]);

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
    // Use cached colliders instead of traversing scene
    for (const obj of collidersRef.current) {
      // FIX: Skip detached objects (stale references)
      if (!obj.parent) continue;

      // Ghost objects allow pass-through
      if (obj.userData.type === GunType.GHOST) continue;

      // Use cached vector instead of new THREE.Vector3()
      obj.getWorldPosition(collisionCheckVec);

      const size = (obj.userData.size as [number, number, number]) ?? [1.5, 1.5, 1.5];
      const halfSizeX = size[0] / 2;
      const halfSizeY = size[1] / 2;
      const halfSizeZ = size[2] / 2;
      const objMinX = collisionCheckVec.x - halfSizeX;
      const objMaxX = collisionCheckVec.x + halfSizeX;
      const objMinZ = collisionCheckVec.z - halfSizeZ;
      const objMaxZ = collisionCheckVec.z + halfSizeZ;
      const objMinY = collisionCheckVec.y - halfSizeY;
      const objMaxY = collisionCheckVec.y + halfSizeY;

      const pMinX = newPos.x - PLAYER_RADIUS;
      const pMaxX = newPos.x + PLAYER_RADIUS;
      const pMinZ = newPos.z - PLAYER_RADIUS;
      const pMaxZ = newPos.z + PLAYER_RADIUS;

      const pFeet = newPos.y - PLAYER_EYE_HEIGHT;
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

  const respawn = useCallback(() => {
    camera.position.copy(spawnPoint);
    // Reset rotation completely to look forward (negative Z) and level horizon
    camera.rotation.set(0, 0, 0);
    velocity.current.set(0, 0, 0);
    canJump.current = true;
    isDying.current = false;
    deathCooldown.current = 1.0;
  }, [camera, spawnPoint]);

  const triggerDeath = useCallback((reason: 'lava' | 'void') => {
    if (isDying.current || deathCooldown.current > 0) return;

    isDying.current = true;

    // Stop horizontal movement immediately
    velocity.current.x = 0;
    velocity.current.z = 0;

    onDeath?.(reason);

    if (reason === 'lava') {
      velocity.current.y = 6.0;
    }

    setTimeout(respawn, 1200);
  }, [onDeath, respawn]);

  useFrame((state, delta) => {
    if (!isLocked || isFrozen) return;

    if (isDying.current) {
      velocity.current.y -= GRAVITY * delta;
      // Use cached tempVec3 instead of clone()
      tempVec3.copy(velocity.current).multiplyScalar(delta);
      camera.position.add(tempVec3);
      camera.rotation.z += delta * 2.0;
      return;
    }

    // Clamp delta to prevent tunneling during lag spikes
    const dt = Math.min(delta, 0.1);

    // --- PHYSICS / MOVEMENT ---

    // 1. Jelly Detection (Raycasting) - Use cached DOWN_VECTOR
    downRaycaster.current.set(camera.position, DOWN_VECTOR);
    downRaycaster.current.far = PLAYER_EYE_HEIGHT + 6; // allow lava plane detection well below feet

    // Use cached colliders for raycasting too
    // FIX: Enable recursive raycasting to hit children meshes even if collidersRef contains Groups
    const intersects = downRaycaster.current.intersectObjects(collidersRef.current, true);
    isOnJelly.current = false;
    isOnMirror.current = false;
    surfaceType.current = null;
    jellyNormal.current.set(0, 1, 0);
    mirrorBoost.current.set(0, 0, 0);

    let groundFound = false;
    let groundSafe = false;
    const feetY = camera.position.y - PLAYER_EYE_HEIGHT;

    for (const hit of intersects) {
      // Traverse up to find interactive data
      let target = hit.object;
      let data = target.userData ?? {};

      // If current object isn't interactive, check parents
      while (target && !data.isInteractive && !data.isSafeSurface && !data.isLava && target.parent) {
        target = target.parent;
        data = target.userData ?? {};
      }

      if (data.isLava) {
        if (feetY <= hit.point.y + 0.2) {
          triggerDeath('lava');
          break;
        }
        continue;
      }

      if (data.isSafeSurface && !data.isInteractive) {
        groundFound = true;
        groundSafe = true;
        break;
      }

      if (data.isInteractive) {
        groundFound = true;
        surfaceType.current = data.type ?? null;

        if (surfaceType.current === GunType.JELLY) {
          isOnJelly.current = true;
          if (hit.face) {
            jellyNormal.current.copy(hit.face.normal!);
            jellyNormal.current.transformDirection(hit.object.matrixWorld);
          }
        }
        if (surfaceType.current === GunType.MIRROR) {
          isOnMirror.current = true;
          if (data.contactBoost) {
            const boost = data.contactBoost as [number, number, number];
            mirrorBoost.current.set(boost[0], boost[1], boost[2]);
          }
        }

        if (data.isSafeSurface || data.isTargetSurface) {
          groundSafe = true;
        }
        break;
      }
    }

    // if (groundFound && !groundSafe && velocity.current.y <= 0) {
    //   triggerDeath('void');
    // }

    // 2. Aim Detection (Crosshair)
    // Optimization: Run raycast only every 4 frames to save performance
    frameCounter.current += 1;
    if (frameCounter.current % 4 === 0) {
      // We reuse the main raycaster for this, but we need to set it from camera
      // Use cached ZERO_VEC2 instead of new THREE.Vector2(0, 0)
      raycaster.current.setFromCamera(ZERO_VEC2, camera);
      // Limit distance for interaction feedback if desired, or infinite
      raycaster.current.far = 100;
      // Use cached colliders for aim detection too
      // FIX: Enable recursive raycasting to hit children meshes even if collidersRef contains Groups
      const aimIntersects = raycaster.current.intersectObjects(collidersRef.current, true);
      let foundInteractive = false;
      for (const hit of aimIntersects) {
        let target = hit.object;
        let data = target.userData ?? {};
        while (target && !data.isInteractive && target.parent) {
          target = target.parent;
          data = target.userData ?? {};
        }

        if (data.isInteractive) {
          foundInteractive = true;
          break;
        }
      }
      if (foundInteractive !== isHovering) {
        setIsHovering(foundInteractive);
      }
    }

    velocity.current.y -= GRAVITY * dt;
    camera.position.y += velocity.current.y * dt;

    if (checkCollision(camera.position)) {
      if (velocity.current.y > 0) {
        // Hit head
        camera.position.y -= velocity.current.y * dt;
        velocity.current.y = 0;
      } else {
        // Landing
        const oldVelocityY = velocity.current.y;
        camera.position.y -= oldVelocityY * dt; // Undo move

        if (isOnJelly.current && oldVelocityY < -2.0) {
          // Trampoline Effect
          // Bounce direction: Normal * Speed * Damping
          const speed = -oldVelocityY * 0.9;
          velocity.current.copy(jellyNormal.current).multiplyScalar(speed);
          canJump.current = true;
        } else {
          velocity.current.y = 0;
          canJump.current = true;
        }
      }
    }

    // Damping
    velocity.current.x -= velocity.current.x * 10.0 * dt;
    velocity.current.z -= velocity.current.z * 10.0 * dt;

    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.x = Number(moveRight.current) - Number(moveLeft.current);
    direction.current.normalize();

    if (moveForward.current || moveBackward.current) velocity.current.z += direction.current.z * 40.0 * dt * SPEED;
    if (moveLeft.current || moveRight.current) velocity.current.x -= direction.current.x * 40.0 * dt * SPEED;

    // Use cached forwardVec and rightVec instead of creating new vectors
    forwardVec.set(0, 0, -1).applyQuaternion(camera.quaternion);
    forwardVec.y = 0;
    forwardVec.normalize();

    rightVec.set(1, 0, 0).applyQuaternion(camera.quaternion);
    rightVec.y = 0;
    rightVec.normalize();

    // Use cached moveVec instead of clone()
    moveVec.copy(rightVec).multiplyScalar(-velocity.current.x * dt);
    camera.position.add(moveVec);
    if (checkCollision(camera.position)) {
      camera.position.sub(moveVec);
      velocity.current.x = 0;
    }

    // Reuse moveVec for Z movement
    moveVec.copy(forwardVec).multiplyScalar(velocity.current.z * dt);
    camera.position.add(moveVec);
    if (checkCollision(camera.position)) {
      camera.position.sub(moveVec);
      velocity.current.z = 0;
    }

    if (camera.position.y < DEATH_HEIGHT) {
      triggerDeath(camera.position.z < -5 ? 'lava' : 'void');
    }

    if (!stageCompleteRef.current && camera.position.z < goalZ) {
      stageCompleteRef.current = true;
      onStageComplete?.();
    }

    if (deathCooldown.current > 0) {
      deathCooldown.current = Math.max(0, deathCooldown.current - delta);
    }
  });

  // Gun model reference for camera-relative positioning
  const gunGroupRef = useRef<THREE.Group>(null);

  // Update gun model position to follow camera
  useFrame(() => {
    if (gunGroupRef.current) {
      // Position gun relative to camera
      gunGroupRef.current.position.copy(camera.position);
      gunGroupRef.current.quaternion.copy(camera.quaternion);
    }
  });


  return (
    <>
      <PointerLockControls onLock={() => setIsLocked(true)} onUnlock={() => setIsLocked(false)} />

      {/* 
          GUN MODEL & CROSSHAIR - Camera-Attached Rendering
          Previously rendered in separate HUD layer, which conflicted with EffectComposer.
          Now rendered in main scene with camera-relative positioning via useFrame.
          
          Key changes:
          - gunGroupRef follows camera position and rotation every frame
          - Independent lighting ensures gun is always visible
          - Positioned in world space, not a separate render pass
      */}
      <group ref={gunGroupRef}>
        {/* Dedicated lighting for gun model */}
        <ambientLight intensity={1.5} />
        <pointLight position={[2, 2, 5]} intensity={2.0} />

        {/* The Gun - Positioned relative to camera origin */}
        <GunModel currentGun={currentGun} isShooting={isShooting} />

        {/* The Crosshair */}
        <Crosshair currentGun={currentGun} isShooting={isShooting} isHovering={isHovering} />
      </group>
    </>
  );
};