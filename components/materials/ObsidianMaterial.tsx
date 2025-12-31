import React from 'react';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import { useAnimatedMaterial } from './MaterialAnimation';
import commonGlsl from '../../shaders/common/index.glsl?raw';
import obsidianVert from '../../shaders/materials/obsidian.vert.glsl?raw';
import obsidianFrag from '../../shaders/materials/obsidian.frag.glsl?raw';

// Helper to compose shader
const composeShader = (utilities: string, mainShader: string): string => {
    return `${utilities}\n\n${mainShader}`;
};

// --- OBSIDIAN MATERIAL ---
// 黑曜石材质 - 深黑色带发光裂纹效果
const ObsidianMaterialImpl = shaderMaterial(
    {
        uTime: 0,
    },
    obsidianVert,
    composeShader(commonGlsl, obsidianFrag)
);

extend({ ObsidianMaterialImpl });

export const ObsidianMaterial = () => {
    const materialRef = useAnimatedMaterial();
    return <obsidianMaterialImpl ref={materialRef} />;
};
