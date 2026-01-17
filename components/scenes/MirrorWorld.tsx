import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { LabObject } from '@/components/entities/LabObject';
import { GunType } from '@/types';

// ==========================================
// MIRROR WORLD (Stage 3) - Linear "rolling sky" runner
// ==========================================

const PALETTES = [
    {
        name: 'cyan-core',
        track: '#6de8ff',
        dim: '#1c2c3a',
        highlight: '#bff6ff',
        edge: '#0ff7ff',
        gate: '#ff3b6a',
        ambient: '#6de8ff',
    },
    {
        name: 'magenta-push',
        track: '#ff7ce5',
        dim: '#2a1730',
        highlight: '#ffc6f7',
        edge: '#ff42c9',
        gate: '#7cf4ff',
        ambient: '#ff7ce5',
    },
    {
        name: 'amber-burst',
        track: '#ffc857',
        dim: '#2a1c0f',
        highlight: '#ffe2a4',
        edge: '#ff9f1c',
        gate: '#5ad1ff',
        ambient: '#ffc857',
    },
    {
        name: 'emerald-drive',
        track: '#7af0c4',
        dim: '#0f2a21',
        highlight: '#c7ffe6',
        edge: '#00ffa5',
        gate: '#ff5f87',
        ambient: '#7af0c4',
    },
];
const SKY_COLOR = '#03060b';

type Segment = {
    id: number;
    z: number;
    width: number;
    length: number;
};

type ControlNode = {
    id: number;
    position: [number, number, number];
    activatesBand: number;
};

type Gate = {
    band: number;
    z: number;
};

const SEGMENT_LENGTH = 16;
const SEGMENT_COUNT = 16;
const BAND_SIZE = 4; // how many segments per activation band

const clampPaletteIndex = (i: number) => Math.max(0, Math.min(PALETTES.length - 1, i));

const buildSegments = (): Segment[] => {
    return Array.from({ length: SEGMENT_COUNT }).map((_, i) => ({
        id: i,
        z: -i * SEGMENT_LENGTH,
        width: i % 3 === 0 ? 9 : 8,
        length: SEGMENT_LENGTH,
    }));
};

const bandIndexFor = (segmentId: number) => Math.floor(segmentId / BAND_SIZE);

const RunwaySegment: React.FC<{ segment: Segment; active: boolean; palette: typeof PALETTES[number] }>
    = ({ segment, active, palette }) => {
        const { z, width, length } = segment;
        const dim = 0.6;
        return (
            <group position={[0, 0, z]}>
                {active ? (
                    <>
                        <mesh
                            position={[0, -0.2, 0]}
                            castShadow
                            receiveShadow
                            userData={{ isSafeSurface: true, size: [width, dim, length] }}
                        >
                            <boxGeometry args={[width, dim, length]} />
                            <meshStandardMaterial color={palette.dim} roughness={0.9} metalness={0.05} />
                        </mesh>
                        <mesh
                            position={[0, 0, 0]}
                            castShadow
                            receiveShadow
                            userData={{ isSafeSurface: true, size: [width - 0.4, 0.25, length - 0.4] }}
                        >
                            <boxGeometry args={[width - 0.4, 0.25, length - 0.4]} />
                            <meshStandardMaterial color={palette.track} emissive={palette.edge} emissiveIntensity={0.08} roughness={0.6} metalness={0.08} />
                        </mesh>
                        <mesh position={[0, 0.14, 0]}>
                            <boxGeometry args={[0.35, 0.1, length - 0.6]} />
                            <meshStandardMaterial color={palette.highlight} emissive={palette.highlight} emissiveIntensity={0.3} roughness={0.4} metalness={0.1} />
                        </mesh>
                        {/* Side rails for direction cue */}
                        <mesh position={[width / 2 - 0.35, 0.2, 0]}>
                            <boxGeometry args={[0.3, 0.25, length - 0.4]} />
                            <meshStandardMaterial color={palette.edge} emissive={palette.edge} emissiveIntensity={0.35} roughness={0.3} metalness={0.25} />
                        </mesh>
                        <mesh position={[-width / 2 + 0.35, 0.2, 0]}>
                            <boxGeometry args={[0.3, 0.25, length - 0.4]} />
                            <meshStandardMaterial color={palette.edge} emissive={palette.edge} emissiveIntensity={0.35} roughness={0.3} metalness={0.25} />
                        </mesh>
                    </>
                ) : (
                    <lineSegments position={[0, 0, 0]}>
                        <edgesGeometry args={[new THREE.BoxGeometry(width, dim, length)]} />
                        <lineBasicMaterial color={palette.edge} transparent opacity={0.12} />
                    </lineSegments>
                )}
            </group>
        );
    };

