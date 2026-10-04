// Generated ink-wash placeholders from the wall prototype, shown only while no
// real work has been published yet. Index = style order on the wall.

function rng(s: number) {
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function sampleArt(si: number, seed: number): string {
  const r = rng(seed * 97 + si * 13 + 7);
  const u = `k${si}_${seed}`;
  let g = "";
  let f = '<feGaussianBlur stdDeviation="0"/>';
  if (si < 4) {
    f = `<feTurbulence type="fractalNoise" baseFrequency=".02 .03" numOctaves="2" seed="${seed}"/><feDisplacementMap in="SourceGraphic" scale="${[18, 10, 34, 26][si]}"/>`;
  }
  if (si === 0) {
    for (let i = 0; i < 5; i++) {
      g += `<path fill="none" stroke-width="1.6" d="M${40 + r() * 60} ${340 - i * 10}C${r() * 300} ${r() * 400} ${r() * 300} ${r() * 400} ${200 + r() * 80} ${40 + r() * 80}"/>`;
    }
  }
  if (si === 1) {
    g = `<circle cx="150" cy="190" r="${60 + r() * 40}" fill="none" stroke-width="14"/><path fill="none" stroke-width="12" d="M70 110L230 270M230 110L70 270"/>`;
  }
  if (si === 2) {
    g = `<circle cx="150" cy="190" r="${70 + r() * 50}"/><rect x="${60 + r() * 30}" y="320" width="${120 + r() * 60}" height="22"/><rect x="40" y="50" width="22" height="${120 + r() * 100}"/>`;
  }
  if (si === 3) {
    for (let i = 0; i < 6; i++) {
      g += `<path fill="none" stroke-width="5" d="M10 ${120 + i * 40}Q${75 + r() * 20} ${60 + i * 40} 150 ${120 + i * 40}T290 ${120 + i * 40}"/>`;
    }
  }
  if (si === 4 || si === 6) {
    f = `<feGaussianBlur stdDeviation="${si === 4 ? 14 : 24}"/>`;
    for (let i = 0; i < 4; i++) {
      g += `<ellipse cx="${60 + r() * 180}" cy="${80 + r() * 240}" rx="${40 + r() * 60}" ry="${50 + r() * 70}" stroke="none" opacity="${si === 4 ? 0.9 : 0.45}"/>`;
    }
  }
  if (si === 5) {
    for (let k = 1; k <= 6; k++) {
      for (let j = 0, a = k * 8; j < a; j++) {
        g += `<circle cx="${(150 + k * 20 * Math.cos((j / a) * 6.2832)).toFixed(1)}" cy="${(190 + k * 20 * Math.sin((j / a) * 6.2832)).toFixed(1)}" r="2.4" stroke="none"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><filter id="${u}" x="-30%" y="-30%" width="160%" height="160%">${f}</filter></defs><g filter="url(#${u})" fill="currentColor" stroke="currentColor" stroke-linecap="round">${g}</g></svg>`;
}

// Typical slider values per style (weight, detail, color, scale), from the prototype.
export const SAMPLE_FEEL: Record<string, [number, number, number, number]> = {
  "fine-line": [0.15, 0.2, 0.05, 0.2],
  "old-school": [0.7, 0.5, 0.8, 0.5],
  blackwork: [0.85, 0.7, 0, 0.7],
  japanese: [0.8, 0.95, 0.7, 0.95],
  realism: [0.5, 0.6, 0.3, 0.7],
  dotwork: [0.4, 0.8, 0, 0.5],
  watercolor: [0.2, 0.4, 0.95, 0.5],
};
