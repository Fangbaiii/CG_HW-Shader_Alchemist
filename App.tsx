import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats, Loader } from '@react-three/drei';
import { Player } from './components/Player';
import { World } from './components/World';
import { GunType, GUN_CONFIGS } from './types';

export default function App() {
  const [currentGun, setCurrentGun] = useState<GunType>(GunType.JELLY);
  const [isInfoExpanded, setIsInfoExpanded] = useState(true);

  // Keyboard controls for weapon switching
  useEffect(() => {
    const handleKeyDown = (e: any) => {
      if (e.key === '1') setCurrentGun(GunType.JELLY);
      if (e.key === '2') setCurrentGun(GunType.GHOST);
      if (e.key === '3') setCurrentGun(GunType.MIRROR);
    };
    (window as any).addEventListener('keydown', handleKeyDown);
    return () => (window as any).removeEventListener('keydown', handleKeyDown);
  }, []);

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
      </Canvas>

      <Loader />

      {/* --- HUD OVERLAY --- */}
      
      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
        <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_4px_rgba(255,255,255,1)]"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 border border-white/40 rounded-full"></div>
      </div>

      {/* Weapon Selector - Moved to Bottom Left & Scaled Down */}
      <div className="absolute bottom-8 left-8 flex flex-col gap-2 pointer-events-none origin-bottom-left scale-90">
         {Object.values(GUN_CONFIGS).map((config, index) => {
             const isActive = config.type === currentGun;
             return (
                 <div 
                    key={config.type}
                    className={`
                        flex items-center gap-3 p-2 rounded-lg border transition-all duration-300
                        ${isActive ? 'bg-black/80 border-white/40 translate-x-2' : 'bg-black/40 border-transparent opacity-60'}
                    `}
                    style={{ borderColor: isActive ? config.color : 'transparent', borderLeftWidth: isActive ? '4px' : '0px' }}
                 >
                    {/* Color Indicator Bar */}
                     <div 
                        className="w-1 h-8 rounded-full shadow-[0_0_8px_currentColor]"
                        style={{ backgroundColor: config.color, color: config.color }}
                    />
                    
                    <div>
                        <div className={`text-xs font-bold font-mono ${isActive ? 'text-white' : 'text-gray-400'}`}>
                           [{index + 1}] {config.name.toUpperCase()}
                        </div>
                        {isActive && (
                            <div className="text-[10px] text-gray-300 max-w-[180px] leading-tight mt-1">
                                {config.description}
                            </div>
                        )}
                    </div>
                 </div>
             )
         })}
      </div>

      {/* Controls Info - Collapsible */}
      <div className="absolute top-6 left-6 pointer-events-auto">
        <div 
            className="bg-black/60 text-white rounded-t border-l-2 border-white/30 p-2 px-3 cursor-pointer hover:bg-black/80 transition-colors flex items-center gap-2 select-none"
            onClick={() => setIsInfoExpanded(!isInfoExpanded)}
        >
            <span className="text-xs font-mono text-cyan-400">
                {isInfoExpanded ? '[-]' : '[+]'}
            </span>
            <h1 className="font-bold text-sm tracking-widest font-mono">ALCHEMIST PROTOCOL</h1>
        </div>
        
        {isInfoExpanded && (
            <div className="bg-black/50 backdrop-blur-sm text-white rounded-b border-l-2 border-white/10 p-4 pt-2 font-mono text-xs transition-all">
                <ul className="space-y-1.5 text-gray-300">
                <li><span className="text-cyan-400">[W,A,S,D]</span> Move</li>
                <li><span className="text-cyan-400">[SPACE]</span>   Jump</li>
                <li><span className="text-cyan-400">[CLICK]</span>   Transmutate</li>
                <li><span className="text-cyan-400">[1,2,3]</span>   Switch Module</li>
                </ul>
                <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-gray-500">
                    Sys: ONLINE<br/>
                    Mode: EXPERIMENTAL
                </div>
            </div>
        )}
      </div>

      {/* Click to Start Overlay */}
      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
          <div className="text-white/20 font-mono text-xs animate-pulse tracking-widest">
              CLICK TO ENGAGE NEURAL LINK
          </div>
      </div>

      {/* Vignette */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)]"></div>
    </div>
  );
}