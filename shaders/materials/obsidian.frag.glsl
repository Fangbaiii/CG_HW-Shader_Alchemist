// Obsidian Material - Fragment Shader
// Dark volcanic glass with glowing cracks
// Requires: noise, voronoiEdge from common utilities

varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUv;
uniform float uTime;

void main() {
  // Generate crack pattern using 3D position
  vec2 crackUV = vPosition.xz * 0.5 + vPosition.y * 0.3;
  
  // Voronoi crack edges
  float crack = voronoiEdge(crackUV * 2.0);
  float crackLine = smoothstep(0.0, 0.03, crack) * smoothstep(0.08, 0.02, crack);
  
  // Base obsidian color - deep black with subtle variation
  float rockNoise = noise(vPosition.xz * 0.8 + vPosition.y * 0.5);
  vec3 baseColor = mix(vec3(0.02, 0.02, 0.03), vec3(0.06, 0.05, 0.07), rockNoise);
  
  // Add faint purple/blue sheen (characteristic of obsidian)
  float sheen = pow(max(0.0, dot(vNormal, normalize(vec3(1.0, 1.0, 0.5)))), 8.0);
  baseColor += vec3(0.05, 0.02, 0.08) * sheen;
  
  // Crack glow color - dark orange/red magma glow
  vec3 crackGlow = vec3(0.8, 0.2, 0.05);
  
  // Subtle pulsing effect
  float pulse = 0.6 + 0.4 * sin(uTime * 0.8 + vPosition.x * 0.5 + vPosition.z * 0.5);
  
  // Combine cracks with base
  vec3 finalColor = mix(baseColor, crackGlow, crackLine * pulse * 0.7);
  
  // Simple lighting
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
  float diff = max(0.0, dot(vNormal, lightDir)) * 0.5 + 0.5;
  finalColor *= diff;
  
  // Rim lighting for depth
  float rimLight = pow(1.0 - max(0.0, dot(vNormal, vec3(0.0, 1.0, 0.0))), 3.0);
  finalColor += vec3(0.15, 0.05, 0.02) * rimLight * 0.3;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
