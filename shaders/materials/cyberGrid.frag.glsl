varying vec2 vUv;
varying vec3 vPos;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uBaseColor;

void main() {
  // Create a grid pattern
  float gridSize = 10.0; // Density
  
  // Moving grid effect
  float move = uTime * 0.2;
  
  // Calculate grid lines
  // Use absolute position for world-aligned grid feel, or UV for object-aligned
  // Here we use UV for simplicity on cubes
  float x = fract(vUv.x * gridSize + move);
  float y = fract(vUv.y * gridSize);
  
  float lineThickness = 0.05;
  float gridX = step(1.0 - lineThickness, x);
  float gridY = step(1.0 - lineThickness, y);
  
  float grid = max(gridX, gridY);
  
  // Pulse effect
  float pulse = 0.5 + 0.5 * sin(uTime * 2.0 + vPos.y * 5.0);
  
  vec3 finalColor = mix(uBaseColor, uColor, grid * pulse);
  
  // Add a subtle glow at the bottom
  float glow = 1.0 - vUv.y;
  finalColor += uColor * glow * 0.2;

  gl_FragColor = vec4(finalColor, 1.0);
}
