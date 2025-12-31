import React from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

interface LaserPuzzleProps {
  points: THREE.Vector3[];
  solved: boolean;
}

export const LaserPuzzle: React.FC<LaserPuzzleProps> = ({ 
  points,
  solved
}) => {
  return (
    <group>
      {/* Laser Line */}
      <Line
        points={points}
        color={solved ? "#00ff00" : "#ff0000"}
        lineWidth={3}
        transparent
        opacity={0.8}
        raycast={() => null} // Disable raycasting
      />

      {/* Emitter Visual */}
      {points.length > 0 && (
        <mesh position={points[0]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={2} />
        </mesh>
      )}
    </group>
  );
};
