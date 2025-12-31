import React from 'react';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimatedMaterial } from './MaterialAnimation';
import cyberVert from '../../shaders/materials/cyberGrid.vert.glsl?raw';
import cyberFrag from '../../shaders/materials/cyberGrid.frag.glsl?raw';

// --- 6. CYBER GRID MATERIAL (Level 3) ---
// A retro-futuristic neon grid shader for the "Cyber City" theme
const CyberGridShaderMaterialImpl = shaderMaterial(
    {
        uTime: 0,
        uColor: new THREE.Color('#00ffff'), // Cyan grid
        uBaseColor: new THREE.Color('#050510'), // Dark background
    },
    cyberVert,
    cyberFrag
);

extend({ CyberGridShaderMaterialImpl });

export const CyberGridMaterial = () => {
    const materialRef = useAnimatedMaterial();
    return <cyberGridShaderMaterialImpl ref={materialRef} />;
};
