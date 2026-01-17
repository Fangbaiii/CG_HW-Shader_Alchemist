import React, {  useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line, Text, Html, Stars } from '@react-three/drei';

// --- Morphing Geometry Component ---
const GeometricEvolution = () => {
  const lineRef = useRef<any>(null);
  
  // Create geometry points
  // We need enough points to represent a smooth circle and sharp polygon
  const numPoints = 128;
  
  const startTimeRef = useRef<number | null>(null);

  useFrame((state) => {
    if (!lineRef.current) return;
    if (startTimeRef.current === null) startTimeRef.current = state.clock.elapsedTime;
    const time = state.clock.elapsedTime - startTimeRef.current;
    // Animation Phases:
    // 0-2s: Point expansion to Circle
    // 2-5s: Circle to Polygon (Hexagon)
    // 5-8s: Polygon to 3D Cube Projection (Perspective shift)
    // 8s+: Stabilization / Rotation
    
    // Normalize time for simpler phase handling (clamped)
    const t = time; 

    const points: THREE.Vector3[] = [];
    
    // --- Phase calculation ---
    // 1. Expansion (0 -> 1)
    const expansion = THREE.MathUtils.smoothstep(t, 0.5, 2.0);
    
    // 2. Polygon Morph (0 -> 1)
    const morph = THREE.MathUtils.smoothstep(t, 2.5, 4.5);
    
    // 3. 3D Rotation / Perspective (0 -> 1)
    const rotation3D = THREE.MathUtils.smoothstep(t, 5.0, 7.0);
    
    // Base Rotation (Slowly spinning)
    const baseRotation = t * 0.2;

    const radius = 3 * expansion;

    for (let i = 0; i <= numPoints; i++) {
        // Normalized index 0..1
        const u = i / numPoints;
        const angle = u * Math.PI * 2 + baseRotation;
        
        // --- Shape 1: Circle ---
        const circleX = Math.cos(angle) * radius;
        const circleY = Math.sin(angle) * radius;
        const circleZ = 0;
        
        // --- Shape 2: Hexagon ---
        // We can approximate a polygon by quantizing the angle
        const sides = 6;
        const segmentAngle = (Math.PI * 2) / sides;
        // Snap angle to nearest segment vertex for interpolation
        // Standard polygon formula
        // r = r0 * cos(pi/n) / cos(a - 2pi/n * floor((n*a + pi)/2pi)) ??
        // Simpler way: lerp between circle coords and polygon vertex coords?
        // Let's calculate polygon radius at this angle
        // Current angle within the segment sector
        const sector = Math.floor(u * sides);
        const sectorProgress = (u * sides) - sector;
        
        // Vertices of the hexagon
        const v1Angle = sector * segmentAngle + baseRotation;
        const v2Angle = (sector + 1) * segmentAngle + baseRotation;
        
        const v1x = Math.cos(v1Angle) * radius;
        const v1y = Math.sin(v1Angle) * radius;
        const v2x = Math.cos(v2Angle) * radius;
        const v2y = Math.sin(v2Angle) * radius;
        
        // Linear interpolation between vertices for flat edges
        const polyX = THREE.MathUtils.lerp(v1x, v2x, sectorProgress);
        const polyY = THREE.MathUtils.lerp(v1y, v2y, sectorProgress);
        const polyZ = 0;
        
        // Morph: Circle -> Polygon
        let x = THREE.MathUtils.lerp(circleX, polyX, morph);
        let y = THREE.MathUtils.lerp(circleY, polyY, morph);
        let z = THREE.MathUtils.lerp(circleZ, polyZ, morph);
        
        // --- Shape 3: 3D Projection (Cube-like Wireframe) ---
        // Actually, transforming a flat hexagon into a 3D isometric cube structure is visually cool
        // Or we can just rotate the hexagon in 3D to look like a ring/gyro
        // Let's rotate the flat shape based on phase 3 to give it depth
        if (rotation3D > 0) {
           const rotX = rotation3D * Math.PI * 0.3; // Tilt back
           const rotY = t * 0.5; // Spin faster
           
           // Apply rotation manually or via matrix? simple manual for points
           // Rotate around X
           const y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
           const z1 = y * Math.sin(rotX) + z * Math.cos(rotX);
           y = y1;
           z = z1;
           
           // If we wanted to morph to a cube, we'd need different topology (lines connecting vertices)
           // But user asked for "geometry projection evolution". 
           // Spinning a hexagon in 3D creates a nice kinetic sculpture.
        }

        points.push(new THREE.Vector3(x, y, z));
    }
    
    // Rebuild geometry each frame to avoid buffer size warnings when point count changes
    const geom = new THREE.BufferGeometry();
    geom.setFromPoints(points);
    lineRef.current.geometry.dispose();
    lineRef.current.geometry = geom;
  });

  return (
    <group>
        {/* Glow Halo */}
        <mesh>
            <planeGeometry args={[15, 15]} />
            <meshBasicMaterial color="#000000" transparent opacity={0.1} depthWrite={false} />
        </mesh>
        
        {/* The Evolving Line */}
        <Line 
          ref={lineRef}
          points={[[0, 0, 0], [0, 0, 0]]}
          color="#00ffff"
          lineWidth={3}
          transparent
          opacity={0.8}
        />
        
        {/* Central Glow Point (Initial state) */}
        <mesh scale={[0.2, 0.2, 0.2]}>
            <sphereGeometry />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
    </group>
  );
};

// --- Text Reveal Component ---
const AnimatedText = () => {
    const textGroup = useRef<THREE.Group>(null);
    
    useFrame((state) => {
        if (!textGroup.current) return;
        const t = state.clock.elapsedTime;
        // Start showing text after shape forms (approx 4s)
        const reveal = THREE.MathUtils.smoothstep(t, 4.0, 6.0);
        
        textGroup.current.position.y = -4 + reveal * 1; // Slide up
        
        // Opacity hack for Drei Text? 
        // Drei Text color can be animated
        const material = (textGroup.current.children[0] as any).material;
        if(material) {
            material.opacity = reveal;
            material.transparent = true;
        }
    });

    return (
        <group ref={textGroup} position={[0, -5, 0]}>
            <Text
              fontSize={1}
              color="#00ffff"
              anchorX="center"
              anchorY="middle"
              // Removed remote font to avoid loading failures; will use default Drei font
            >
                LEVEL COMPLETE
            </Text>
        </group>
    );
};

export const LevelCompleteScreen = () => {
  return (
    <>
      <color attach="background" args={['#000000']} />
      <Stars radius={120} depth={80} count={3000} factor={3} fade speed={0.6} />
      
      {/* Cinematic Camera */}
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 0, 6]} intensity={2} color="#00ffff" />
      <pointLight position={[0, 0, -6]} intensity={1} color="#ff00aa" />
      
      <GeometricEvolution />
      <AnimatedText />

      {/* HUD overlay to ensure visible text even if 3D is off-screen */}
      <Html center style={{ color: '#00ffff', fontFamily: 'monospace', letterSpacing: '0.2em', fontSize: '18px' }}>
        LEVEL COMPLETE
      </Html>
      
      {/* Post-processing-like Glow via additive sprites or just standard bloom if we had PP */}
      {/* Adding a simple background grid that fades out for depth */}
      <gridHelper args={[50, 50, "#111", "#050505"]} rotation={[Math.PI/2, 0, 0]} position={[0, 0, -5]} />
    </>
  );
};
