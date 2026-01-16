import React from 'react';
import { shaderMaterial } from '@react-three/drei';
import { extend } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimatedMaterial } from './MaterialAnimation';
import volcanoSkyVert from '../../shaders/materials/volcanoSky.vert.glsl?raw';
import volcanoSkyFrag from '../../shaders/materials/volcanoSky.frag.glsl?raw';
import { composeShader, ShaderChunks } from '../../shaders';

// --- VOLCANO SKY SHADER ---
// 程序化火山天空：底部橙红色 -> 中间暗红 -> 顶部灰黑色
// 组合通用噪声函数和 fragment shader
const composedFragShader = composeShader([ShaderChunks.common, volcanoSkyFrag]);

const VolcanoSkyMaterialImpl = shaderMaterial(
    {
        uTime: 0,
    },
    volcanoSkyVert,
    composedFragShader
);

extend({ VolcanoSkyMaterialImpl });

export const VolcanoSkyMaterial = () => {
    const materialRef = useAnimatedMaterial();
    return <volcanoSkyMaterialImpl ref={materialRef} side={THREE.BackSide} />;
};
