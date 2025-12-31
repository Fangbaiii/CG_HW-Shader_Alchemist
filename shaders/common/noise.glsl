// ============================================================================
// Common Noise Functions for GLSL
// These are reusable noise utility functions used across multiple shaders.
// Usage: import with `?raw` and prepend to shader strings
// ============================================================================

// --- Hash function (pseudo-random) ---
// Simple hash for 2D input, returns value in [0, 1]
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// --- Hash function for 2D output (used by voronoi) ---
vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// --- Value Noise (2D) ---
// Smooth interpolated noise, good for terrain and general purpose
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);  // Smoothstep interpolation
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// --- Fractal Brownian Motion (4 octaves) ---
// Layered noise for natural-looking patterns like clouds, terrain
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// --- FBM with configurable octaves ---
float fbm3(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 3; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
