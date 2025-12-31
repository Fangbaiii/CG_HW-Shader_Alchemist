import React from 'react';
import * as THREE from 'three';

// --- 3. MIRROR MATERIAL ---
// Pure PBR reflection with optional dynamic envMap
export const MirrorMaterial = ({ envMap }: { envMap?: THREE.Texture }) => {
    return (
        <meshStandardMaterial
            color="#ffffff"
            roughness={0.0}
            metalness={1.0}
            envMap={envMap}
            envMapIntensity={1}
        />
    );
};
