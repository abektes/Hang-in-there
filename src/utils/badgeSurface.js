import { getSurface } from '../data/badgeStyles.js'

// The badge stock is a live shader. Each surface style defines
//   void badgeSurface(vec2 uv, out vec3 base, out vec3 glow)
// returning the printed color (lit by the scene) and an emissive glow (always
// lit). The same GLSL runs in the card material and in the offscreen renderer
// used for PNG export, so the download matches the 3D preview.
//
// Coordinates are tag.glb atlas UVs: the front face covers u 0–0.5, the back
// u 0.5–1, both over v 0–0.755 with v = 0 at the top of the card. All colors
// are linear and stay dark enough for the cream print layer to read.

// The 3D preview advances this every frame so a download captures the field
// exactly as it looks at that moment.
export const surfaceClock = { time: 0 }

export const SURFACE_UNIFORMS = /* glsl */ `
uniform float uBadgeTime;
uniform float uBadgeEnergy;
uniform float uBadgeLine;
`

const COMMON = /* glsl */ `
const vec3 BADGE_CREAM = vec3(0.91, 0.87, 0.80);

float badgeHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Octaves push coordinates into the hundreds, where the hash loses float
// precision and prints stripes. Each lattice corner wraps on its own so
// neighboring cells still agree across the wrap and no seam appears.
float badgeCorner(vec2 i) {
  return badgeHash(mod(i, 289.0));
}

float badgeNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(badgeCorner(i), badgeCorner(i + vec2(1.0, 0.0)), u.x),
    mix(badgeCorner(i + vec2(0.0, 1.0)), badgeCorner(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float badgeFbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 turn = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    value += amplitude * badgeNoise(p);
    p = turn * p * 2.03 + 17.1;
    amplitude *= 0.5;
  }
  return value;
}

// face: 0–1 across the printed face. p: same, in true card proportions.
void badgeFace(vec2 uv, out vec2 face, out vec2 p, out float back) {
  back = step(0.5, uv.x);
  face = vec2((uv.x - 0.5 * back) * 2.0, clamp(uv.y / 0.755, 0.0, 1.0));
  p = vec2(face.x * 0.716, face.y);
}

// 1 where type sits (name block and footer on the front, title and footer on
// the back) so every style can quiet itself there.
float badgeCalm(vec2 face, float back) {
  // Edges are wide and overlap so smooth styles never show a band.
  float footer = smoothstep(0.76, 0.9, face.y);
  float nameBlock = smoothstep(0.54, 0.66, face.y) * (1.0 - smoothstep(0.78, 0.88, face.y));
  float titleBlock = smoothstep(0.18, 0.32, face.y) * (1.0 - smoothstep(0.56, 0.7, face.y));
  return max(footer, mix(nameBlock, titleBlock * 0.75, back));
}

// Antialiased line at every integer of value, about width pixels wide.
float badgeLine(float value, float width) {
  float d = abs(fract(value + 0.5) - 0.5);
  float w = max(fwidth(value), 1e-4) * uBadgeLine;
  // Lines packed tighter than a few pixels alias into moiré; fade them.
  float fade = clamp(1.6 - w * 3.0, 0.0, 1.0);
  return (1.0 - smoothstep(w * width * 0.4, w * width, d)) * fade;
}
`

