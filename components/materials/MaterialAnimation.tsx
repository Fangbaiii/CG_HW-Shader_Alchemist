import React, { useRef, useEffect, useCallback, useContext, createContext } from 'react';
import { useFrame } from '@react-three/fiber';

// ============================================================================
// MATERIAL ANIMATION SYSTEM
// Centralizes all animated material uTime updates into a single useFrame callback.
// This reduces N individual useFrame callbacks to just 1, significantly improving
// performance when many animated materials are in the scene.
// ============================================================================

interface AnimatedMaterialRef {
    uTime?: number;
}

interface MaterialAnimationContextType {
    register: (ref: React.RefObject<AnimatedMaterialRef>) => void;
    unregister: (ref: React.RefObject<AnimatedMaterialRef>) => void;
}

const MaterialAnimationContext = createContext<MaterialAnimationContextType | null>(null);

/**
 * Provider component that manages all animated material time updates.
 * Place this inside Canvas but outside all material-using components.
 * Uses a single useFrame to update all registered materials' uTime uniform.
 */
export const MaterialAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const materialsRef = useRef<Set<React.RefObject<AnimatedMaterialRef>>>(new Set());

    const register = useCallback((ref: React.RefObject<AnimatedMaterialRef>) => {
        materialsRef.current.add(ref);
    }, []);

    const unregister = useCallback((ref: React.RefObject<AnimatedMaterialRef>) => {
        materialsRef.current.delete(ref);
    }, []);

    // Single useFrame callback for ALL animated materials
    useFrame((state) => {
        const time = state.clock.elapsedTime;
        materialsRef.current.forEach((ref) => {
            if (ref.current && typeof ref.current.uTime !== 'undefined') {
                ref.current.uTime = time;
            }
        });
    });

    return (
        <MaterialAnimationContext.Provider value={{ register, unregister }}>
            {children}
        </MaterialAnimationContext.Provider>
    );
};

/**
 * Hook for animated materials to register for automatic uTime updates.
 * Returns a ref to attach to the material. The material's uTime uniform
 * will be updated automatically by MaterialAnimationProvider.
 * 
 * Falls back to individual useFrame if used outside MaterialAnimationProvider.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useAnimatedMaterial = <T extends any = any>(): React.RefObject<T> => {
    const context = useContext(MaterialAnimationContext);
    const materialRef = useRef<T>(null);

    // Register with context if available
    useEffect(() => {
        if (context) {
            context.register(materialRef as unknown as React.RefObject<AnimatedMaterialRef>);
            return () => context.unregister(materialRef as unknown as React.RefObject<AnimatedMaterialRef>);
        }
    }, [context]);

    // Fallback: if no provider, use individual useFrame (backwards compatible)
    useFrame((state) => {
        if (!context && materialRef.current && (materialRef.current as any).uTime !== undefined) {
            (materialRef.current as any).uTime = state.clock.elapsedTime;
        }
    });

    return materialRef;
};
