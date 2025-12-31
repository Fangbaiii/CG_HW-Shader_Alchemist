/**
 * Type definitions for custom shader materials in Shader Alchemist
 * 
 * This file provides proper TypeScript types for all custom shader materials
 * created with @react-three/drei's shaderMaterial() function.
 */

import * as THREE from 'three';

// ============================================================================
// Base Uniform Types
// ============================================================================

/** Common uniform interface for all animated materials */
export interface AnimatedMaterialUniforms {
    uTime: number;
}

/** Jelly material uniforms */
export interface JellyMaterialUniforms extends AnimatedMaterialUniforms {
    uColor: THREE.Color;
}

/** Lava material uniforms */
export interface LavaMaterialUniforms extends AnimatedMaterialUniforms {
    uColor1: THREE.Color;
    uColor2: THREE.Color;
}

/** Planet block material uniforms */
export interface PlanetBlockMaterialUniforms extends AnimatedMaterialUniforms {
    uBaseColor: THREE.Color;
    uCrackColor: THREE.Color;
}

/** Cyber grid material uniforms */
export interface CyberGridMaterialUniforms extends AnimatedMaterialUniforms {
    uColor: THREE.Color;
    uBaseColor: THREE.Color;
}

// ============================================================================
// Shader Material Types
// ============================================================================

/** Base type for all custom shader materials */
export type CustomShaderMaterial<T extends AnimatedMaterialUniforms = AnimatedMaterialUniforms> =
    THREE.ShaderMaterial & T;

/** Jelly shader material type */
export type JellyShaderMaterialType = CustomShaderMaterial<JellyMaterialUniforms>;

/** Lava shader material type */
export type LavaShaderMaterialType = CustomShaderMaterial<LavaMaterialUniforms>;

/** Simple animated material (only uTime uniform) */
export type SimpleAnimatedMaterialType = CustomShaderMaterial<AnimatedMaterialUniforms>;

/** Planet block material type */
export type PlanetBlockMaterialType = CustomShaderMaterial<PlanetBlockMaterialUniforms>;

/** Cyber grid material type */
export type CyberGridMaterialType = CustomShaderMaterial<CyberGridMaterialUniforms>;

// ============================================================================
// Base type for shader material elements
// ============================================================================

type ShaderMaterialProps = {
    ref?: React.RefObject<THREE.ShaderMaterial>;
    attach?: string;
    transparent?: boolean;
    side?: THREE.Side;
    depthWrite?: boolean;
    [key: string]: unknown;
};

// ============================================================================
// Module Augmentation for @react-three/fiber
// 
// This augmentation makes TypeScript recognize our custom shader materials
// as valid JSX elements in React Three Fiber.
// ============================================================================

declare module '@react-three/fiber' {
    interface ThreeElements {
        jellyShaderMaterialImpl: ShaderMaterialProps & {
            uTime?: number;
            uColor?: THREE.Color;
        };
        lavaShaderMaterialImpl: ShaderMaterialProps & {
            uTime?: number;
            uColor1?: THREE.Color;
            uColor2?: THREE.Color;
        };
        volcanoSkyMaterialImpl: ShaderMaterialProps & {
            uTime?: number;
        };
        lavaFallMaterialImpl: ShaderMaterialProps & {
            uTime?: number;
        };
        volcanoRockMaterialImpl: ShaderMaterialProps & {
            uTime?: number;
        };
        lavaStreamMaterialImpl: ShaderMaterialProps & {
            uTime?: number;
        };
        obsidianMaterialImpl: ShaderMaterialProps & {
            uTime?: number;
        };
        planetBlockShaderMaterialImpl: ShaderMaterialProps & {
            uTime?: number;
            uBaseColor?: THREE.Color;
            uCrackColor?: THREE.Color;
        };
        cyberGridShaderMaterialImpl: ShaderMaterialProps & {
            uTime?: number;
            uColor?: THREE.Color;
            uBaseColor?: THREE.Color;
        };
    }
}
