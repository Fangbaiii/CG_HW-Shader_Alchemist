import React from 'react';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimatedMaterial } from './MaterialAnimation';
import planetVert from '../../shaders/materials/planetBlock.vert.glsl?raw';
import planetFrag from '../../shaders/materials/planetBlock.frag.glsl?raw';

// --- PLANET BLOCK MATERIAL ---
// Alien Tech-Rock: Dark metallic rock with pulsing energy veins and holographic rim
const PlanetBlockShaderMaterialImpl = shaderMaterial(
    {
        uTime: 0,
        uBaseColor: new THREE.Color('#1a1a2e'), // Deep dark blue/purple rock
        uCrackColor: new THREE.Color('#00ffff'), // Cyan energy
    },
    planetVert,
    planetFrag
);

extend({ PlanetBlockShaderMaterialImpl });

export const PlanetBlockMaterial = () => {
    const materialRef = useAnimatedMaterial();
    return <planetBlockShaderMaterialImpl ref={materialRef} />;
};
