import React from 'react';
import { Grid, Environment } from '@react-three/drei';
import { LabObject } from './LabObject';

export const World: React.FC = () => {
  return (
    <>
      <Environment preset="city" />
      
      {/* Ambient light for base visibility */}
      <ambientLight intensity={0.4} />
      {/* Main Light */}
      <pointLight position={[10, 10, 10]} intensity={1} castShadow />

      {/* Floor */}
      <Grid 
        args={[100, 100]} 
        cellSize={1} 
        cellThickness={1} 
        cellColor="#444" 
        sectionSize={5} 
        sectionThickness={1.5}
        sectionColor="#666" 
        fadeDistance={30} 
        infiniteGrid 
        position={[0, 0, 0]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
      </mesh>

      {/* Walls / Obstacles */}
      <LabObject position={[0, 0.75, -5]} />
      <LabObject position={[-2, 0.75, -7]} />
      <LabObject position={[2, 0.75, -7]} />
      
      <LabObject position={[-1, 2.25, -7]} />
      
      {/* A tall wall blocking path */}
      <group position={[0, 2, -15]}>
          <LabObject position={[-1.5, 0, 0]} />
          <LabObject position={[0, 0, 0]} />
          <LabObject position={[1.5, 0, 0]} />
          <LabObject position={[-1.5, 1.5, 0]} />
          <LabObject position={[0, 1.5, 0]} />
          <LabObject position={[1.5, 1.5, 0]} />
      </group>

      {/* Floating platforms */}
      <LabObject position={[5, 1, 0]} />
      <LabObject position={[7, 2, 2]} />
      <LabObject position={[9, 3, 0]} />

    </>
  );
};