/**
 * Shader Utilities
 * 
 * This module provides tools for composing GLSL shaders from modular parts.
 * Use Vite's ?raw import to load .glsl files as strings.
 * 
 * @example
 * ```tsx
 * import noiseChunk from '../shaders/common/noise.glsl?raw';
 * import myFragShader from '../shaders/materials/myMaterial.frag.glsl?raw';
 * 
 * const fragmentShader = composeShader([noiseChunk, myFragShader]);
 * ```
 */

// Import common shader chunks
import noiseGlsl from './common/noise.glsl?raw';
import voronoiGlsl from './common/voronoi.glsl?raw';
import simplexGlsl from './common/simplex.glsl?raw';
import commonGlsl from './common/index.glsl?raw';

/**
 * Common shader chunks available for composition
 */
export const ShaderChunks = {
    /** Basic noise functions: hash, noise, fbm */
    noise: noiseGlsl,
    /** Voronoi noise for cellular patterns */
    voronoi: voronoiGlsl,
    /** Simplex noise (2D and 3D) */
    simplex: simplexGlsl,
    /** All common utilities combined */
    common: commonGlsl,
} as const;

/**
 * Composes multiple shader chunks into a single shader string.
 * Adds line breaks between chunks for readability.
 * 
 * @param chunks - Array of shader code strings to combine
 * @returns Combined shader code
 */
export function composeShader(chunks: string[]): string {
    return chunks.join('\n\n');
}

/**
 * Prepends common utilities to a shader.
 * Use this for shaders that need standard noise functions.
 * 
 * @param mainShader - The main shader code
 * @param utilities - Which utility chunks to include (default: all common)
 * @returns Shader with utilities prepended
 */
export function withUtilities(
    mainShader: string,
    utilities: Array<keyof typeof ShaderChunks> = ['common']
): string {
    if (!utilities) return mainShader;
    const utilityChunks = utilities?.map(key => ShaderChunks[key]) ?? [];
    return composeShader([...utilityChunks, mainShader]);
}

/**
 * Creates a vertex/fragment shader pair with shared utilities.
 * 
 * @param vertexShader - Vertex shader code (without utilities)
 * @param fragmentShader - Fragment shader code (without utilities)
 * @param utilities - Utility chunks to include in fragment shader
 * @returns Object with vertex and fragment shader strings
 */
export function createShaderPair(
    vertexShader: string,
    fragmentShader: string,
    utilities: Array<keyof typeof ShaderChunks> = []
): { vertexShader: string; fragmentShader: string } {
    return {
        vertexShader,
        fragmentShader: utilities.length > 0
            ? withUtilities(fragmentShader, utilities)
            : fragmentShader,
    };
}

// Re-export chunks for direct import
export { noiseGlsl, voronoiGlsl, simplexGlsl, commonGlsl };

// Re-export noise texture utilities
export {
    createFBMNoiseTexture,
    createVoronoiNoiseTexture,
    createCombinedNoiseTexture,
    getFBMNoiseTexture,
    getVoronoiNoiseTexture,
    getCombinedNoiseTexture,
    disposeNoiseTextures,
} from './NoiseTexture';
export type { NoiseTextureOptions } from './NoiseTexture';
