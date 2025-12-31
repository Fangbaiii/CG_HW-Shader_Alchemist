import React, { useState, useEffect, useMemo } from 'react';
import { VolcanoWorld } from './VolcanoWorld';
import { GhostWorld } from './GhostWorld';
import { MirrorWorld } from '@/components/scenes/MirrorWorld';
import { VolcanoPostProcessing, GhostPostProcessing, MirrorPostProcessing } from '@/components/core/PostProcessing';

interface WorldProps {
  resetToken: number;
  stageIndex: number;
}

export const World: React.FC<WorldProps> = ({ resetToken, stageIndex }) => {
  if (stageIndex === 0) {
    return (
      <>
        <VolcanoWorld resetToken={resetToken} />
        <VolcanoPostProcessing />
      </>
    );
  }
  if (stageIndex === 1) {
    return (
      <>
        <GhostWorld resetToken={resetToken} />
        <GhostPostProcessing />
      </>
    );
  }
  return (
    <>
      <MirrorWorld resetToken={resetToken} />
      <MirrorPostProcessing />
    </>
  );
};
