varying vec2 vUv;
varying float vDisplacement;
varying vec3 vWorldPosition;
uniform vec3 uColor1; // Hot lava
uniform vec3 uColor2; // Dark crust
uniform vec3 uColor3; // Brightest veins
uniform float uTime;
uniform sampler2D uNoiseTexture;

void main() {
  // Remap displacement to [0, 1] for color mixing
  float mixFactor = vDisplacement * 0.5 + 0.5;
  
  // === World-space UV for fragment details (breaks tiling) ===
  vec2 worldUV = vWorldPosition.xz * 0.02;
  
  // === Domain Warping for fragment details ===
  vec2 warpUV = worldUV * 0.3 + uTime * 0.008;
  float warp = texture2D(uNoiseTexture, warpUV).r;
  vec2 warpedUV = worldUV + (warp - 0.5) * 0.3;
  
  // === Multi-layer color blending ===
  // Base: dark crust to hot lava gradient
  vec3 baseColor = mix(uColor2, uColor1, smoothstep(0.2, 0.7, mixFactor));
  
  // Add bright veins where displacement is highest (reduced intensity)
  float veins = smoothstep(0.70, 0.90, mixFactor);
  baseColor = mix(baseColor, uColor3, veins * 0.4);
  
  // === Secondary detail layer with warped coordinates ===
  vec2 detailUV = warpedUV * 6.0 + vec2(uTime * 0.08, uTime * 0.06);
  float detailNoise = texture2D(uNoiseTexture, detailUV).r;
  
  // === Cooling cracks pattern (Voronoi-like) ===
  vec2 crackUV = warpedUV * 3.0;
  float crackNoise1 = texture2D(uNoiseTexture, crackUV + uTime * 0.02).r;
  float crackNoise2 = texture2D(uNoiseTexture, crackUV * 1.7 + 0.5 - uTime * 0.015).r;
  // Create crack-like edges by finding steep gradients
  float cracks = abs(crackNoise1 - crackNoise2);
  cracks = smoothstep(0.0, 0.15, cracks) * smoothstep(0.4, 0.2, cracks);
  
  // Hot cracks glow through the cooled surface (reduced brightness)
  float hotCracks = smoothstep(0.65, 0.90, detailNoise) * smoothstep(0.30, 0.55, mixFactor);
  hotCracks += cracks * smoothstep(0.35, 0.65, mixFactor) * 0.5;
  baseColor += vec3(0.9, 0.4, 0.05) * hotCracks * 0.35;
  
  // === Pulsing glow effect ===
  float pulse = sin(uTime * 1.2 + vWorldPosition.x * 0.1) * 0.5 + 0.5;
  float glowIntensity = mixFactor * 0.12 * pulse;
  baseColor += uColor1 * glowIntensity;
  
  // === Edge darkening (cooled crust at surface edges) ===
  float edgeDark = 1.0 - smoothstep(0.0, 0.18, mixFactor);
  baseColor = mix(baseColor, uColor2 * 0.4, edgeDark * 0.4);
  
  // === Subtle color variation based on world position ===
  float colorVar = texture2D(uNoiseTexture, worldUV * 0.1).r;
  baseColor = mix(baseColor, baseColor * vec3(1.1, 0.9, 0.8), colorVar * 0.15);
  
  // === Emissive boost for HDR/Bloom compatibility (reduced for darker look) ===
  float emissiveBoost = smoothstep(0.6, 0.95, mixFactor) * 0.20;
  baseColor *= 1.0 + emissiveBoost;

  // === Edge fog: fade to fog color at distant edges ===
  // 边缘雾化：仅在远处边缘淡出到雾色，不影响近景
  vec3 fogColor = vec3(0.29, 0.07, 0.03); // #4a1208 深红褐色雾
  float horizontalDist = length(vWorldPosition.xz); // 水平距离（忽略高度）
  float fogStart = 30.0;  // 开始雾化的距离
  float fogEnd = 100.0;   // 完全雾化的距离
  float fogFactor = smoothstep(fogStart, fogEnd, horizontalDist);
  baseColor = mix(baseColor, fogColor, fogFactor);

  gl_FragColor = vec4(baseColor, 1.0);
}
