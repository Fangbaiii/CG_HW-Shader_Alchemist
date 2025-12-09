import React from 'react';
import { Html } from '@react-three/drei';

interface SignboardProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  title: string;
  content: string[];
}

export const Signboard: React.FC<SignboardProps> = ({ position, rotation = [0, 0, 0], title, content }) => {
  return (
    <group position={position} rotation={rotation}>
      {/* The Board (Visual backing) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[3, 2, 0.1]} />
        <meshStandardMaterial color="#1a1a1a" transparent opacity={0.8} />
      </mesh>

      {/* HTML Content */}
      <Html 
        transform 
        position={[0, 0, 0.06]} 
        style={{ 
            width: '300px', 
            height: '200px', 
            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
            padding: '20px',
            borderRadius: '10px',
            border: '2px solid #00ffff',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'monospace',
            userSelect: 'none',
            pointerEvents: 'none'
        }}
      >
        <h1 style={{ color: '#00ffff', fontSize: '24px', marginBottom: '10px', fontWeight: 'bold', textAlign: 'center' }}>{title}</h1>
        <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#ccc' }}>
            {content.map((line, i) => (
                <div key={i}>{line}</div>
            ))}
        </div>
      </Html>
    </group>
  );
};
