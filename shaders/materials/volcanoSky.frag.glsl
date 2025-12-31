// Volcano Sky Material - Fragment Shader
// Procedural volcanic sky: bottom orange-red -> middle dark red -> top gray-black
// Requires: noise, fbm from common utilities

varying vec3 vWorldPosition;
uniform float uTime;

void main() {
  // Normalize direction
  vec3 dir = normalize(vWorldPosition);
  
  // Height factor (0 at horizon, 1 at top)
  float height = dir.y * 0.5 + 0.5;
  
  // Base sky colors
  vec3 horizonColor = vec3(0.4, 0.08, 0.02);  // Dark orange-red horizon
  vec3 midColor = vec3(0.15, 0.03, 0.02);     // Dark red middle
  vec3 zenithColor = vec3(0.05, 0.03, 0.03);  // Gray-black zenith
  
  // Mix colors based on height
  vec3 skyColor;
  if (height < 0.3) {
    // Below horizon - glow from lava
    skyColor = mix(vec3(0.6, 0.15, 0.02), horizonColor, height / 0.3);
  } else if (height < 0.6) {
    skyColor = mix(horizonColor, midColor, (height - 0.3) / 0.3);
  } else {
    skyColor = mix(midColor, zenithColor, (height - 0.6) / 0.4);
  }
  
  // Add smoke/ash clouds
  vec2 cloudUV = dir.xz / (dir.y + 0.5) * 2.0;
  float cloudNoise = fbm(cloudUV + uTime * 0.02);
  float cloudMask = smoothstep(0.3, 0.7, cloudNoise) * smoothstep(0.2, 0.5, height);
  
  vec3 smokeColor = vec3(0.08, 0.06, 0.06);
  skyColor = mix(skyColor, smokeColor, cloudMask * 0.6);
  
  // Add ember glow near horizon
  float emberGlow = smoothstep(0.4, 0.25, height) * (0.5 + 0.5 * sin(uTime * 0.5));
  skyColor += vec3(0.3, 0.05, 0.0) * emberGlow * 0.3;
  
  gl_FragColor = vec4(skyColor, 1.0);
}
