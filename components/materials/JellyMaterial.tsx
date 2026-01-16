import React from 'react';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimatedMaterial } from './MaterialAnimation';
import jellyVert from '../../shaders/materials/jelly.vert.glsl?raw';
import jellyFrag from '../../shaders/materials/jelly.frag.glsl?raw';

// --- CUSTOM JELLY SHADER MATERIAL ---
const JellyShaderMaterialImpl = shaderMaterial(
    {
        uTime: 0,
        uColor: new THREE.Color('#26b809')
    },
    jellyVert,
    jellyFrag
);

extend({ JellyShaderMaterialImpl });

// --- 1. JELLY MATERIAL ---
// Uses custom shader to simulate wobbling fluid
export const JellyMaterial = ({ color = "#33d017", side = THREE.FrontSide }: { color?: string, side?: THREE.Side }) => {
    const materialRef = useAnimatedMaterial();

    return (
        <jellyShaderMaterialImpl
            ref={materialRef}
            uColor={new THREE.Color(color)}
            transparent
            side={side}
            depthWrite={false}      // Disable depth write to prevent self-occlusion artifacts
        />
    );
};
