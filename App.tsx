import React, { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import * as THREE from 'three';
import { ErrorBoundary } from '@/components/core/ErrorBoundary';
import { Player } from '@/components/entities/Player';
import { World } from '@/components/scenes/GameScene';
import { GunType, GunConfig, GUN_CONFIGS } from '@/types';
import { JellyBullet } from '@/components/entities/JellyBullet';
import { GhostBullet } from '@/components/entities/GhostBullet';
import { MirrorBullet } from '@/components/entities/MirrorBullet';
import { MaterialAnimationProvider } from '@/components/materials';

const STAGES = [
  {
    code: '01',
    title: 'Molten Hopscotch',
    detail: 'Transmutate floating ruins into jelly trampolines and cross the magma void.',
    spawn: new THREE.Vector3(0, 1.7, 8),
    goalZ: -68,
  },
  {
    code: '02',
    title: 'Phase Crucible',
    detail: 'Ghost the gate bricks to slip through sealed corridors and vertical shafts.',
    spawn: new THREE.Vector3(0, 1.8, 0),
    goalZ: -44,
  },
  {
    code: '03',
    title: 'Mirror Spire',
    detail: 'Chrome the launch pads to harvest forward boosts and climb the prism tower.',
    spawn: new THREE.Vector3(0, 1.9, 4),
    goalZ: -46,
  },
] as const;

type StageTransition = {
  type: 'stage' | 'final';
  from: number;
  to: number;
};

interface Bullet {
  id: number;
  type: GunType;
  origin: THREE.Vector3;
  direction: THREE.Vector3;
}

export default function App() {
  const [currentGun, setCurrentGun] = useState<GunType>(GunType.JELLY);
  const [isInfoExpanded, setIsInfoExpanded] = useState(true);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [deathCount, setDeathCount] = useState(0);
  const [deathBanner, setDeathBanner] = useState<'lava' | 'void' | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [transitionInfo, setTransitionInfo] = useState<StageTransition | null>(null);
  const [resetToken, setResetToken] = useState(0);

  const currentStage = STAGES[stageIndex];

  const handleShoot = (origin: THREE.Vector3, direction: THREE.Vector3) => {
    // All guns now use projectiles
    const id = Date.now() + Math.random();
    setBullets(prev => [...prev, { id, type: currentGun, origin, direction }]);
  };

  const removeBullet = (id: number) => {
    setBullets(prev => prev.filter(b => b.id !== id));
  };

  const handleDeath = (reason: 'lava' | 'void') => {
    setDeathCount(prev => prev + 1);
    setDeathBanner(reason);
    setResetToken(token => token + 1);
  };

  useEffect(() => {
    if (!deathBanner) return;
    const timeout = setTimeout(() => setDeathBanner(null), 1500);
    return () => clearTimeout(timeout);
  }, [deathBanner]);

  const handleStageComplete = () => {
    const from = stageIndex;
    const to = (stageIndex + 1) % STAGES.length;
    const isFinal = from === STAGES.length - 1;
    setTransitionInfo({ type: isFinal ? 'final' : 'stage', from, to });
    setResetToken(token => token + 1);

    const duration = isFinal ? 2800 : 1600;
    setTimeout(() => {
      setTransitionInfo(null);
      setStageIndex(to);
    }, duration);
  };

  // Keyboard controls for weapon switching
  useEffect(() => {
    const handleKeyDown = (e: any) => {
      if (e.key === '1') setCurrentGun(GunType.JELLY);
      if (e.key === '2') setCurrentGun(GunType.GHOST);
      if (e.key === '3') setCurrentGun(GunType.MIRROR);

      // Developer Tools: Level Skipping
      if (e.key === ']') {
        setStageIndex((prev) => (prev + 1) % STAGES.length);
        setResetToken((t) => t + 1);
      }
      if (e.key === '[') {
        setStageIndex((prev) => (prev - 1 + STAGES.length) % STAGES.length);
        setResetToken((t) => t + 1);
      }
    };
    (window as any).addEventListener('keydown', handleKeyDown);
    return () => (window as any).removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* --- 3D SCENE --- */}
      <ErrorBoundary>
        <Canvas shadows dpr={[1, 1.5]} camera={{ fov: 75, position: [0, 1.7, 5] }}>
          <Suspense fallback={null}>
            <MaterialAnimationProvider>
              <World resetToken={resetToken} stageIndex={stageIndex} />
              <Player
                currentGun={currentGun}
                onShoot={handleShoot}
                onDeath={handleDeath}
                onStageComplete={handleStageComplete}
                spawnPoint={currentStage.spawn}
                goalZ={currentStage.goalZ}
                stageId={stageIndex}
                isFrozen={Boolean(transitionInfo)}
              />
              {bullets.map(b => {
                if (b.type === GunType.JELLY) {
                  return (
                    <JellyBullet
                      key={b.id}
                      position={b.origin}
                      direction={b.direction}
                      onHit={() => removeBullet(b.id)}
                    />
                  );
                } else if (b.type === GunType.GHOST) {
                  return (
                    <GhostBullet
                      key={b.id}
                      position={b.origin}
                      direction={b.direction}
                      onHit={() => removeBullet(b.id)}
                    />
                  );
                } else if (b.type === GunType.MIRROR) {
                  return (
                    <MirrorBullet
                      key={b.id}
                      position={b.origin}
                      direction={b.direction}
                      onHit={() => removeBullet(b.id)}
                    />
                  );
                }
                return null;
              })}
            </MaterialAnimationProvider>
          </Suspense>
        </Canvas>
      </ErrorBoundary>

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
              <li><span className="text-cyan-400">[VOID/LAVA]</span> Fatal fall</li>
              <li className="pt-1 mt-1 border-t border-white/10 text-yellow-500/80"><span className="text-yellow-400">[ [ / ] ]</span>   Dev: Skip Level</li>
            </ul>
            <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-gray-500">
              Sys: ONLINE<br />
              Mode: EXPERIMENTAL<br />
              Failsafe: Checkpoint respawn
            </div>
          </div>
        )}
      </div>

      {/* Level Briefing */}
      <div className="absolute top-6 right-6 text-white pointer-events-none w-64">
        <div className="bg-black/55 backdrop-blur-sm border border-white/10 rounded-lg p-4">
          <div className="text-[11px] tracking-[0.3em] text-gray-400 font-mono mb-3">LEVEL BRIEFING</div>
          <div className="space-y-3">
            {STAGES.map((stage, index) => (
              <div
                key={stage.code}
                className={`border-l-2 pl-3 transition-colors ${index === stageIndex ? 'border-cyan-400' : 'border-white/15'}`}
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className={` ${index === stageIndex ? 'text-cyan-300' : 'text-gray-500'}`}>{stage.code}</span>
                  <span className="text-gray-400">{stage.title}</span>
                </div>
                <p className="text-[11px] text-gray-300 leading-snug mt-1">
                  {stage.detail}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 text-[11px] text-gray-400 text-right font-mono">
            Fatalities logged: {deathCount}
          </div>
        </div>
      </div>

      {deathBanner && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 border border-red-400/40 px-8 py-5 rounded-lg text-center font-mono text-white shadow-[0_0_25px_rgba(255,0,0,0.3)]">
            <div className="text-red-400 tracking-[0.4em] text-xs">
              {deathBanner === 'lava' ? 'THERMAL FAILURE' : 'VOID BREACH'}
            </div>
            <div className="text-lg font-semibold mt-2">
              {deathBanner === 'lava' ? 'Core temperature exceeded.' : 'Trajectory left safe volume.'}
            </div>
            <div className="text-[11px] text-gray-300 mt-1">
              Reinitializing clone at stage entry point...
            </div>
          </div>
        </div>
      )}

      {transitionInfo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[100]">
          <div className="relative overflow-hidden bg-black/80 border-y-2 border-cyan-400/60 px-16 py-12 text-center font-mono text-white shadow-[0_0_50px_rgba(0,255,255,0.3)] backdrop-blur-md animate-in fade-in zoom-in duration-500">

            {/* Background Glitch Effect */}
            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#00ffff_10px,#00ffff_11px)]"></div>

            {/* Main Title */}
            <div className="relative z-10">
              <div className="text-cyan-300 tracking-[0.5em] text-sm mb-4 animate-pulse">
                {transitionInfo.type === 'final' ? 'SYSTEM: SIMULATION_END' : 'SYSTEM: CHECKPOINT_REACHED'}
              </div>

              <div className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-cyan-200 drop-shadow-[0_0_10px_rgba(0,255,255,0.8)]">
                {transitionInfo.type === 'final' ? '试炼完成' : '关卡通过'}
              </div>

              <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent my-4 opacity-50"></div>

              <div className="text-lg text-cyan-100 font-light tracking-widest">
                {transitionInfo.type === 'final'
                  ? '恭喜！你已掌握所有炼金术式。'
                  : `正在建立神经链接... 目标：${STAGES[transitionInfo.to].code} 区`
                }
              </div>

              {transitionInfo.type !== 'final' && (
                <div className="mt-6 text-xs text-gray-400 animate-bounce">
                  加载下一区域数据...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click to Start Overlay */}
      {/* <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
          <div className="text-white/20 font-mono text-xs animate-pulse tracking-widest">
              CLICK TO ENGAGE NEURAL LINK
          </div>
      </div> */}

      {/* Vignette */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.8)_100%)]"></div>
    </div>
  );
}