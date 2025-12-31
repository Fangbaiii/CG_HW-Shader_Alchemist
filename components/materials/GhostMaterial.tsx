import React from 'react';
import * as THREE from 'three';

// --- 2. GHOST/WIREFRAME MATERIAL ---
// A complex component that renders a transparent shell + glowing wireframe
export const GhostMaterial = () => {
    return (
        <>
            {/* Inner Transparent Core */}
            <meshPhysicalMaterial
                color="#00ffff"
                transparent
                opacity={0.1}
                roughness={0}
                metalness={0.8}
                side={THREE.DoubleSide}
                emissive="#004444"
                emissiveIntensity={0.2}
            />
        </>
    );
};
// Helper for the wireframe overlay logic, usually used as a child mesh
export const GhostWireframeMaterial = () => (
    <meshBasicMaterial
        color="#00ffff"
        wireframe
        transparent
        opacity={0.4}
    />
);