const BarrierGate: React.FC<{ gate: Gate; active: boolean; palette: typeof PALETTES[number] }> = ({ gate, active, palette }) => {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((_, delta) => {
        if (!ref.current) return;
        const targetY = active ? -2.5 : 0.9;
        ref.current.position.y = THREE.MathUtils.lerp(ref.current.position.y, targetY, delta * 3);
    });
    return (
        <mesh
            ref={ref}
            position={[0, 0.9, gate.z]}
            castShadow
            receiveShadow
            userData={{ isInteractive: true, size: [10, 2, 1.5] }}
        >
            <boxGeometry args={[10, 2, 1.5]} />
            <meshStandardMaterial color={palette.gate} emissive={palette.gate} emissiveIntensity={0.8} roughness={0.35} metalness={0.4} />
        </mesh>
    );
};

const MovingObstacle: React.FC<{
    type: 'lift' | 'spinner' | 'pusher';
    position: [number, number, number];
    size: [number, number, number];
    speed: number;
    range?: number;
    palette: typeof PALETTES[number];
}> = ({ type, position, size, speed, range = 2, palette }) => {
    const ref = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.elapsedTime * speed;
        if (type === 'lift') {
            ref.current.position.y = position[1] + Math.sin(t) * range;
        }
        if (type === 'pusher') {
            ref.current.position.x = position[0] + Math.sin(t) * range;
        }
        if (type === 'spinner') {
            ref.current.rotation.y = t;
        }
    });

    const userData = { isInteractive: true, size };
    return (
        <mesh ref={ref} position={position} userData={userData} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color={palette.dim} emissive={palette.edge} emissiveIntensity={0.18} roughness={0.4} metalness={0.2} />
        </mesh>
    );
};

const ActivatorNode: React.FC<{ node: ControlNode; onHit: (band: number) => void; resetToken: number; palette: typeof PALETTES[number] }>
    = ({ node, onHit, resetToken, palette }) => {
        const { position, activatesBand } = node;
        const handleHit = (t: GunType) => {
            if (t === GunType.MIRROR) onHit(activatesBand);
        };
        return (
            <group position={position}>
                <LabObject
                    position={[0, 0, 0]}
                    size={[1.6, 1.6, 1.6]}
                    rotation={[0, Math.PI / 4, 0]}
                    resetToken={resetToken}
                    stageId={2}
                    onTypeChange={handleHit}
                />
                <mesh position={[0, 1.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.9, 1.4, 24]} />
                    <meshBasicMaterial color={palette.edge} transparent opacity={0.7} />
                </mesh>
            </group>
        );
    };

const GoalBeacon = ({ position, palette }: { position: [number, number, number]; palette: typeof PALETTES[number] }) => (
    <group position={position}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.6, 0.2, 16, 64]} />
            <meshStandardMaterial color={palette.edge} emissive={palette.edge} emissiveIntensity={1.4} metalness={0.35} roughness={0.25} />
        </mesh>
        <pointLight color={palette.edge} intensity={3} distance={8} />
    </group>
);

const PulseWaves: React.FC<{ palette: typeof PALETTES[number] }> = ({ palette }) => {
    const rings = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        rings.forEach((ref, idx) => {
            if (!ref.current) return;
            const phase = t + idx * 0.8;
            const cyc = (phase % 2.4) / 2.4;
            const scale = 1 + cyc * 24;
            const opacity = 0.55 * (1 - cyc);
            ref.current.scale.set(scale, scale, scale);
            const mat = ref.current.material as THREE.MeshBasicMaterial;
            if (mat) mat.opacity = opacity;
        });
    });
    return (
        <group position={[0, 0.02, -20]}>
            {[0, 1, 2].map((i) => (
                <mesh key={i} ref={rings[i]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[2.5, 2.8, 64]} />
                    <meshBasicMaterial color={palette.edge} transparent opacity={0.5} />
                </mesh>
            ))}
        </group>
    );
};

