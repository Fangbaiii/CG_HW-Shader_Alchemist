import React, { useState, useEffect, useMemo } from 'react';
import { VolcanoWorld } from './VolcanoWorld';
import { CrystalWorld } from './CrystalWorld';
import { MirrorWorld } from '@/components/scenes/MirrorWorld';
import { VolcanoPostProcessing, CrystalPostProcessing, MirrorPostProcessing } from '@/components/core/PostProcessing';

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
        <CrystalWorld resetToken={resetToken} />
        <CrystalPostProcessing />
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
