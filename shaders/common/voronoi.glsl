// ============================================================================
// Voronoi Noise Functions
// Used for crack patterns, cellular textures
// ============================================================================

// --- Hash function for 2D output ---
vec2 hash2(vec2 p) {
  return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

// --- Basic Voronoi (returns distance to nearest cell center) ---
float voronoi(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float md = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      vec2 r = g + o - f;
      float d = dot(r, r);
      md = min(md, d);
    }
  }
  return md;
}

// --- Voronoi Edge Detection (returns distance between two nearest cells) ---
// Better for crack/edge effects
float voronoiEdge(vec2 p) {
  vec2 n = floor(p);
  vec2 f = fract(p);
  float md = 1.0;
  float md2 = 1.0;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash2(n + g);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < md) {
        md2 = md;
        md = d;
      } else if (d < md2) {
        md2 = d;
      }
    }
  }
  return md2 - md; // Edge detection
}
