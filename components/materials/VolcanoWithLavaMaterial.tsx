import React, { useMemo } from 'react';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimatedMaterial } from './MaterialAnimation';
import { getFBMNoiseTexture } from '../../shaders/NoiseTexture';
import volcanoVert from '../../shaders/materials/volcanoWithLava.vert.glsl?raw';
import volcanoFrag from '../../shaders/materials/volcanoWithLava.frag.glsl?raw';

// --- UNIFIED VOLCANO WITH LAVA MATERIAL ---
// Combines rock surface with programmatic lava flows and heat cracks
// Uses pre-baked noise textures for performance

const VolcanoWithLavaMaterialImpl = shaderMaterial(
    {
        uTime: 0,
        uNoiseTexture: null as THREE.Texture | null,
        uVolcanoHeight: 20.0,
        uVolcanoTopRadius: 3.0,
        uVolcanoBottomRadius: 25.0,
        // Colors
        uRockColor: new THREE.Color('#0f0a08'),
        uLavaColor1: new THREE.Color('#dd3300'),
        uLavaColor2: new THREE.Color('#ff6600'),
    },
    volcanoVert,
    volcanoFrag
);

extend({ VolcanoWithLavaMaterialImpl });

export const VolcanoWithLavaMaterial = () => {
    const materialRef = useAnimatedMaterial();
    const noiseTexture = useMemo(() => getFBMNoiseTexture(), []);

    return (
        <volcanoWithLavaMaterialImpl
            ref={materialRef}
            uNoiseTexture={noiseTexture}
            flatShading={true}  // Keep low-poly aesthetic
        />
    );
};
