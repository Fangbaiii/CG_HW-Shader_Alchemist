varying vec3 vPosition;
varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform float uTime;
uniform sampler2D uNoiseTexture;
uniform float uVolcanoHeight;
uniform float uVolcanoTopRadius;
uniform float uVolcanoBottomRadius;
uniform vec3 uRockColor;
uniform vec3 uLavaColor1;
uniform vec3 uLavaColor2;

// Simple noise function for edge details
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  // === 1. COORDINATE SYSTEM ===
  // Convert to cylindrical coordinates
  float angle = atan(vPosition.z, vPosition.x);  // -π to π
  float height = vPosition.y;
  
  // Normalized height factor (0 at bottom, 1 at top)
  float heightNorm = clamp(height / uVolcanoHeight, 0.0, 1.0);
  
  // === 2. BASE ROCK COLOR ===
  float rockNoise = texture2D(uNoiseTexture, vPosition.xz * 0.05).r;
  vec3 rockColor = mix(uRockColor * 0.8, uRockColor * 1.2, rockNoise);
  
  // === 3. PROGRAMMATIC LAVA FLOWS (Natural Vertical Flow) ===
  float lavaFlow = 0.0;
  
  // Domain warping for natural meandering path
  // We distort the angle based on height to make the path wiggle down
  float wiggle = texture2D(uNoiseTexture, vec2(height * 0.05, uTime * 0.01)).r;
  float distortedAngle = angle + (wiggle - 0.5) * 0.5 * (1.1 - heightNorm); // More wiggle at bottom
  
  // Define specific angles for lava streams (e.g., 3 streams)
  // Stream 1 at 0 radians
  float stream1Dist = abs(distortedAngle - 0.0);
  float stream1 = smoothstep(0.2, 0.05, stream1Dist); // Width ~0.4 radians
  
  // Stream 2 at ~2.1 radians (120 deg)
  float stream2Dist = abs(distortedAngle - 2.1);
  float stream2 = smoothstep(0.15, 0.05, stream2Dist);
  
  // Stream 3 at ~-2.1 radians (-120 deg)
  float stream3Dist = abs(distortedAngle + 2.1);
  float stream3 = smoothstep(0.18, 0.05, stream3Dist);
  
  // Combine streams
  lavaFlow = max(max(stream1, stream2), stream3);
  
  // Height Masking:
  // Start below the top loop (leaving a rim) and flow down
  float topMask = smoothstep(uVolcanoHeight - 0.5, uVolcanoHeight - 3.0, height);
  // Fade out at the very bottom
  float bottomMask = smoothstep(-2.0, 1.0, height);
  lavaFlow *= topMask * bottomMask;
  
  // Edge erosion noise
  float edgeNoise = texture2D(uNoiseTexture, vec2(angle * 3.0, height * 0.2 - uTime * 0.05)).r;
  lavaFlow *= smoothstep(0.2, 0.8, edgeNoise + lavaFlow * 0.6); // Erode edges
  
  // === 4. LAVA APPEARANCE ===
  // Flowing texture animation inside the lava
  float flowAnim = texture2D(uNoiseTexture, vec2(angle * 4.0, height * 0.2 + uTime * 0.1)).r;
  
  // Hotter in the center of the flow
  float centerHeat = smoothstep(0.0, 0.8, lavaFlow); 
  vec3 baseLavaColor = mix(uLavaColor1, uLavaColor2, flowAnim);
  vec3 lavaColor = mix(baseLavaColor, vec3(1.0, 0.8, 0.4), centerHeat * flowAnim * 0.5);
  
  // Pulsing glow
  float pulse = 0.8 + 0.2 * sin(uTime * 2.0 + height * 0.5);
  lavaColor *= pulse;
  
  // === 5. FINAL COMPOSITION ===
  // Just mix Rock and Lava (No cracks)
  vec3 finalColor = mix(rockColor, lavaColor, lavaFlow);
  
  // Rim lighting for form definition
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float rimLight = pow(1.0 - max(0.0, dot(vNormal, viewDir)), 3.0);
  // Only rim light rocks, not lava (lava is emissive)
  finalColor += vec3(0.2, 0.05, 0.0) * rimLight * (1.0 - lavaFlow);
  
  gl_FragColor = vec4(finalColor, 1.0);
}
