varying vec2 vUv;
varying float vDisplacement;
varying vec3 vWorldPosition;
uniform float uTime;
uniform sampler2D uNoiseTexture;

void main() {
  vUv = uv;
  
  // === DOMAIN WARPING: Use noise to distort sampling coordinates ===
  // This breaks visible tiling patterns by making the UV non-uniform
  
  // Step 1: Get world-space coordinates for large-scale variation
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vec2 worldUV = worldPos.xz * 0.02; // Scale world coords to texture space
  
  // Step 2: First warp layer - distorts all subsequent samples (SLOWER)
  vec2 warpUV = worldUV * 0.5 + uTime * 0.004;
  float warp1 = texture2D(uNoiseTexture, warpUV).r;
  float warp2 = texture2D(uNoiseTexture, warpUV + 0.5).r;
  vec2 warpOffset = vec2(warp1, warp2) * 0.5 - 0.25; // Larger warp range
  
  // Step 3: Apply warp to create distorted base UV
  vec2 warpedWorldUV = worldUV + warpOffset;
  
  // === Multi-scale noise with SLOWER flow speeds ===
  // Layer 1: Large slow swirls (radial-ish flow) - SLOWER
  float angle1 = atan(worldPos.z + 20.0, worldPos.x) * 0.3;
  vec2 flowUV1 = warpedWorldUV * 1.5 + vec2(
    cos(angle1) * uTime * 0.012,
    sin(angle1) * uTime * 0.015
  );
  float noise1 = texture2D(uNoiseTexture, flowUV1).r;
  
  // Layer 2: Medium flow (diagonal) - SLOWER
  vec2 flowUV2 = warpedWorldUV * 3.0 + vec2(uTime * 0.02, -uTime * 0.025);
  flowUV2 += vec2(noise1 * 0.12, noise1 * 0.08);
  float noise2 = texture2D(uNoiseTexture, flowUV2).r;
  
  // Layer 3: Fine detail layer - MUCH SLOWER, less weight
  vec2 flowUV3 = warpedWorldUV * 6.0 + vec2(-uTime * 0.03, uTime * 0.02);
  flowUV3 += vec2(noise2 * 0.05);
  float noise3 = texture2D(uNoiseTexture, flowUV3).r;
  
  // Layer 4: Extra-large undulation (dominant, very slow)
  vec2 flowUV4 = worldUV * 0.6 + vec2(uTime * 0.006, uTime * 0.008);
  float noise4 = texture2D(uNoiseTexture, flowUV4).r;
  
  // Combine: MUCH heavier weight on large-scale, minimal jitter
  float combinedNoise = noise4 * 0.45 + noise1 * 0.35 + noise2 * 0.15 + noise3 * 0.05;
  
  // Remap from [0,1] to [-1,1] for displacement
  vDisplacement = combinedNoise * 2.0 - 1.0;
  
  // Vertex displacement for 3D wave geometry - LARGER amplitude
  vec3 newPos = position;
  newPos.z += vDisplacement * 2.5;
  
  vWorldPosition = (modelMatrix * vec4(newPos, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
}