const STYLES = {
  // Drifting topographic lines with accent index lines and relief terraces.
  contour: /* glsl */ `
void badgeSurface(vec2 uv, out vec3 base, out vec3 glow) {
  vec2 face; vec2 p; float back;
  badgeFace(uv, face, p, back);
  const vec3 ink = vec3(0.008, 0.008, 0.014);
  const vec3 plum = vec3(0.040, 0.020, 0.068);
  const vec3 ember = vec3(1.0, 0.147, 0.0);
  vec2 seed = back * vec2(7.3, 2.9);
  float t = uBadgeTime;

  vec2 warp = vec2(
    badgeFbm(p * 1.6 + seed + vec2(0.0, t * 0.05)),
    badgeFbm(p * 1.6 + seed + vec2(5.2, 1.3) - vec2(t * 0.04, 0.0))
  );
  float height = badgeFbm(p * 1.2 + warp * 1.4 + seed);
  float level = height * 11.0 - t * 0.3;
  float index = floor(level + 0.5);
  float minor = badgeLine(level, 1.0);
  float major = badgeLine(level, 1.5) * (1.0 - step(0.5, mod(index + 1000.0, 4.0)));

  base = mix(ink, plum, smoothstep(0.3, 0.75, height));
  base *= 1.0 + 0.16 * mod(index + 1000.0, 2.0);
  vec2 pool = mix(vec2(0.62, 0.86), vec2(0.6, 0.12), back) + 0.06 * vec2(sin(t * 0.21), cos(t * 0.17));
  base += ember * 0.065 * exp(-3.2 * length(p - pool));

  float calm = badgeCalm(face, back);
  minor *= 1.0 - 0.75 * calm;
  major *= 1.0 - 0.8 * calm;
  base *= 1.0 - 0.35 * calm;
  base = mix(base, BADGE_CREAM * 0.32, minor * 0.4);
  base = mix(base, ember * 0.7, major * 0.85);
  glow = ember * major * (0.22 + uBadgeEnergy * 0.95) + BADGE_CREAM * minor * 0.02 * (1.0 + uBadgeEnergy * 3.0);
}
`,

  // Curtains of northern light: a sharp lower edge fading upward, with fine
  // vertical rays and a few twinkling stars.
  aurora: /* glsl */ `
void badgeSurface(vec2 uv, out vec3 base, out vec3 glow) {
  vec2 face; vec2 p; float back;
  badgeFace(uv, face, p, back);
  float t = uBadgeTime;
  vec2 seed = back * vec2(3.1, 8.7);
  base = mix(vec3(0.003, 0.006, 0.02), vec3(0.008, 0.02, 0.045), face.y);

  vec3 light = vec3(0.0);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float edge = 0.3 + fi * 0.2
      + 0.22 * (badgeFbm(vec2(p.x * 1.8 + fi * 4.0 + seed.x, t * 0.07 + fi)) - 0.5)
      + 0.035 * sin(p.x * 5.0 + t * 0.4 + fi * 2.0);
    float d = edge - face.y;
    float curtain = smoothstep(-0.012, 0.004, d) * exp(-max(d, 0.0) * (6.0 - fi));
    float sway = badgeFbm(vec2(p.x * 3.0 + seed.y, t * 0.1 + fi)) * 6.0;
    float rays = 0.45 + 0.55 * badgeNoise(vec2(p.x * 38.0 + sway, d * 2.0 - t * 0.5));
    vec3 hue = mix(vec3(0.08, 1.0, 0.45), vec3(0.42, 0.12, 0.95), smoothstep(0.0, 0.28, d));
    light += hue * curtain * rays * (0.55 - fi * 0.12);
  }

  vec2 cell = floor(p * 220.0);
  float star = step(0.9975, badgeHash(cell + seed)) * (0.55 + 0.45 * sin(t * 3.0 + badgeHash(cell) * 40.0));

  float calm = badgeCalm(face, back);
  light *= 1.0 - 0.7 * calm;
  base *= 1.0 - 0.15 * calm;
  base += light * 0.22;
  glow = light * (0.3 + uBadgeEnergy * 0.9) + vec3(star) * 0.5 * (1.0 - calm);
}
`,

  // Two-ink risograph: pink and blue halftone screens at different angles,
  // slightly misregistered. Swinging the badge knocks the plates further out.
  halftone: /* glsl */ `
float badgeDots(vec2 p, float angle, float cell, float tone) {
  float c = cos(angle);
  float s = sin(angle);
  vec2 local = fract(mat2(c, -s, s, c) * p / cell) - 0.5;
  float d = length(local);
  float r = sqrt(clamp(tone, 0.0, 1.0)) * 0.62;
  float aa = max(fwidth(d), 1e-4) * uBadgeLine;
  // Dots too small to resolve fall back to their average ink coverage.
  float fade = clamp(1.4 - aa * 6.0, 0.0, 1.0);
  return mix(clamp(tone * 1.1, 0.0, 1.0), 1.0 - smoothstep(r - aa, r + aa, d), fade);
}

void badgeSurface(vec2 uv, out vec3 base, out vec3 glow) {
  vec2 face; vec2 p; float back;
  badgeFace(uv, face, p, back);
  float t = uBadgeTime;
  vec2 seed = back * vec2(4.4, 1.9);
  vec2 drift = vec2(t * 0.035, -t * 0.025);
  float a = badgeFbm(p * 1.3 + seed + drift + badgeFbm(p * 2.0 - drift) * 0.8);
  float b = badgeFbm(p * 1.1 + seed + vec2(6.1, 2.4) - drift * 1.2);

  float calm = badgeCalm(face, back);
  float toneA = smoothstep(0.38, 0.78, a) * (1.0 - 0.75 * calm);
  float toneB = smoothstep(0.42, 0.82, b) * (1.0 - 0.75 * calm);
  vec2 slip = vec2(0.004, -0.003) * (1.0 + uBadgeEnergy * 4.0);
  float inkA = badgeDots(p, 0.26, 0.016, toneA);
  float inkB = badgeDots(p + slip, 1.31, 0.016, toneB);

  vec3 ink = vec3(1.0, 0.12, 0.32) * inkA + vec3(0.04, 0.22, 1.0) * inkB;
  base = vec3(0.012, 0.010, 0.013) + ink * 0.32;
  glow = ink * (0.1 + uBadgeEnergy * 0.5);
}
`,

  // Molten metal: warped bands through a cosine ramp, with the channels a hair
  // apart so the brightest folds split into a thin oil-slick fringe.
  chrome: /* glsl */ `
void badgeSurface(vec2 uv, out vec3 base, out vec3 glow) {
  vec2 face; vec2 p; float back;
  badgeFace(uv, face, p, back);
  float t = uBadgeTime;
  vec2 q = p * 1.5 + back * vec2(2.2, 5.6);
  vec2 warp = vec2(badgeFbm(q + vec2(t * 0.04, 0.0)), badgeFbm(q + vec2(3.3, -t * 0.03)));
  float h = badgeFbm(q + warp * 2.2);
  vec3 bands = 0.5 + 0.5 * cos(6.2831 * (h * 3.2 + vec3(0.0, 0.025, 0.05) - t * 0.05));
  vec3 sheen = bands * bands * bands * bands;

  float calm = badgeCalm(face, back);
  base = mix(vec3(0.010, 0.011, 0.014), vec3(0.30, 0.32, 0.36), sheen * (1.0 - 0.8 * calm));
  vec3 highlight = pow(bands, vec3(14.0));
  glow = highlight * vec3(0.5, 0.55, 0.62) * (0.15 + uBadgeEnergy * 0.6) * (1.0 - 0.85 * calm);
}
`,

  // Op-art moiré: two drifting sets of concentric rings; where they cross,
  // the interference pattern blooms and shifts as the centers move.
  interference: /* glsl */ `
void badgeSurface(vec2 uv, out vec3 base, out vec3 glow) {
  vec2 face; vec2 p; float back;
  badgeFace(uv, face, p, back);
  float t = uBadgeTime;
  vec2 c1 = vec2(0.2 + 0.12 * sin(t * 0.23), 0.28 + 0.1 * cos(t * 0.19)) + back * vec2(0.3, 0.2);
  vec2 c2 = vec2(0.52 + 0.1 * cos(t * 0.17), 0.74 + 0.08 * sin(t * 0.29)) - back * vec2(0.3, 0.3);

  float calm = badgeCalm(face, back);
  float r1 = badgeLine(length(p - c1) * 46.0, 1.1) * (1.0 - 0.75 * calm);
  float r2 = badgeLine(length(p - c2) * 46.0, 1.1) * (1.0 - 0.75 * calm);

  const vec3 cobalt = vec3(0.12, 0.3, 1.0);
  base = mix(vec3(0.006, 0.008, 0.022), vec3(0.012, 0.016, 0.04), face.y);
  base = mix(base, cobalt * 0.45, r1 * 0.7);
  base = mix(base, BADGE_CREAM * 0.3, r2 * 0.4);
  glow = cobalt * r1 * (0.08 + uBadgeEnergy * 0.5) + BADGE_CREAM * r1 * r2 * (0.4 + uBadgeEnergy * 0.8);
}
`,

  // Slow mesh gradient: four colored lights wander over indigo, with a fine
  // dither so the soft ramps never band.
  dusk: /* glsl */ `
void badgeSurface(vec2 uv, out vec3 base, out vec3 glow) {
  vec2 face; vec2 p; float back;
  badgeFace(uv, face, p, back);
  float t = uBadgeTime;
  float seed = back * 1.7;
  p += 0.06 * vec2(badgeFbm(p * 2.0 + t * 0.05), badgeFbm(p * 2.0 + 4.0 - t * 0.04)) - 0.03;

  vec2 points[4];
  points[0] = vec2(0.15 + 0.15 * sin(t * 0.13 + seed), 0.2 + 0.15 * cos(t * 0.11));
  points[1] = vec2(0.6 + 0.12 * cos(t * 0.09 + seed), 0.45 + 0.2 * sin(t * 0.12 + seed));
  points[2] = vec2(0.3 + 0.2 * sin(t * 0.07), 0.9 + 0.08 * cos(t * 0.15 + seed));
  points[3] = vec2(0.7 + 0.1 * sin(t * 0.1), 0.05 + 0.1 * cos(t * 0.08));
  vec3 colors[4];
  colors[0] = vec3(0.30, 0.02, 0.20);
  colors[1] = vec3(0.55, 0.16, 0.02);
  colors[2] = vec3(0.0, 0.14, 0.18);
  colors[3] = vec3(0.12, 0.04, 0.32);

  vec3 color = vec3(0.02, 0.012, 0.07) * 0.6;
  float total = 0.6;
  for (int i = 0; i < 4; i++) {
    vec2 delta = p - points[i];
    float weight = exp(-dot(delta, delta) * 9.0);
    color += colors[i] * weight;
    total += weight;
  }
  color /= total;

  float calm = badgeCalm(face, back);
  color *= 1.0 - 0.22 * calm;
  float grain = (badgeCorner(floor(uv * 4096.0) + floor(fract(t * 0.5) * 97.0)) - 0.5) * 0.012;
  base = color + grain;
  glow = color * (0.06 + uBadgeEnergy * 0.35);
}
`,
}

