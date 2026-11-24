export type Rand = () => number;

/** Small, fast seeded PRNG. */
export function mulberry32(seed: number): Rand {
	let s = seed | 0;
	return () => {
		s = (s + 0x6d2b79f5) | 0;
		let t = Math.imul(s ^ (s >>> 15), 1 | s);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export interface Noise {
	noise(x: number, y: number): number;
	fbm(x: number, y: number, octaves?: number): number;
}

/** 2D value noise with fractal sum, values in [0, 1]. */
export function createNoise(rand: Rand): Noise {
	const perm = new Uint8Array(512);
	const vals = new Float32Array(256);
	const p: number[] = [];
	for (let i = 0; i < 256; i++) {
		vals[i] = rand();
		p.push(i);
	}
	for (let i = 255; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[p[i], p[j]] = [p[j], p[i]];
	}
	for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

	function noise(x: number, y: number): number {
		const xi = Math.floor(x);
		const yi = Math.floor(y);
		const xf = x - xi;
		const yf = y - yi;
		const X = xi & 255;
		const Y = yi & 255;
		const a = vals[perm[perm[X] + Y]];
		const b = vals[perm[perm[X + 1] + Y]];
		const c = vals[perm[perm[X] + Y + 1]];
		const d = vals[perm[perm[X + 1] + Y + 1]];
		const u = xf * xf * (3 - 2 * xf);
		const v = yf * yf * (3 - 2 * yf);
		return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
	}

	function fbm(x: number, y: number, octaves = 4): number {
		let sum = 0;
		let amp = 0.5;
		let freq = 1;
		let norm = 0;
		for (let o = 0; o < octaves; o++) {
			sum += amp * noise(x * freq + o * 17.31, y * freq + o * 9.17);
			norm += amp;
			amp *= 0.5;
			freq *= 2.03;
		}
		return sum / norm;
	}

	return { noise, fbm };
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, v: number) => {
	const t = clamp((v - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};
