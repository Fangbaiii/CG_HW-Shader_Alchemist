export enum GunType {
  JELLY = 'JELLY',
  GHOST = 'GHOST',
  MIRROR = 'MIRROR',
}

export interface GunConfig {
  type: GunType;
  name: string;
  color: string; // Hex for UI
  emissive: string; // For 3D glow
  description: string;
}

export const GUN_CONFIGS: Record<GunType, GunConfig> = {
  [GunType.JELLY]: {
    type: GunType.JELLY,
    name: "Bio-Slime Injector",
    color: "#28b30fff",
    emissive: "#00FF00",
    description: "Makes objects bouncy and fluid."
  },
  [GunType.GHOST]: {
    type: GunType.GHOST,
    name: "Phase Shift Emitter",
    color: "#00FFFF",
    emissive: "#00FFFF",
    description: "Turns matter into intangible holograms."
  },
  [GunType.MIRROR]: {
    type: GunType.MIRROR,
    name: "Chrome Plater",
    color: "#C0C0C0",
    emissive: "#FFFFFF",
    description: "Transforms surfaces into perfect reflectors."
  }
};

// Fix for missing JSX Intrinsic Elements in the test environment
declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: any;
      group: any;
      boxGeometry: any;
      cylinderGeometry: any;
      planeGeometry: any;
      torusGeometry: any;
      tubeGeometry: any;
      meshStandardMaterial: any;
      meshPhysicalMaterial: any;
      meshBasicMaterial: any;
      ambientLight: any;
      pointLight: any;
      color: any;
      fog: any;
    }
  }
}