const FlyingDrake: React.FC<{ offsetZ: number; palette: typeof PALETTES[number]; speed?: number; height?: number; sway?: number }>
    = ({ offsetZ, palette, speed = 0.35, height = 8, sway = 3 }) => {
        const ref = useRef<THREE.Group>(null);
        useFrame((state) => {
            if (!ref.current) return;
            const t = state.clock.elapsedTime * speed;
            ref.current.position.z = offsetZ + Math.sin(t) * 40;
            ref.current.position.x = Math.sin(t * 1.6) * 6;
            ref.current.position.y = height + Math.sin(t * 2.2) * sway;
            ref.current.rotation.y = Math.sin(t * 1.2) * 0.4;
        });
        return (
            <group ref={ref} position={[0, height, offsetZ]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.35, 0.45, 3.8, 12, 1]} />
                    <meshStandardMaterial color={palette.edge} emissive={palette.edge} emissiveIntensity={0.4} roughness={0.4} metalness={0.2} />
                </mesh>
                <mesh position={[0, 0.3, 2.3]}>
                    <sphereGeometry args={[0.5, 16, 12]} />
                    <meshStandardMaterial color={palette.gate} emissive={palette.gate} emissiveIntensity={0.3} roughness={0.4} metalness={0.25} />
                </mesh>
                <mesh position={[0, 0, -2.3]} rotation={[Math.PI / 2.2, 0, 0]}>
                    <coneGeometry args={[0.5, 2.4, 14]} />
                    <meshStandardMaterial color={palette.edge} emissive={palette.edge} emissiveIntensity={0.25} roughness={0.35} metalness={0.2} />
                </mesh>
                <mesh position={[0.2, 0.2, 0]} rotation={[0, 0, Math.PI / 9]}>
                    <planeGeometry args={[4, 1.6, 1, 1]} />
                    <meshStandardMaterial color={palette.highlight} transparent opacity={0.8} side={THREE.DoubleSide} />
                </mesh>
                <mesh position={[-0.2, 0.2, 0]} rotation={[0, 0, -Math.PI / 9]}>
                    <planeGeometry args={[4, 1.6, 1, 1]} />
                    <meshStandardMaterial color={palette.highlight} transparent opacity={0.8} side={THREE.DoubleSide} />
                </mesh>
            </group>
        );
    };

const SideParticleStream: React.FC<{ side: 'left' | 'right'; palette: typeof PALETTES[number]; count?: number; length?: number }>
    = ({ side, palette, count = 70, length = 320 }) => {
        const startZ = -8;
        const endZ = -length;
        const positions = useMemo(() => {
            const arr = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                const xBase = side === 'left' ? -16 : 16;
                const x = xBase + (Math.random() * 4 - 2);
                const y = 1 + Math.random() * 7;
                const z = -Math.random() * length;
                arr[i * 3] = x;
                arr[i * 3 + 1] = y;
                arr[i * 3 + 2] = z;
            }
            return arr;
        }, [count, length, side]);

        const velocities = useMemo(() => {
            const v = new Float32Array(count);
            for (let i = 0; i < count; i++) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                v[i] = dir * (0.8 + Math.random() * 1.1);
            }
            return v;
        }, [count]);

        const ref = useRef<THREE.Points>(null);
        useFrame((_, delta) => {
            if (!ref.current) return;
            const attr = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute;
            for (let i = 0; i < count; i++) {
                let z = attr.getZ(i) + velocities[i] * delta * 10;
                if (z > startZ) z = endZ;
                if (z < endZ) z = startZ;
                attr.setZ(i, z);
            }
            attr.needsUpdate = true;
        });

        return (
            <points ref={ref}>
                <bufferGeometry>
                    <bufferAttribute attach="attributes-position" args={[positions, 3]} />
                </bufferGeometry>
                <pointsMaterial color={palette.edge} size={0.35} sizeAttenuation transparent opacity={0.78} depthWrite={false} />
            </points>
        );
    };

