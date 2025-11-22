import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats, Loader } from '@react-three/drei';
import { Player } from './components/Player';
import { World } from './components/World';
import { GunType, GUN_CONFIGS } from './types';

export default function App() {
  const [currentGun, setCurrentGun] = useState<GunType>(GunType.JELLY);

  // Keyboard controls for weapon switching
  useEffect(() => {
    // Fix: Cast event to any to avoid 'Property key does not exist on type KeyboardEvent'
    const handleKeyDown = (e: any) => {
      if (e.key === '1') setCurrentGun(GunType.JELLY);
      if (e.key === '2') setCurrentGun(GunType.GHOST);
      if (e.key === '3') setCurrentGun(GunType.MIRROR);
    };
    // Fix: Cast window to any to avoid 'Property addEventListener does not exist on type Window'
    (window as any).addEventListener('keydown', handleKeyDown);
    return () => (window as any).removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentConfig = GUN_CONFIGS[currentGun];

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* --- 3D SCENE --- */}
      <Canvas shadows camera={{ fov: 75, position: [0, 1.7, 5] }}>
        <Suspense fallback={null}>
           <color attach="background" args={['#111']} />
           <fog attach="fog" args={['#111', 5, 30]} />
           <World />
           <Player currentGun={currentGun} onShoot={() => { /* optional sound trigger */ }} />
        </Suspense>
        {/* <Stats /> */}
      </Canvas>

      <Loader />

      {/* --- HUD OVERLAY --- */}
      
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
        <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,0.8)]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-white opacity-30 rounded-full"></div>
      </div>

      {/* Weapon Selector */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-2 pointer-events-none">
         {Object.values(GUN_CONFIGS).map((config, index) => {
             const isActive = config.type === currentGun;
             return (
                 <div 
                    key={config.type}
                    className={`
                        flex items-center gap-4 p-3 rounded-lg border transition-all duration-300
                        ${isActive ? 'bg-black/60 border-white/50 translate-x-[-10px]' : 'bg-black/20 border-transparent opacity-50'}
                    `}
                    style={{ borderColor: isActive ? config.color : 'transparent' }}
                 >
                    <div className="text-right">
                        <div className={`text-sm font-bold font-mono ${isActive ? 'text-white' : 'text-gray-400'}`}>
                           [{index + 1}] {config.name.toUpperCase()}
                        </div>
                        {isActive && (
                            <div className="text-xs text-gray-300 max-w-[200px]">
                                {config.description}
                            </div>
                        )}
                    </div>
                    <div 
                        className="w-2 h-12 rounded-full shadow-[0_0_10px_currentColor]"
                        style={{ backgroundColor: config.color, color: config.color }}
                    />
                 </div>
             )
         })}
      </div>

      {/* Controls Info */}
      <div className="absolute top-8 left-8 p-4 bg-black/40 text-white rounded font-mono text-sm pointer-events-none border-l-2 border-white/20">
        <h1 className="font-bold text-lg mb-2 tracking-widest">ALCHEMIST PROTOCOL</h1>
        <ul className="space-y-1 text-gray-300">
          <li>[W,A,S,D] Move</li>
          <li>[SPACE]   Jump</li>
          <li>[CLICK]   Shoot / Transmutate</li>
          <li>[1,2,3]   Switch Shader Module</li>
          <li>[MOUSE]   Look Aim</li>
        </ul>
        <div className="mt-4 text-xs text-gray-500">
            System Status: ONLINE<br/>
            Render: REACT-THREE-FIBER
        </div>
      </div>

      {/* Click to Start Overlay */}
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
          <div className="text-white/30 font-mono text-sm animate-pulse">
              CLICK TO ENGAGE INTERFACE
          </div>
      </div>

      {/* Vignette */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,black_100%)] opacity-60"></div>
    </div>
  );
}