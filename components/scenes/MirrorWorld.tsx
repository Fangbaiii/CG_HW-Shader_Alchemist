import React, { useState, useEffect, useMemo } from 'react';
import { Stars, Sparkles, Float } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LabObject } from '@/components/entities/LabObject';
import { LaserPuzzle } from '@/components/core/LaserPuzzle';
import { GunType } from '@/types';
import { CyberGridMaterial } from '@/components/materials'; // Assuming index export

// ==========================================
// MIRROR WORLD (Stage 3)
// ==========================================

type LabDefinition = {
    position: [number, number, number];
    size?: [number, number, number];
    rotation?: [number, number, number];
    contactBoost?: [number, number, number];
    initialType?: GunType | null;
    isTargetSurface?: boolean;
    isSafeSurface?: boolean;
};

// --- 第三关的平台组件 - 简单立方体 ---
const SimplePlatform = ({
    position,
    size,
    safe = false,
    interactive = false,
}: {
    position: [number, number, number];
    size: [number, number, number];
    safe?: boolean;
    interactive?: boolean;
}) => {
    const userData: Record<string, any> = {};
    if (safe) {
        userData.isSafeSurface = true;
    }
    if (interactive) {
        userData.isInteractive = true;
        userData.size = size;
        userData.type = null;
    }

    // 第三关：赛博网格风格
    return (
        <mesh
            position={position}
            castShadow
            receiveShadow
            userData={Object.keys(userData).length ? userData : undefined}
        >
            <boxGeometry args={size} />
            <CyberGridMaterial />
        </mesh>
    );
};

// --- 终点信标 ---
const GoalBeacon = ({ position }: { position: [number, number, number] }) => (
    <group position={position}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.2, 0.15, 16, 64]} />
            <meshStandardMaterial color="#7cf4ff" emissive="#7cf4ff" emissiveIntensity={0.6} metalness={1} roughness={0.1} />
        </mesh>
        <pointLight color="#7cf4ff" intensity={2} distance={5} />
    </group>
);