const LightColumns: React.FC<{ palette: typeof PALETTES[number]; length?: number; spacing?: number }>
    = ({ palette, length = 340, spacing = 8 }) => {
        const columns = useMemo(() => {
            const items: { x: number; z: number; h: number }[] = [];
            const count = Math.floor(length / spacing);
            for (let i = 0; i <= count; i++) {
                const z = -i * spacing - 6;
                const side = i % 2 === 0 ? 1 : -1;
                const baseX = side * 14;
                const jitter = (i % 3) * 0.6;
                const h = 5.5 + (i % 4) * 0.7;
                items.push({ x: baseX + side * jitter, z, h });
            }
            return items;
        }, [length, spacing]);

        const columnColor = useMemo(() => {
            const c = new THREE.Color(palette.edge);
            const d = new THREE.Color(palette.dim);
            return c.lerp(d, 0.55).getStyle();
        }, [palette]);

        return (
            <group>
                {columns.map((col, idx) => (
                    <mesh key={idx} position={[col.x, col.h / 2, col.z]}>
                        <cylinderGeometry args={[0.25, 0.22, col.h, 8, 1]} />
                        <meshStandardMaterial
                            color={columnColor}
                            emissive={palette.edge}
                            emissiveIntensity={0.35}
                            roughness={0.65}
                            metalness={0.28}
                        />
                    </mesh>
                ))}
            </group>
        );
    };

const SkyRing: React.FC<{ palette: typeof PALETTES[number]; position?: [number, number, number] }>
    = ({ palette, position = [0, 30, -140] }) => {
        const ref = useRef<THREE.Mesh>(null);
        useFrame((state) => {
            if (!ref.current) return;
            const t = state.clock.elapsedTime;
            ref.current.rotation.z = t * 0.08;
            ref.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.12) * 0.08;
            ref.current.scale.setScalar(1 + Math.sin(t * 0.35) * 0.03);
        });
        const ringColor = useMemo(() => {
            const c = new THREE.Color(palette.edge);
            const h = new THREE.Color(palette.highlight);
            return c.lerp(h, 0.35).getStyle();
        }, [palette]);
        return (
            <mesh ref={ref} position={position} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[42, 0.6, 16, 128]} />
                <meshStandardMaterial
                    color={ringColor}
                    emissive={palette.edge}
                    emissiveIntensity={0.35}
                    roughness={0.4}
                    metalness={0.3}
                    transparent
                    opacity={0.6}
                />
            </mesh>
        );
    };

interface MirrorWorldProps {
    resetToken: number;
}

