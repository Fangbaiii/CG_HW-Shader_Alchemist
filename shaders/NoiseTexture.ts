/**
 * Noise Texture Precomputation Utility
 * 
 * This module provides pre-generated noise textures that can be sampled
 * in shaders instead of computing noise in real-time. This reduces GPU
 * fragment shader complexity significantly.
 * 
 * Usage in shaders:
 *   uniform sampler2D uNoiseTexture;
 *   float noise = texture2D(uNoiseTexture, uv * scale).r;
 */

import * as THREE from 'three';

// ============================================================================
// Noise Generation Functions (CPU-side)
// ============================================================================

/**
 * Simple hash function for pseudo-random noise
 */
function hash(x: number, y: number): number {
    const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
}

/**
 * 2D value noise implementation
 */
function valueNoise2D(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    // Smooth interpolation
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);

    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);

    return a + ux * (b - a) + uy * (c - a) + ux * uy * (a - b - c + d);
}

/**
 * Fractal Brownian Motion (FBM) noise
 */
function fbmNoise(x: number, y: number, octaves: number = 4): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
        value += amplitude * valueNoise2D(x * frequency, y * frequency);
        maxValue += amplitude;
        amplitude *= 0.5;
        frequency *= 2;
    }

    return value / maxValue;
}

/**
 * Voronoi edge detection noise
 */
function voronoiNoise(x: number, y: number): number {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    let minDist = 1.0;
    let minDist2 = 1.0;

    for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
            const ox = hash(ix + i, iy + j);
            const oy = hash(ix + i + 100, iy + j + 100);

            const dx = i + ox - fx;
            const dy = j + oy - fy;
            const d = dx * dx + dy * dy;

            if (d < minDist) {
                minDist2 = minDist;
                minDist = d;
            } else if (d < minDist2) {
                minDist2 = d;
            }
        }
    }

    return minDist2 - minDist; // Edge detection
}

// ============================================================================
// Texture Generation
// ============================================================================

export interface NoiseTextureOptions {
    /** Texture size (power of 2 recommended) */
    size?: number;
    /** Noise scale */
    scale?: number;
    /** Use wrap mode (seamless tiling) */
    seamless?: boolean;
}

/**
 * Create a precomputed FBM noise texture
 */
export function createFBMNoiseTexture(options: NoiseTextureOptions = {}): THREE.DataTexture {
    const { size = 256, scale = 4, seamless = true } = options;

    const data = new Uint8Array(size * size);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            let nx = (x / size) * scale;
            let ny = (y / size) * scale;

            // Make seamless by using periodic coordinates
            if (seamless) {
                const angle = (x / size) * Math.PI * 2;
                const angle2 = (y / size) * Math.PI * 2;
                nx = Math.cos(angle) * scale;
                ny = Math.sin(angle) * scale;
                const nz = Math.cos(angle2) * scale;
                const nw = Math.sin(angle2) * scale;
                // 4D noise projected to 2D for seamless tiling
                const noise = (fbmNoise(nx + nz * 0.5, ny + nw * 0.5) + 1) * 0.5;
                data[y * size + x] = Math.floor(noise * 255);
            } else {
                const noise = fbmNoise(nx, ny);
                data[y * size + x] = Math.floor(noise * 255);
            }
        }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    return texture;
}

/**
 * Create a precomputed Voronoi noise texture (for cracks/cells)
 */
export function createVoronoiNoiseTexture(options: NoiseTextureOptions = {}): THREE.DataTexture {
    const { size = 256, scale = 8 } = options;

    const data = new Uint8Array(size * size);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const nx = (x / size) * scale;
            const ny = (y / size) * scale;

            const noise = voronoiNoise(nx, ny);
            // Normalize to 0-255 range
            data[y * size + x] = Math.floor(Math.min(noise * 10, 1) * 255);
        }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    return texture;
}

/**
 * Create a combined RGBA noise texture with multiple noise types
 * R: Value noise
 * G: FBM noise  
 * B: Voronoi noise
 * A: Gradient noise
 */
export function createCombinedNoiseTexture(size: number = 256): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;
            const nx = (x / size) * 8;
            const ny = (y / size) * 8;

            // R: Simple value noise
            data[idx + 0] = Math.floor(valueNoise2D(nx, ny) * 255);

            // G: FBM noise
            data[idx + 1] = Math.floor(fbmNoise(nx * 0.5, ny * 0.5) * 255);

            // B: Voronoi edge
            data[idx + 2] = Math.floor(Math.min(voronoiNoise(nx, ny) * 10, 1) * 255);

            // A: High-frequency noise
            data[idx + 3] = Math.floor(valueNoise2D(nx * 4, ny * 4) * 255);
        }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    return texture;
}

// ============================================================================
// Singleton Texture Cache
// ============================================================================

let cachedFBMTexture: THREE.DataTexture | null = null;
let cachedVoronoiTexture: THREE.DataTexture | null = null;
let cachedCombinedTexture: THREE.DataTexture | null = null;

/**
 * Get or create a cached FBM noise texture
 */
export function getFBMNoiseTexture(): THREE.DataTexture {
    if (!cachedFBMTexture) {
        cachedFBMTexture = createFBMNoiseTexture({ size: 256, scale: 4 });
    }
    return cachedFBMTexture;
}

/**
 * Get or create a cached Voronoi noise texture
 */
export function getVoronoiNoiseTexture(): THREE.DataTexture {
    if (!cachedVoronoiTexture) {
        cachedVoronoiTexture = createVoronoiNoiseTexture({ size: 256, scale: 8 });
    }
    return cachedVoronoiTexture;
}

/**
 * Get or create a cached combined noise texture
 */
export function getCombinedNoiseTexture(): THREE.DataTexture {
    if (!cachedCombinedTexture) {
        cachedCombinedTexture = createCombinedNoiseTexture(256);
    }
    return cachedCombinedTexture;
}

/**
 * Dispose all cached textures (call on unmount/cleanup)
 */
export function disposeNoiseTextures(): void {
    if (cachedFBMTexture) {
        cachedFBMTexture.dispose();
        cachedFBMTexture = null;
    }
    if (cachedVoronoiTexture) {
        cachedVoronoiTexture.dispose();
        cachedVoronoiTexture = null;
    }
    if (cachedCombinedTexture) {
        cachedCombinedTexture.dispose();
        cachedCombinedTexture = null;
    }
}
