varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vPos; // Pass local position to fragment shader
uniform float uTime;

void main() {
  // Use normalized position as a smoothed normal to prevent mesh splitting at edges
  // Since BoxGeometry has split vertices at corners with different normals, 
  // using the original 'normal' attribute causes faces to separate when displaced.
  // normalize(position) gives a continuous direction for shared spatial positions.
  // FIX: Handle (0,0,0) case to prevent NaN (Black Cross artifact)
  // If position is too close to center, fallback to original normal instead of arbitrary (0,1,0)
  vec3 smoothedNormal = length(position) > 0.001 ? normalize(position) : normal;

  // 1. Calculate Normal for lighting
  // We use the smoothed normal for lighting too, to give it a soft, organic look
  vNormal = normalize(normalMatrix * smoothedNormal);

  // 2. Superimposed Sine Waves for Displacement
  // Base breathing wave
  float breath = sin(uTime * 2.0) * 0.05;
  // Wave traveling along Y axis (gravity/sagging feel)
  float gravityWave = sin(position.y * 4.0 - uTime * 3.0) * 0.05;
  // High frequency tremble
  float tremble = sin(position.x * 10.0 + position.z * 8.0 + uTime * 10.0) * 0.02;

  float totalDisplacement = breath + gravityWave + tremble;

  // 3. Apply displacement with floor constraint
  vec3 displacement = smoothedNormal * totalDisplacement;

  // FIX: Prevent floor clipping (Jelly bottom sticking to floor)
  // The box bottom is at y = -0.75. We want the bottom to stick to the floor.
  // smoothstep returns 0.0 at -0.75 and 1.0 at -0.25, creating a transition zone.
  float heightFactor = smoothstep(-0.75, -0.25, position.y);
  
  // Attenuate Y displacement near the bottom so it doesn't dig into the floor
  displacement.y *= heightFactor;

  vec3 newPosition = position + displacement;

  // Hard floor constraint: never let any vertex go below -0.75
  newPosition.y = max(newPosition.y, -0.75);
  
  vPos = position; // Pass original position for static noise

  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