export function surfaceGlsl(id) {
  return COMMON + (STYLES[getSurface(id).id] ?? STYLES.contour)
}

const VERTEX = /* glsl */ `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

function fragmentSource(id) {
  return /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uSize;
uniform float uSide;
${SURFACE_UNIFORMS}
out vec4 outColor;
${surfaceGlsl(id)}
void main() {
  vec2 face = vec2(gl_FragCoord.x / uSize.x, 1.0 - gl_FragCoord.y / uSize.y);
  vec2 uv = vec2(face.x * 0.5 + 0.5 * uSide, face.y * 0.755);
  vec3 base;
  vec3 glow;
  badgeSurface(uv, base, glow);
  outColor = vec4(pow(clamp(base + glow, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0);
}
`
}

function compile(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
  return shader
}

function paintFlatSurface(ctx, side, width, height, id) {
  const [ink, glow] = getSurface(id).flat
  ctx.fillStyle = ink
  ctx.fillRect(0, 0, width, height)
  const pool = ctx.createRadialGradient(width * 0.85, side === 'back' ? height * 0.12 : height * 0.86, 0, width * 0.85, height * 0.5, height * 0.7)
  pool.addColorStop(0, glow)
  pool.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = pool
  ctx.fillRect(0, 0, width, height)
}

// Paints one face of a surface style into a 2D context at (0, 0, width, height).
export function paintSurface(ctx, side, width, height, { surface, time = 0 } = {}) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
  if (!gl?.createShader) {
    paintFlatSurface(ctx, side, width, height, surface)
    return
  }
  try {
    const program = gl.createProgram()
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource(surface)))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.uniform2f(gl.getUniformLocation(program, 'uSize'), width, height)
    gl.uniform1f(gl.getUniformLocation(program, 'uSide'), side === 'back' ? 1 : 0)
    gl.uniform1f(gl.getUniformLocation(program, 'uBadgeTime'), time)
    gl.uniform1f(gl.getUniformLocation(program, 'uBadgeEnergy'), 0)
    // Export pixels are far smaller than on-screen ones; widen the hairlines.
    gl.uniform1f(gl.getUniformLocation(program, 'uBadgeLine'), 2.2)
    gl.viewport(0, 0, width, height)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
    ctx.drawImage(canvas, 0, 0, width, height)
  } catch {
    paintFlatSurface(ctx, side, width, height, surface)
  } finally {
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}
