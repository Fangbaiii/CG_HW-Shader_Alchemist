import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { GunType } from '../types';

// Define the shader material
const CrosshairShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uType: 0, // 0: Jelly, 1: Ghost, 2: Mirror
    uHover: 0,
    uShoot: 0,
    uColor: new THREE.Color(1, 1, 1),
  },
  // Vertex Shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform int uType;
    uniform float uHover;
    uniform float uShoot;
    uniform vec3 uColor;
    varying vec2 vUv;

    #define PI 3.14159265359

    mat2 rotate2d(float _angle){
        return mat2(cos(_angle),-sin(_angle),
                    sin(_angle),cos(_angle));
    }

    float sdBox( in vec2 p, in vec2 b ) {
        vec2 d = abs(p)-b;
        return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
    }

    float rand(vec2 co){
        return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main() {
        vec2 uv = vUv * 2.0 - 1.0;
        vec3 color = uColor;
        float alpha = 0.0;

        // JELLY (Type 0)
        if (uType == 0) {
            // Breathing
            float breath = sin(uTime * 3.0) * 0.05;
            float shootAnim = sin(uShoot * PI) * 0.4; // Squish
            
            vec2 p = uv;
            // Squish effect: flatten Y, expand X
            p.x *= 1.0 - shootAnim * 0.5;
            p.y *= 1.0 + shootAnim * 0.5;

            float d = length(p) - (0.15 + breath);
            
            // Soft edge
            float circle = 1.0 - smoothstep(0.0, 0.02, abs(d));
            
            // Inner glow
            float glow = 1.0 - smoothstep(0.0, 0.3, length(p));
            
            alpha = circle + glow * 0.3;
            color = vec3(0.2, 1.0, 0.5); // Jelly Green
            
            if (uHover > 0.5) {
                color = vec3(0.4, 1.0, 0.6);
                // Hover glow should be circular, not square
                float hoverCircle = 1.0 - smoothstep(0.0, 0.4, length(p));
                alpha += hoverCircle * 0.3;
            }
            
            // Force circular clip to avoid square artifacts
            alpha *= 1.0 - smoothstep(0.45, 0.5, length(uv * 2.0 - 1.0));
        }
        // GHOST (Type 1)
        else if (uType == 1) {
            vec2 p = uv;
            
            // Glitch
            if (rand(vec2(floor(uTime * 15.0), 0.0)) > 0.95) {
                p.x += (rand(vec2(uTime, 0.0)) - 0.5) * 0.2;
            }
            
            // Shoot flash
            if (uShoot > 0.5) {
                color = vec3(1.0, 0.2, 0.2);
                // Disappear briefly
                if (uShoot > 0.8) alpha = 0.0;
            } else {
                color = vec3(0.0, 1.0, 1.0); // Cyan
            }

            // Brackets [ ]
            // Left Bracket
            float l = 0.0;
            vec2 pl = p + vec2(0.2, 0.0);
            float dl = sdBox(pl, vec2(0.05, 0.2));
            // Cut inside
            if (abs(dl) < 0.01 && p.x < -0.15) l = 1.0;
            
            // Simple Crosshair +
            float h = step(abs(p.y), 0.015) * step(0.05, abs(p.x)) * step(abs(p.x), 0.25);
            float v = step(abs(p.x), 0.015) * step(0.05, abs(p.y)) * step(abs(p.y), 0.25);
            
            alpha = max(alpha, h + v);
            
            if (uHover > 0.5) {
                // Add center dot
                if (length(p) < 0.03) alpha = 1.0;
                color += vec3(0.2);
            }
        }
        // MIRROR (Type 2)
        else if (uType == 2) {
            vec2 p = uv;
            
            // Rotation
            float rot = uTime * 0.8; // Slow rotation
            if (uShoot > 0.0) rot += uShoot * 6.28; // Spin on shoot
            
            p = rotate2d(rot) * p;
            
            // Diamond (Rotated Box)
            float d = sdBox(p, vec2(0.12, 0.12));
            
            // Outline
            float diamond = 1.0 - smoothstep(0.0, 0.015, abs(d));
            
            alpha = diamond;
            color = vec3(0.9, 0.9, 1.0); // Silver
            
            if (uHover > 0.5) {
                // Fill slightly
                if (d < 0.0) alpha += 0.3;
                color = vec3(1.0, 1.0, 1.0);
            }
        }

        // Global Hover Dimming
        if (uHover < 0.5) {
            alpha *= 0.5; 
        } else {
            alpha = min(alpha * 1.5, 1.0);
        }

        gl_FragColor = vec4(color, alpha);
    }
  `
);

extend({ CrosshairShaderMaterial });

interface CrosshairProps {
  currentGun: GunType;
  isShooting: boolean;
  isHovering: boolean;
}

export const Crosshair: React.FC<CrosshairProps> = ({ currentGun, isShooting, isHovering }) => {
  const materialRef = useRef<any>(null);
  const shootAnim = useRef(0);

  const typeInt = useMemo(() => {
    switch (currentGun) {
      case GunType.JELLY: return 0;
      case GunType.GHOST: return 1;
      case GunType.MIRROR: return 2;
      default: return 0;
    }
  }, [currentGun]);

  useEffect(() => {
    if (isShooting) {
        shootAnim.current = 1.0;
    }
  }, [isShooting]);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uTime = state.clock.elapsedTime;
      materialRef.current.uType = typeInt;
      materialRef.current.uHover = THREE.MathUtils.lerp(materialRef.current.uHover, isHovering ? 1.0 : 0.0, delta * 10);
      
      // Decay shoot animation
      shootAnim.current = THREE.MathUtils.lerp(shootAnim.current, 0, delta * 5);
      materialRef.current.uShoot = shootAnim.current;
    }
  });

  return (
    <mesh position={[0, 0, -1]}>
      <planeGeometry args={[0.2, 0.2]} />
      {/* @ts-ignore */}
      <crosshairShaderMaterial ref={materialRef} transparent depthTest={false} depthWrite={false} />
    </mesh>
  );
};
