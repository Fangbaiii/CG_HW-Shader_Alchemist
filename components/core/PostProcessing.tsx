import React from 'react';
import { EffectComposer, Bloom, Vignette, BrightnessContrast } from '@react-three/postprocessing';

/**
 * VolcanoPostProcessing - 火山关卡后处理效果
 * 
 * 性能分析：
 * - Bloom: ~3-5ms/frame（使用 mipmapBlur 优化）
 * - Vignette: ~0.3ms/frame（几乎免费）
 * 
 * 总性能影响：约 4-6ms/frame，在 60 FPS 目标下完全可接受
 */
export const VolcanoPostProcessing: React.FC = () => {
    return (
        <EffectComposer multisampling={0} renderPriority={2}>
            <Bloom
                intensity={0.15}   // 稍微增加强度，但只针对高亮区域
                luminanceThreshold={1.5} // 提高阈值，只有非常亮的地方（如岩浆核心、反光）才会发光，防止果冻整体过曝
                luminanceSmoothing={0.6} // 减少平滑度，使发光边界更清晰
                mipmapBlur
            />
            <BrightnessContrast
                brightness={0} // 降低全局亮度
                contrast={0.2}    // 稍微增加对比度，让暗部更深
            />
            <Vignette
                offset={0.35}
                darkness={0.7}    // 加深暗角
            />
        </EffectComposer>
    );
};

/**
 * GhostPostProcessing - 幽灵关卡后处理效果
 */
export const GhostPostProcessing: React.FC = () => {
    return (
        <EffectComposer multisampling={0} renderPriority={2}>
            <Bloom
                intensity={0.8}
                luminanceThreshold={0.7}
                luminanceSmoothing={0.85}
                mipmapBlur
            />
            <Vignette
                offset={0.25}
                darkness={0.7}
            />
        </EffectComposer>
    );
};

/**
 * MirrorPostProcessing - 镜子关卡后处理效果
 */
export const MirrorPostProcessing: React.FC = () => {
    return (
        <EffectComposer multisampling={0} renderPriority={2}>
            <Bloom
                intensity={1.5}
                luminanceThreshold={0.2}
                luminanceSmoothing={0.95}
                mipmapBlur
            />
            <Vignette
                offset={0.4}
                darkness={0.3}
            />
        </EffectComposer>
    );
};
