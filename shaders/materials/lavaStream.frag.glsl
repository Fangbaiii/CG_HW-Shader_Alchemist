// Lava Stream Material - Fragment Shader
// Flowing lava for tube geometry
// Requires: noise from common utilities

varying vec2 vUv;
varying vec3 vPosition;
uniform float uTime;

void main() {
  // Flow along the tube
  float flow = uTime * 0.8;
  vec2 flowUV = vec2(vUv.x * 2.0, vUv.y * 10.0 - flow);
  
  // Multi-layer noise
  float n1 = noise(flowUV);
  float n2 = noise(flowUV * 2.0 + 10.0);
  float n3 = noise(flowUV * 0.5 + 5.0);
  
  float lavaPattern = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
  
  // Color gradient
  vec3 darkLava = vec3(0.15, 0.02, 0.0);
  vec3 hotLava = vec3(1.0, 0.4, 0.0);
  vec3 brightLava = vec3(1.0, 0.9, 0.3);
  
  vec3 color = mix(darkLava, hotLava, smoothstep(0.3, 0.6, lavaPattern));
  color = mix(color, brightLava, smoothstep(0.7, 0.9, lavaPattern));
  
  // Edge cooling effect
  float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
  color = mix(vec3(0.05, 0.02, 0.01), color, edge);
  
  // Glow intensity
  float glow = smoothstep(0.4, 0.8, lavaPattern) * edge;
  
  gl_FragColor = vec4(color, 0.95);
}
