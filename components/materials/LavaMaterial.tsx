import React, { useMemo } from 'react';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimatedMaterial } from './MaterialAnimation';
import { getFBMNoiseTexture } from '../../shaders/NoiseTexture';
import lavaVert from '../../shaders/materials/lava.vert.glsl?raw';
import lavaFrag from '../../shaders/materials/lava.frag.glsl?raw';

// --- 4. LAVA MATERIAL ---
// High-performance lava shader using pre-baked FBM noise texture
const LavaShaderMaterialImpl = shaderMaterial(
    {
        uTime: 0,
        uNoiseTexture: null as THREE.Texture | null,
        uColor1: new THREE.Color('#dd3300'), // Hot lava core - deeper orange-red
        uColor2: new THREE.Color('#0a0000'), // Dark cooled crust - near black
        uColor3: new THREE.Color('#ff6600'), // Brightest veins - burnt orange instead of yellow
    },
    lavaVert,
    lavaFrag
);

extend({ LavaShaderMaterialImpl });

export const LavaMaterial = () => {
    const materialRef = useAnimatedMaterial();

    // Get pre-baked FBM noise texture (cached singleton)
    const noiseTexture = useMemo(() => getFBMNoiseTexture(), []);

    return (
        <lavaShaderMaterialImpl
            ref={materialRef}
            uNoiseTexture={noiseTexture}
        />
    );
};