// --- Pulse Wave Effect ---
const PulseRings = ({ position, color, active }: { position: THREE.Vector3 | [number, number, number], color: string, active: boolean }) => {
    const groupRef = React.useRef<THREE.Group>(null);
    
    useFrame((state) => {
        if (!groupRef.current || !active) return;
        
        groupRef.current.children.forEach((mesh, i) => {
            const time = state.clock.elapsedTime;
            // Staggered rings
            const offset = i * 0.5;
            const t = (time + offset) % 2; // 2 seconds cycle
            
            // Expand
            const scale = 1 + t * 8; 
            mesh.scale.set(scale, scale, scale);
            
            // Fade
            const material = (mesh as THREE.Mesh).material as THREE.MeshBasicMaterial;
            if (material) {
                material.opacity = Math.max(0, 1 - t / 1.8);
                // @ts-ignore
                if(material.color) material.color.set(color);
            }
        });
        
        // Rotate the whole group slowly
        groupRef.current.rotation.y += 0.01;
    });

    if (!active) return null;

    return (
        <group ref={groupRef} position={position}>
            {[0, 1, 2].map(i => (
                <mesh key={i} rotation={[Math.PI/2, 0, 0]}>
                    <ringGeometry args={[0.8, 1, 32]} />
                    <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
    );
};

// --- Optical Matrix Background ---
const OpticalMatrixBackground = React.memo(({ intensity, activeColor }: { intensity: number, activeColor: string }) => {
    // 1. Vertical Energy Pillars (Data Streams)
    const pillars = useMemo(() => {
        return Array.from({ length: 30 }).map((_, i) => {
            const angle = (i / 30) * Math.PI * 2;
            const radius = 60 + Math.random() * 40; // Far background
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const h = 50 + Math.random() * 100;
            return { x, z, h, speed: 0.2 + Math.random() * 0.5 };
        });
    }, []);

    const groupRef = React.useRef<THREE.Group>(null);
    useFrame((state) => {
        if (!groupRef.current) return;
        // Subtle rotation of the whole world matrix
        groupRef.current.rotation.y = state.clock.elapsedTime * 0.02 * (1 + intensity);
    });

    return (
        <group ref={groupRef}>
            <Stars radius={150} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
            
            {/* Ambient Sparkles - reacting to intensity */}
            <Sparkles 
                count={500} 
                scale={[120, 80, 120]} 
                size={4 + intensity * 4} 
                speed={0.2 + intensity} 
                opacity={0.4} 
                color={activeColor} 
            />

            {/* Vertical Energy Pillars */}
            {pillars.map((p, i) => (
                <mesh key={i} position={[p.x, 0, p.z]}>
                    <cylinderGeometry args={[0.2, 0.2, p.h, 8]} />
                    <meshBasicMaterial 
                        color={activeColor} 
                        transparent 
                        opacity={0.3} 
                        blending={THREE.AdditiveBlending} 
                    />
                </mesh>
            ))}

            {/* Massive Optical Rings - The "Lens" of the world */}
            <Float speed={1} rotationIntensity={0.2} floatIntensity={0.5}>
                <group position={[0, 40, -80]} rotation={[Math.PI/3, 0, 0]}>
                    {/* Ring 1 */}
                    <mesh rotation={[0, 0, 0]}>
                        <torusGeometry args={[40, 0.2, 16, 128]} />
                        <meshStandardMaterial color="#ffffff" emissive={activeColor} emissiveIntensity={1 + intensity} />
                    </mesh>
                    {/* Ring 2 - Counter Rotating */}
                    <mesh rotation={[Math.PI/2, 0, 0]} scale={[0.9, 0.9, 0.9]}>
                        <torusGeometry args={[40, 0.5, 16, 128]} />
                        <meshStandardMaterial color="#222" emissive={activeColor} emissiveIntensity={0.5} wireframe />
                    </mesh>
                </group>
            </Float>

            {/* Matrix Grid Floor (Ceiling/Floor Illusion) */}
            <gridHelper args={[300, 60, "#333", "#111"]} position={[0, -50, 0]} />
            <gridHelper args={[300, 60, "#333", "#111"]} position={[0, 80, 0]} />
        </group>
    );
});

interface MirrorWorldProps {
    resetToken: number;
}

export const MirrorWorld: React.FC<MirrorWorldProps> = ({ resetToken }) => {
    const [isPuzzleSolved, setIsPuzzleSolved] = useState(false);
    const [nodeStates, setNodeStates] = useState([false, false, false]); // 3 Mirrors
    const bridgeGroupRef = React.useRef<THREE.Group>(null);

    // Reset puzzle on death/reset
    useEffect(() => {
        setNodeStates([false, false, false]);
        setIsPuzzleSolved(false);
        if (bridgeGroupRef.current) {
            bridgeGroupRef.current.position.y = -10;
        }
    }, [resetToken]);

    // Puzzle Configuration
    const emitterPos = useMemo(() => new THREE.Vector3(0, 2, 0), []);
    const node1Pos = useMemo(() => new THREE.Vector3(10, 2, 0), []);
    const node2Pos = useMemo(() => new THREE.Vector3(10, 2, -20), []);
    const node3Pos = useMemo(() => new THREE.Vector3(-10, 2, -20), []);
    const receiverPos = useMemo(() => new THREE.Vector3(-10, 2, 0), []);

    // Calculate Laser Path based on active mirrors
    const laserPoints = React.useMemo(() => {
        const points = [emitterPos];

        // Segment 1: Emitter -> Node 1
        if (nodeStates[0]) {
            points.push(node1Pos);

            // Segment 2: Node 1 -> Node 2
            if (nodeStates[1]) {
                points.push(node2Pos);

                // Segment 3: Node 2 -> Node 3
                if (nodeStates[2]) {
                    points.push(node3Pos);

                    // Segment 4: Node 3 -> Receiver
                    points.push(receiverPos);
                } else {
                    // Missed Node 3 (Shoot past it)
                    points.push(new THREE.Vector3(-15, 2, -20));
                }
            } else {
                // Missed Node 2 (Shoot past it)
                points.push(new THREE.Vector3(10, 2, -25));
            }
        } else {
            // Missed Node 1 (Shoot past it)
            points.push(new THREE.Vector3(15, 2, 0));
        }
        return points;
    }, [nodeStates, emitterPos, node1Pos, node2Pos, node3Pos, receiverPos]);

    useEffect(() => {
        // Check if path reached receiver
        const solved = nodeStates[0] && nodeStates[1] && nodeStates[2];
        setIsPuzzleSolved(solved);
    }, [nodeStates]);

    useFrame((state, delta) => {
        if (bridgeGroupRef.current) {
            const targetY = isPuzzleSolved ? 0 : -10;
            bridgeGroupRef.current.position.y = THREE.MathUtils.lerp(bridgeGroupRef.current.position.y, targetY, delta * 2);
        }
    });

    const handleNodeHit = React.useCallback((index: number, type: GunType) => {
        if (type === GunType.MIRROR) {
            setNodeStates(prev => {
                const next = [...prev];
                next[index] = true;
                return next;
            });
        }
    }, []);

    const onNode1Hit = React.useCallback((t: GunType) => handleNodeHit(0, t), [handleNodeHit]);
    const onNode2Hit = React.useCallback((t: GunType) => handleNodeHit(1, t), [handleNodeHit]);
    const onNode3Hit = React.useCallback((t: GunType) => handleNodeHit(2, t), [handleNodeHit]);

    // --- Active Theme Logic ---
    const activeCount = nodeStates.filter(Boolean).length;
    // Theme Palette: Purple (Base) -> Blue (Active 1) -> Orange (Active 2) -> Green (Success)
    // Actually user requested: Green=Reflective, Cyan=Walkable, Purple=Framework, Red=Key.
    // We will use "Active Color" to drive the background reactivity, while keeping structural colors consistent.
    // But for "feedback", let's make the 'ActiveColor' shift energy state.
    const activeColor = useMemo(() => {
        if (isPuzzleSolved) return "#00ff00"; // Pure Green
        if (activeCount === 2) return "#ff9900"; // High Energy Orange
        if (activeCount === 1) return "#00ffff"; // Active Cyan
        return "#ff00ff"; // Base Magenta/Purple
    }, [activeCount, isPuzzleSolved]);

    const intensity = activeCount === 3 ? 2.0 : (activeCount * 0.5);

    return (
        <>
            <color attach="background" args={['#050005']} />
            <fog attach="fog" args={['#050005', 40, 120]} />

            {/* Rich Cyber Atmosphere */}
            <OpticalMatrixBackground item={undefined} intensity={intensity} activeColor={activeColor} />

            <ambientLight intensity={0.4} color="#8800ff" /> {/* Purple Base Ambient */}
            <directionalLight 
                position={[10, 20, 10]} 
                intensity={1.0 + intensity} 
                color={activeColor} 
                castShadow 
                shadow-mapSize-width={2048} 
                shadow-mapSize-height={2048} 
            />
            {/* Rim light for definition */}
            <spotLight position={[-10, 10, -5]} angle={0.5} intensity={5} color="#00ffff" distance={60} />
            
            {/* Sonic Pulse Rings Effect - matching distinct colors */}
            <PulseRings position={node1Pos} color="#00ffff" active={nodeStates[0]} />
            <PulseRings position={node2Pos} color="#ff9900" active={nodeStates[1]} />
            <PulseRings position={node3Pos} color="#00ff00" active={nodeStates[2]} />

            {/* Start Platform */}
            <SimplePlatform position={[0, -2, 5]} size={[8, 1, 8]} safe interactive />

            {/* Puzzle Platforms */}
            <SimplePlatform position={[10, -2, 0]} size={[6, 1, 6]} safe interactive />
            <SimplePlatform position={[10, -2, -20]} size={[6, 1, 6]} safe interactive />
            <SimplePlatform position={[-10, -2, -20]} size={[6, 1, 6]} safe interactive />
            <SimplePlatform position={[-10, -2, 0]} size={[6, 1, 6]} safe interactive />

            {/* Laser System */}
            <LaserPuzzle
                points={laserPoints}
                solved={isPuzzleSolved}
            />

            {/* Puzzle Nodes (Mirrors) */}
            {/* Node 1 */}
            <LabObject
                position={[10, 2, 0]}
                rotation={[0, Math.PI / 4, 0]}
                size={[2, 2, 2]}
                resetToken={resetToken}
                stageId={2}
                onTypeChange={onNode1Hit}
            />
            {/* Node 2 */}
            <LabObject
                position={[10, 2, -20]}
                rotation={[0, Math.PI / 4, 0]}
                size={[2, 2, 2]}
                resetToken={resetToken}
                stageId={2}
                onTypeChange={onNode2Hit}
            />
            {/* Node 3 */}
            <LabObject
                position={[-10, 2, -20]}
                rotation={[0, Math.PI / 4, 0]}
                size={[2, 2, 2]}
                resetToken={resetToken}
                stageId={2}
                onTypeChange={onNode3Hit}
            />

            {/* Receiver */}
            <mesh position={[-10, 2, 0]}>
                <sphereGeometry args={[1, 32, 32]} />
                <meshStandardMaterial
                    color={isPuzzleSolved ? "#00ff00" : "#333333"}
                    emissive={isPuzzleSolved ? "#00ff00" : "#000000"}
                    emissiveIntensity={2}
                />
            </mesh>

            {/* The Bridge - Now Interactive LabObject */}
            <group ref={bridgeGroupRef} position={[-10, -10, -10]}>
                <LabObject
                    position={[0, 0, 0]}
                    size={[4, 0.5, 15]}
                    resetToken={resetToken}
                    stageId={2}
                    isSafeSurface
                />
            </group>

            {/* Final Tower */}
            <LabObject position={[-10, 5, -25]} size={[6, 0.5, 6]} resetToken={resetToken} stageId={2} isTargetSurface isSafeSurface />
            <LabObject position={[-10, 10, -30]} size={[4, 0.5, 4]} resetToken={resetToken} stageId={2} isTargetSurface isSafeSurface />
            <LabObject position={[-10, 15, -35]} size={[4, 0.5, 4]} resetToken={resetToken} stageId={2} isTargetSurface isSafeSurface />

            {/* Ghost Gate - Blocks the goal */}
            {/* Player must shoot this with Ghost Gun to pass through */}
            <LabObject
                position={[-10, 17, -33]}
                size={[4, 4, 0.5]}
                resetToken={resetToken}
                stageId={2}
                initialType={null} // Solid initially
            />

            <GoalBeacon position={[-10, 17, -35]} />
        </>
    );
};
