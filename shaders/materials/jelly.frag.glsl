varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vPos;
uniform vec3 uColor;

// Pseudo-random function
float random(vec3 st) {
    return fract(sin(dot(st.xyz, vec3(12.9898,78.233,45.5432))) * 43758.5453123);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  vec3 lightDir = normalize(vec3(5.0, 5.0, 5.0)); // Fixed light source

  // 1. Wetness (Specular)
  // Blinn-Phong or Phong
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(viewDir, reflectDir), 0.0), 64.0); // High shininess
  vec3 specular = vec3(1.0) * spec;

  // 2. Fresnel Effect (Edge Glow)
  // Calculate angle between view direction and normal
  float viewDotNormal = max(dot(viewDir, normal), 0.0);
  float fresnel = pow(1.0 - viewDotNormal, 3.0);
  
  // 3. Color Gradient (Lime Center -> Teal Edge)
  // Mix based on distance from center or fresnel
  vec3 centerColor = vec3(0.3, 0.5, 0.1); // Bright lime green
  vec3 edgeColor = vec3(0.1, 0.6, 0.2);   // Deep teal green
  
  // Mix based on fresnel: center is yellow-green, edges are pure green
  vec3 baseColor = mix(centerColor, edgeColor, fresnel);

  // 4. Bubbles (3D Noise with Neighbor Search)
  // Create a grid of cells
  float scale = 2.0;
  // FIX: Offset position to avoid negative coordinate discontinuity artifacts (Black Cross)
  // fract() has a discontinuity at 0 for negative numbers in some implementations or logic
  vec3 shiftedPos = vPos + vec3(1000.0);
  vec3 cell = floor(shiftedPos * scale);
  vec3 local = fract(shiftedPos * scale);
  
  float bubbleMask = 0.0;
  vec3 bubbleNormalAccum = vec3(0.0);
  
  // Search neighbor cells (3x3x3) to prevent cutting off bubbles at cell boundaries
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
         vec3 neighbor = vec3(float(x), float(y), float(z));
         vec3 currentCell = cell + neighbor;
         
         // Random position for bubble in that cell
         vec3 bubblePos = neighbor + vec3(random(currentCell), random(currentCell + 1.0), random(currentCell + 2.0));
         
         // Distance from current fragment to this bubble center
         float dist = length(local - bubblePos);
         
         // Random size
         float bubbleRadius = random(currentCell + 3.0) * 0.3 + 0.05; 
         
         // Check if inside bubble
         if (dist < bubbleRadius) {
             // Soft edge for the bubble
             float b = 1.0 - smoothstep(bubbleRadius - 0.01, bubbleRadius + 0.01, dist);
             bubbleMask = max(bubbleMask, b);
             
             // Calculate normal for this bubble (approximate)
             if (b > 0.0) {
                bubbleNormalAccum = normalize(local - bubblePos);
             }
         }
      }
    }
  }
  
  // Fake 3D lighting for bubble
  vec3 bubbleLightDir = normalize(vec3(1.0, 1.0, 1.0));
  float bSpec = 0.0;
  if (bubbleMask > 0.0) {
      bSpec = pow(max(dot(bubbleNormalAccum, bubbleLightDir), 0.0), 32.0);
  }
  
  // Add bubbles to color (white with highlight)
  vec3 bubbleColor = vec3(1.0) * bubbleMask * (0.4 + bSpec * 2.0);

  // 5. Combine
  // Center is more transparent, edges are more opaque and white
  vec3 finalColor = baseColor + specular * 0.5 + vec3(1.0) * fresnel * 0.2 + bubbleColor * 0.5;
  
  float alpha = 0.55 + fresnel * 0.35 + bubbleMask * 0.2; // More opaque overall

  gl_FragColor = vec4(finalColor, alpha);
}
