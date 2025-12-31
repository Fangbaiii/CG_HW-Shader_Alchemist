import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GunType, GUN_CONFIGS } from '@/types';
import { MeshWobbleMaterial } from '@react-three/drei';

interface GunModelProps {
    currentGun: GunType;
    isShooting: boolean;
}

export const GunModel: React.FC<GunModelProps> = ({ currentGun, isShooting }) => {
    const groupRef = useRef<THREE.Group>(null);

    const config = GUN_CONFIGS[currentGun];
    const color = new THREE.Color(config.emissive);

    // --- Animation Logic ---
    useFrame((state) => {
        if (!groupRef.current) return;

        const t = state.clock.getElapsedTime();

        // Base position
        let targetY = -0.28;
        let targetZ = -0.5;

        // Idle Breathing
        targetY += Math.sin(t * 2) * 0.005;
        const swayRotZ = Math.sin(t * 1.5) * 0.02;

        // Recoil
        if (isShooting) {
            // Kick back & up
            groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ + 0.2, 0.4);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0.15, 0.4);
        } else {
            // Return to idle
            groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.1);
            groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.1);
        }

        // Apply sway
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.1);
        groupRef.current.rotation.z = swayRotZ;
    });

    // --- 1. Jelly Gun Model ---
    const JellyGun = () => {
        // Spiral curve for internal detail
        const spiralCurve = useMemo(() => {
            const points = [];
            for (let i = 0; i < 10; i++) {
                const t = i / 10;
                const angle = t * Math.PI * 4;
                const radius = 0.03;
                points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, t * 0.4 - 0.2));
            }
            return new THREE.CatmullRomCurve3(points);
        }, []);

        return (
            <group>
                {/* --- Rear Tank (Pink Blob) --- */}
                <mesh position={[0, 0.05, 0.25]}>
                    <sphereGeometry args={[0.12, 32, 32]} />
                    <MeshWobbleMaterial factor={0.4} speed={2} color="#ff66aa" transparent opacity={0.9} roughness={0.1} />
                </mesh>

                {/* --- Main Barrel (Translucent Green Tube) --- */}
                <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.08, 0.1, 0.5, 16, 4, true]} />
                    <MeshWobbleMaterial factor={0.1} speed={1} color="#aaff00" transparent opacity={0.4} side={THREE.DoubleSide} />
                </mesh>

                {/* --- Internal Spiral (Blue Energy) --- */}
                <mesh position={[0, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
                    <tubeGeometry args={[spiralCurve, 64, 0.015, 8, false]} />
                    <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.8} />
                </mesh>

                {/* --- Floating Bubbles (Inside) --- */}
                <group position={[0, 0, -0.1]}>
                    <mesh position={[0.04, 0.04, 0]}>
                        <sphereGeometry args={[0.02, 16, 16]} />
                        <meshStandardMaterial color="#ffff00" emissive="#ffff00" />
                    </mesh>
                    <mesh position={[-0.03, -0.02, 0.1]}>
                        <sphereGeometry args={[0.025, 16, 16]} />
                        <meshStandardMaterial color="#ff00ff" emissive="#ff00ff" />
                    </mesh>
                    <mesh position={[0.02, -0.05, -0.1]}>
                        <sphereGeometry args={[0.015, 16, 16]} />
                        <meshStandardMaterial color="#00ff00" emissive="#00ff00" />
                    </mesh>
                </group>

                {/* --- Muzzle (Flower Shape) --- */}
                <group position={[0, 0, -0.38]}>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.06, 0.03, 16, 6]} /> {/* Hexagonal torus for variety */}
                        <MeshWobbleMaterial factor={0.5} speed={3} color="#ffaa00" />
                    </mesh>
                    <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
                        <torusGeometry args={[0.09, 0.02, 16, 32]} />
                        <MeshWobbleMaterial factor={0.2} speed={2} color="#aaff00" transparent opacity={0.8} />
                    </mesh>
                </group>

                {/* --- External Rings/Ribs (Texture) --- */}
                {[0, 1, 2].map((i) => (
                    <mesh key={i} position={[0, 0, -0.25 + i * 0.15]} rotation={[Math.PI / 2, 0, 0]}>
                        <torusGeometry args={[0.09 + i * 0.01, 0.015, 16, 32]} />
                        <meshStandardMaterial color="#ffffff" transparent opacity={0.5} />
                    </mesh>
                ))}

                {/* --- Handle Connection (Gooey) --- */}
                <mesh position={[0, -0.1, 0.15]} rotation={[-0.5, 0, 0]}>
                    <capsuleGeometry args={[0.06, 0.2, 4, 8]} />
                    <meshStandardMaterial color="#44aa00" roughness={0.3} />
                </mesh>
            </group>
        );
    };

    // --- 2. Ghost Gun Model ---
    const GhostGun = () => {
        const crystalRef = useRef<THREE.Mesh>(null);
        useFrame((state) => {
            if (crystalRef.current) {
                crystalRef.current.rotation.y += 0.02;
                crystalRef.current.rotation.z += 0.01;
            }
        });

        return (
            <group>
                {/* Main Frame - Angular & Hollow */}
                <group position={[0, 0, 0]}>
                    {/* Top Rail */}
                    <mesh position={[0, 0.1, 0]}>
                        <boxGeometry args={[0.1, 0.05, 0.8]} />
                        <meshStandardMaterial color="#2c2c2c" roughness={0.2} />
                    </mesh>
                    {/* Bottom Rail */}
                    <mesh position={[0, -0.1, 0]}>
                        <boxGeometry args={[0.1, 0.05, 0.8]} />
                        <meshStandardMaterial color="#2c2c2c" roughness={0.2} />
                    </mesh>
                    {/* Side Panels (Glowing) */}
                    <mesh position={[0.06, 0, 0]}>
                        <boxGeometry args={[0.02, 0.15, 0.6]} />
                        <meshBasicMaterial color={color} wireframe />
                    </mesh>
                    <mesh position={[-0.06, 0, 0]}>
                        <boxGeometry args={[0.02, 0.15, 0.6]} />
                        <meshBasicMaterial color={color} wireframe />
                    </mesh>
                </group>

                {/* Floating Crystal Core */}
                <mesh ref={crystalRef} position={[0, 0, -0.5]}>
                    <octahedronGeometry args={[0.08, 0]} />
                    <meshBasicMaterial color={color} wireframe />
                </mesh>

                {/* Energy Beam (Internal) */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.8, 8]} />
                    <meshBasicMaterial color={color} transparent opacity={0.5} />
                </mesh>
            </group>
        );
    };

    // --- 3. Mirror Gun Model ---
    const MirrorGun = () => {
        const prismRef = useRef<THREE.Mesh>(null);

        useFrame((state) => {
            if (prismRef.current) {
                prismRef.current.rotation.y += 0.01;
                prismRef.current.rotation.x = Math.sin(state.clock.getElapsedTime()) * 0.1;
            }
        });

        const chromeMaterial = <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} envMapIntensity={2} />;

        return (
            <group>
                {/* --- Main Barrel (Hexagonal Prism) --- */}
                {/* Hexagon shape reflects environment better than cylinder */}
                <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.2]}>
                    <cylinderGeometry args={[0.05, 0.07, 0.6, 6]} />
                    {chromeMaterial}
                </mesh>

                {/* --- Rear Body (Boxy Tech) --- */}
                <mesh position={[0, 0.02, 0.25]}>
                    <boxGeometry args={[0.12, 0.15, 0.3]} />
                    <meshStandardMaterial color="#e0e0e0" metalness={0.9} roughness={0.1} />
                </mesh>

                {/* --- Floating Prism Core (The "Source") --- */}
                <group position={[0, 0.12, 0.15]}>
                    {/* Holder Arms */}
                    <mesh position={[-0.07, 0, 0]} rotation={[0, 0, -0.2]}>
                        <boxGeometry args={[0.02, 0.1, 0.2]} />
                        <meshStandardMaterial color="#888" metalness={0.8} />
                    </mesh>
                    <mesh position={[0.07, 0, 0]} rotation={[0, 0, 0.2]}>
                        <boxGeometry args={[0.02, 0.1, 0.2]} />
                        <meshStandardMaterial color="#888" metalness={0.8} />
                    </mesh>

                    {/* Spinning Prism */}
                    <mesh ref={prismRef}>
                        <octahedronGeometry args={[0.06, 0]} />
                        <meshPhysicalMaterial
                            color="#ccffff"
                            metalness={0.9}
                            roughness={0}
                            transmission={0.2}
                            emissive="#00ffff"
                            emissiveIntensity={0.2}
                        />
                    </mesh>
                </group>

                {/* --- Scope (Optical Lens Array) --- */}
                <group position={[0, 0.14, -0.1]}>
                    {/* Mount */}
                    <mesh position={[0, -0.06, 0]}>
                        <boxGeometry args={[0.04, 0.08, 0.1]} />
                        <meshStandardMaterial color="#333" />
                    </mesh>
                    {/* Lens Tube */}
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.04, 0.04, 0.2, 16]} />
                        <meshStandardMaterial color="#222" metalness={0.8} roughness={0.2} />
                    </mesh>
                    {/* Front Lens */}
                    <mesh position={[0, 0, -0.11]} rotation={[Math.PI / 2, 0, 0]}>
                        <sphereGeometry args={[0.038, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                        <meshPhysicalMaterial transmission={1} roughness={0} color="#aaccff" />
                    </mesh>
                </group>

                {/* --- Muzzle (Focusing Array) --- */}
                <group position={[0, 0, -0.55]}>
                    {/* Focusing Plates - Glass discs */}
                    {[0, 1, 2, 3].map((i) => (
                        <mesh key={i} position={[0, 0, i * 0.03]} rotation={[Math.PI / 2, 0, 0]}>
                            <cylinderGeometry args={[0.06 - i * 0.005, 0.06 - i * 0.005, 0.005, 6]} />
                            <meshPhysicalMaterial color="#ffffff" transmission={0.8} roughness={0.1} metalness={0.5} />
                        </mesh>
                    ))}
                    {/* Tip */}
                    <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
                        <coneGeometry args={[0.04, 0.1, 6, 1, true]} />
                        <meshStandardMaterial color="#ffffff" metalness={1} roughness={0} side={THREE.DoubleSide} />
                    </mesh>
                </group>

                {/* --- Side Details (Pipes) --- */}
                <mesh position={[0.06, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 0.5, 8]} />
                    <meshStandardMaterial color="#888" metalness={0.6} />
                </mesh>
                <mesh position={[-0.06, 0, -0.1]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.01, 0.01, 0.5, 8]} />
                    <meshStandardMaterial color="#888" metalness={0.6} />
                </mesh>
            </group>
        );
    };

    return (
        <group ref={groupRef} position={[0.35, -0.28, -0.5]} rotation={[0, 0.04, 0]}>
            {/* Common Handle for all guns */}
            <mesh position={[0, -0.15, 0.3]} rotation={[-0.2, 0, 0]}>
                <boxGeometry args={[0.1, 0.25, 0.15]} />
                <meshStandardMaterial color="#333" />
            </mesh>

            {currentGun === GunType.JELLY && <JellyGun />}
            {currentGun === GunType.GHOST && <GhostGun />}
            {currentGun === GunType.MIRROR && <MirrorGun />}
        </group>
    );
};