export const MirrorWorld: React.FC<MirrorWorldProps> = ({ resetToken }) => {
    const segments = useMemo(() => buildSegments(), []);
    const [bandActive, setBandActive] = useState<boolean[]>([true, false, false, false]);
    const [paletteIndex, setPaletteIndex] = useState(0);
    const palette = useMemo(() => PALETTES[paletteIndex], [paletteIndex]);

    const nodes: ControlNode[] = useMemo(() => ([
        { id: 0, position: [-4, 1.2, -26], activatesBand: 1 },
        { id: 1, position: [4, 1.2, -72], activatesBand: 2 },
        { id: 2, position: [0, 1.2, -124], activatesBand: 3 },
    ]), []);

    const obstacles = useMemo(() => ([
        { type: 'lift' as const, position: [0, 0.6, -38], size: [2, 0.6, 3], speed: 1.2, range: 1.6 },
        { type: 'spinner' as const, position: [0, 1.0, -86], size: [7, 0.4, 0.6], speed: 1.4 },
        { type: 'pusher' as const, position: [0, 1.0, -118], size: [2, 2, 2], speed: 1.6, range: 3.5 },
        { type: 'lift' as const, position: [0, 0.6, -162], size: [2.2, 0.6, 3], speed: 1.0, range: 2.0 },
    ]), []);

    const gates: Gate[] = useMemo(() => ([
        { band: 1, z: -42 },
        { band: 2, z: -100 },
        { band: 3, z: -158 },
    ]), []);

    useEffect(() => {
        setBandActive([true, false, false, false]);
        setPaletteIndex(0);
    }, [resetToken]);

    const activateBand = (band: number) => {
        setBandActive(prev => {
            if (prev[band]) return prev;
            const next = [...prev];
            next[band] = true;
            return next;
        });
        setPaletteIndex(clampPaletteIndex(band));
    };

    const gridLines = useMemo(() => {
        const points: THREE.Vector3[] = [];
        const span = 12;
        for (let i = -2; i <= 2; i += 1) {
            points.push(new THREE.Vector3(i * 3, 0.02, 2));
            points.push(new THREE.Vector3(i * 3, 0.02, -SEGMENT_LENGTH * (SEGMENT_COUNT - 1) - span));
        }
        return points;
    }, []);

    const guideBeams = useMemo(() => (
        [
            { x: 5, kind: 'edge' as const },
            { x: -5, kind: 'edge' as const },
            { x: 0, kind: 'gate' as const },
        ]
    ), []);

    return (
        <>
            <color attach="background" args={[SKY_COLOR]} />

            {/* Cyber backdrop */}
            <Stars radius={180} depth={60} count={3200} factor={3.5} saturation={0} fade speed={0.5} />
            <Sparkles count={600} scale={[160, 90, 500]} size={3} speed={0.45} opacity={0.22} color={palette.edge} />
            <Sparkles count={260} position={[0, 20, -240]} scale={80} size={2.2} speed={0.6} opacity={0.28} color={palette.highlight} />

            {/* High-altitude ring to anchor the skyline */}
            <SkyRing palette={palette} position={[0, 32, -160]} />

            {/* Lighting: strong forward directionality */}
            <ambientLight intensity={0.35} color={palette.ambient} />
            <directionalLight position={[4, 10, 6]} intensity={1.4} color={palette.edge} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
            <directionalLight position={[-6, 6, 2]} intensity={0.5} color={palette.dim} />

            {/* Minimal horizon strip to imply motion */}
            <mesh position={[0, -3.2, -200]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[160, 800]} />
                <meshStandardMaterial color={palette.dim} metalness={0.05} roughness={0.95} />
            </mesh>

            {/* Vertical guide beams to reinforce direction */}
            {guideBeams.map((b, idx) => (
                <mesh key={idx} position={[b.x, 6, -120]}>
                    <cylinderGeometry args={[0.12, 0.12, 20, 12]} />
                    <meshStandardMaterial color={b.kind === 'gate' ? palette.gate : palette.edge} emissive={b.kind === 'gate' ? palette.gate : palette.edge} emissiveIntensity={0.8} roughness={0.4} metalness={0.3} />
                </mesh>
            ))}

            {/* Flying drakes across the skyline */}
            <FlyingDrake offsetZ={-210} palette={palette} speed={0.34} height={9} sway={2.5} />
            <FlyingDrake offsetZ={-260} palette={palette} speed={0.28} height={11} sway={3.5} />
            <FlyingDrake offsetZ={-300} palette={palette} speed={0.38} height={10} sway={2.8} />

            {/* Abstract light columns for spatial cadence */}
            <LightColumns palette={palette} length={340} spacing={8} />

            {/* Sparse particle ribbons flanking the track for motion depth */}
            <SideParticleStream side="left" palette={palette} count={80} length={340} />
            <SideParticleStream side="right" palette={palette} count={80} length={340} />

            {/* Longitudinal guide lines */}
            <group>
                {gridLines.map((p, idx) => (
                    idx % 2 === 0 ? (
                        <line key={idx} position={[0, 0.01, 0]}>
                            <bufferGeometry attach="geometry">
                                <bufferAttribute attach="attributes-position" args={[new Float32Array([p.x, p.y, p.z, gridLines[idx + 1].x, gridLines[idx + 1].y, gridLines[idx + 1].z]), 3]} />
                            </bufferGeometry>
                            <lineBasicMaterial color={palette.edge} linewidth={2} transparent opacity={0.25} />
                        </line>
                    ) : null
                ))}
            </group>

            {/* Segments */}
            {segments.map(seg => (
                <RunwaySegment key={seg.id} segment={seg} active={bandActive[bandIndexFor(seg.id)]} palette={palette} />
            ))}

            {/* Locked gates that drop when corresponding band is active */}
            {gates.map(g => (
                <BarrierGate key={g.z} gate={g} active={bandActive[g.band]} palette={palette} />
            ))}

            {/* Obstacles */}
            {obstacles.map((obs, idx) => (
                <MovingObstacle key={idx} type={obs.type} position={obs.position} size={obs.size} speed={obs.speed} range={obs.range} palette={palette} />
            ))}

            {/* Control nodes that reveal further bands */}
            {nodes.map(node => (
                <ActivatorNode key={node.id} node={node} onHit={activateBand} resetToken={resetToken} palette={palette} />
            ))}

            {/* Goal */}
            <GoalBeacon position={[0, 1.2, -245]} palette={palette} />

            {/* Pulsing audio-like waves */}
            <PulseWaves palette={palette} />
        </>
    );
};
