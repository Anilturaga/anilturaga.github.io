import { mulberry32, createNoise, clamp, lerp, smoothstep } from './noise';
import { growBroadleaf, growSpruce, growShrub, drawTree, drawTreeShadow, type Tree } from './trees';

export type RGB = [number, number, number];

/**
 * A climate. Everything here is colour or weather: switching climates never
 * touches the pond's geometry, so it can crossfade while you skate.
 */
export interface Palette {
	name: string;
	ice: RGB;
	iceDeep: RGB;
	iceLight: RGB;
	snow: RGB;
	snowShade: RGB;
	earth: RGB;
	glow: RGB;
	glowStrength: number;
	cool: RGB;
	shadow: RGB;
	shadowAlpha: number;
	bark: string;
	barkSnow: string;
	pine: string;
	pineLight: string;
	reed: [string, string, string];
	wood: string;
	woodDark: string;
	/** multiplier applied to the skater's colours so they sit in the scene's light */
	ambient: RGB;
	/** how bright the blade marks read on this ice */
	trailAlpha: number;
	/** 0 = lamps off … 1 = fully lit */
	lamp: number;
	/** snowfall density, ~0.2 light … 1.6 blizzard */
	snowfall: number;
	/** sideways drift of the snow */
	wind: number;
}

export const PALETTES: Palette[] = [
	{
		name: 'Dusk',
		ice: [126, 134, 170],
		iceDeep: [92, 102, 148],
		iceLight: [192, 192, 216],
		snow: [234, 226, 236],
		snowShade: [196, 190, 214],
		earth: [150, 130, 128],
		glow: [255, 190, 160],
		glowStrength: 0.42,
		cool: [100, 112, 168],
		shadow: [52, 64, 138],
		shadowAlpha: 0.42,
		bark: '#5a4448',
		barkSnow: '#ece4ee',
		pine: '#3a4a58',
		pineLight: '#56687a',
		reed: ['#c9a46a', '#a8834f', '#dcc08a'],
		wood: '#8a5a44',
		woodDark: '#5e3c30',
		ambient: [1, 0.95, 0.96],
		trailAlpha: 0.8,
		lamp: 0,
		snowfall: 0.8,
		wind: 0.4
	},
	{
		name: 'Morning',
		ice: [150, 178, 204],
		iceDeep: [108, 140, 180],
		iceLight: [218, 230, 240],
		snow: [246, 246, 248],
		snowShade: [208, 218, 232],
		earth: [150, 138, 120],
		glow: [255, 222, 176],
		glowStrength: 0.32,
		cool: [130, 160, 200],
		shadow: [63, 94, 152],
		shadowAlpha: 0.38,
		bark: '#4e3c36',
		barkSnow: '#ffffff',
		pine: '#2f4a46',
		pineLight: '#4a6a60',
		reed: ['#d4ae6c', '#b08a52', '#e6c890'],
		wood: '#91603f',
		woodDark: '#62402c',
		ambient: [1, 1, 1],
		trailAlpha: 0.85,
		lamp: 0,
		snowfall: 0.35,
		wind: -0.3
	},
	{
		name: 'Golden Hour',
		ice: [146, 144, 178],
		iceDeep: [108, 106, 152],
		iceLight: [224, 204, 204],
		snow: [252, 236, 220],
		snowShade: [224, 194, 186],
		earth: [164, 128, 104],
		glow: [255, 176, 104],
		glowStrength: 0.52,
		cool: [118, 108, 162],
		shadow: [74, 60, 138],
		shadowAlpha: 0.46,
		bark: '#5a3e3c',
		barkSnow: '#fff0dc',
		pine: '#3c4846',
		pineLight: '#62705c',
		reed: ['#e0a85c', '#b88040', '#f0c880'],
		wood: '#9a5e3a',
		woodDark: '#6a3c26',
		ambient: [1, 0.9, 0.82],
		trailAlpha: 0.8,
		lamp: 0.2,
		snowfall: 0.25,
		wind: 0.3
	},
	{
		name: 'Mist',
		ice: [148, 158, 166],
		iceDeep: [118, 130, 142],
		iceLight: [204, 210, 214],
		snow: [236, 238, 238],
		snowShade: [206, 210, 214],
		earth: [140, 134, 126],
		glow: [232, 228, 214],
		glowStrength: 0.2,
		cool: [120, 132, 146],
		shadow: [76, 90, 104],
		shadowAlpha: 0.24,
		bark: '#4a4442',
		barkSnow: '#f0f0f0',
		pine: '#3c4a48',
		pineLight: '#566462',
		reed: ['#b8a07a', '#988060', '#cdb894'],
		wood: '#7a5c4a',
		woodDark: '#544034',
		ambient: [0.96, 0.97, 0.98],
		trailAlpha: 0.7,
		lamp: 0.25,
		snowfall: 1,
		wind: 0.2
	},
	{
		name: 'Blizzard',
		ice: [158, 168, 184],
		iceDeep: [128, 140, 160],
		iceLight: [220, 226, 234],
		snow: [238, 242, 246],
		snowShade: [204, 212, 224],
		earth: [128, 128, 132],
		glow: [220, 230, 246],
		glowStrength: 0.15,
		cool: [146, 156, 176],
		shadow: [88, 104, 128],
		shadowAlpha: 0.16,
		bark: '#4a4a52',
		barkSnow: '#f6f8fa',
		pine: '#3a4a50',
		pineLight: '#56666c',
		reed: ['#a89c8a', '#8a8070', '#c0b4a0'],
		wood: '#6e5a50',
		woodDark: '#4a3c36',
		ambient: [0.92, 0.94, 0.98],
		trailAlpha: 0.6,
		lamp: 0.55,
		snowfall: 1.6,
		wind: 1.7
	},
	{
		name: 'Moonlight',
		ice: [54, 66, 106],
		iceDeep: [36, 44, 82],
		iceLight: [100, 114, 156],
		snow: [150, 162, 200],
		snowShade: [110, 120, 168],
		earth: [70, 70, 90],
		glow: [150, 176, 255],
		glowStrength: 0.3,
		cool: [30, 36, 70],
		shadow: [16, 24, 58],
		shadowAlpha: 0.5,
		bark: '#2c2834',
		barkSnow: '#aab4d8',
		pine: '#1c2834',
		pineLight: '#2c3c4c',
		reed: ['#7c6e66', '#5e544e', '#958478'],
		wood: '#4a3a3a',
		woodDark: '#2e2428',
		ambient: [0.55, 0.6, 0.82],
		trailAlpha: 0.6,
		lamp: 1,
		snowfall: 0.7,
		wind: -0.5
	}
];

export const TILT = 0.5; // how much height lifts things up the screen (oblique top-down view)
export const SHADOW_K = 1.55; // how far shadows stretch per unit of height
export const LAMP_H = 26;

export interface Pond {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
	harm: { k: number; a: number; p: number }[];
}

export function pondRadius(p: Pond, th: number) {
	let f = 1;
	for (const h of p.harm) f += h.a * Math.sin(h.k * th + h.p);
	return f;
}

/** Approximate signed distance to the shoreline. Negative on the ice. */
export function pondSdf(p: Pond, x: number, y: number) {
	const nx = (x - p.cx) / p.rx;
	const ny = (y - p.cy) / p.ry;
	const th = Math.atan2(ny, nx);
	return (Math.hypot(nx, ny) - pondRadius(p, th)) * (p.rx + p.ry) * 0.5;
}

type Pt = { x: number; y: number };
type P3 = { x: number; y: number; z: number };

/** Everything about a pond that doesn't depend on the climate. Built once. */
export interface Layout {
	seed: number;
	W: number;
	H: number;
	pond: Pond;
	pondPath: Path2D;
	sun: Pt; // direction shadows are cast
	/** per-pixel blend weights of the ground shading, quantised to bytes */
	field: { ice: Uint8Array; w: Uint8Array[]; glow: Uint8Array; grain: Int8Array; shade: Uint8Array };
	scratches: { x: number; y: number; rx: number; ry: number; rot: number; a0: number; a1: number; alpha: number }[];
	cracks: { pts: number[]; alpha: number }[];
	bubbles: { x: number; y: number; r: number; alpha: number }[];
	footprints: Pt[];
	rocks: { x: number; y: number; r: number }[];
	reeds: { x: number; y: number; tx: number; ty: number; h: number; c: 0 | 1 | 2; head: boolean }[];
	fence: Pt[];
	bench: { seat: P3[]; back: P3[]; snow: P3[]; legs: P3[]; backFirst: boolean };
	lamps: Pt[];
	trees: (Tree & { rng: number })[];
	glints: { x: number; y: number; p: number; s: number }[];
	start: Pt;
	musicRoot: number;
}

export interface Painted {
	bg: HTMLCanvasElement;
	fg: HTMLCanvasElement;
}

function makeCanvas(w: number, h: number) {
	const c = document.createElement('canvas');
	c.width = w;
	c.height = h;
	return c;
}

function rgb(c: RGB, a = 1) {
	return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}

const VP = (x: number, y: number, z: number): [number, number] => [x, y - z * TILT];
const FH = 7; // fence height

export function buildLayout(seed: number): Layout {
	const rand = mulberry32(seed);
	const N = createNoise(rand);
	const N2 = createNoise(rand);
	const W = 840;
	const H = 660;

	const pond: Pond = {
		cx: W / 2 + (rand() - 0.5) * 60,
		cy: H / 2 + (rand() - 0.5) * 40,
		rx: 235 + rand() * 50,
		ry: 170 + rand() * 35,
		harm: []
	};
	for (let k = 2; k <= 7; k++) {
		pond.harm.push({ k, a: ((rand() - 0.3) * 0.16) / Math.sqrt(k), p: rand() * Math.PI * 2 });
	}
	pond.harm.push({ k: 13, a: 0.012, p: rand() * 6.28 });
	pond.harm.push({ k: 21, a: 0.006, p: rand() * 6.28 });

	const sunAng = -Math.PI / 2 + (rand() - 0.5) * 1.7;
	const sun = { x: Math.cos(sunAng), y: Math.sin(sunAng) };
	const windAng = rand() * Math.PI * 2;
	const sdf = (x: number, y: number) => pondSdf(pond, x, y);
	const SP = (x: number, y: number, z: number): [number, number] => [
		x + sun.x * z * SHADOW_K,
		y + sun.y * z * SHADOW_K
	];

	// ---------- ground: the expensive noise, evaluated once ----------
	const n = W * H;
	const ice = new Uint8Array(n);
	const w = [0, 1, 2, 3, 4].map(() => new Uint8Array(n));
	const glow = new Uint8Array(n);
	const grain = new Int8Array(n);
	const gx = pond.cx - sun.x * W * 0.62;
	const gy = pond.cy - sun.y * H * 0.62;
	const cw = Math.cos(windAng);
	const sw = Math.sin(windAng);
	const q = (v: number) => Math.round(clamp(v, 0, 1) * 255);
	for (let y = 0, i = 0; y < H; y++) {
		for (let x = 0; x < W; x++, i++) {
			const d = sdf(x, y);
			const u = x * cw + y * sw;
			const v = -x * sw + y * cw;
			if (d < 0) {
				ice[i] = 1;
				w[0][i] = q(smoothstep(0.42, 0.75, N.fbm(x * 0.0055, y * 0.0055, 4)) * 0.85);
				// wind-blown streaks of powder over the ice
				w[1][i] = q(smoothstep(0.55, 0.82, N2.fbm(u * 0.0035, v * 0.028, 3)) * 0.6);
				w[2][i] = q(smoothstep(0.62, 0.78, N2.fbm(x * 0.012 + 40, y * 0.012, 3)) * 0.35);
				// drifted snow against the bank, and a thin bright rim at the edge
				w[3][i] = q(smoothstep(-16, 0, d + (N.noise(x * 0.06, y * 0.06) - 0.5) * 10) * 0.7);
				w[4][i] = q(smoothstep(-2.5, 0, d) * 0.6);
			} else {
				w[0][i] = q(smoothstep(0.35, 0.8, N.fbm(x * 0.018, y * 0.018, 4)) * 0.7);
				w[1][i] = q(smoothstep(0.6, 0.85, N2.fbm(u * 0.01, v * 0.06, 2)) * 0.35);
				w[2][i] = q(smoothstep(0.72, 0.82, N2.fbm(x * 0.03 + 90, y * 0.03, 3)) * 0.25 * smoothstep(20, 80, d));
				// the bank lip: a soft shaded band just above the ice
				w[3][i] = q((1 - smoothstep(0, 9, d)) * 0.5);
				w[4][i] = q((1 - smoothstep(0, 2.5, d)) * 0.35);
			}
			glow[i] = q(Math.exp(-((x - gx) ** 2 + (y - gy) ** 2) / (W * W * 0.42)));
			grain[i] = Math.round((N.noise(x * 0.9, y * 0.9) - 0.5) * 5 * 20);
		}
	}

	const pondPath = new Path2D();
	for (let i = 0; i <= 360; i++) {
		const th = (i / 360) * Math.PI * 2;
		const f = pondRadius(pond, th) - 0.01;
		const px = pond.cx + Math.cos(th) * pond.rx * f;
		const py = pond.cy + Math.sin(th) * pond.ry * f;
		if (i === 0) pondPath.moveTo(px, py);
		else pondPath.lineTo(px, py);
	}
	pondPath.closePath();

	const randomIcePoint = (margin: number) => {
		for (let i = 0; i < 200; i++) {
			const x = rand() * W;
			const y = rand() * H;
			if (sdf(x, y) < -margin) return { x, y };
		}
		return { x: pond.cx, y: pond.cy };
	};

	// ---------- ice details ----------
	const scratches: Layout['scratches'] = [];
	for (let i = 0; i < 22; i++) {
		const p = randomIcePoint(30);
		const r = 20 + rand() * 120;
		const a0 = rand() * Math.PI * 2;
		const alpha = 0.04 + rand() * 0.07;
		const ry = r * (0.3 + rand() * 0.7);
		scratches.push({ x: p.x, y: p.y, rx: r, ry, rot: rand() * 3, a0, a1: a0 + 0.6 + rand() * 2, alpha });
	}
	const cracks: Layout['cracks'] = [];
	const crack = (x: number, y: number, ang: number, steps: number, alpha: number, depth: number) => {
		const pts = [x, y];
		for (let s = 0; s < steps; s++) {
			ang += (rand() - 0.5) * 0.25 + (rand() < 0.08 ? (rand() - 0.5) * 1.6 : 0);
			x += Math.cos(ang) * 3;
			y += Math.sin(ang) * 3;
			pts.push(x, y);
		}
		cracks.push({ pts, alpha });
		if (depth > 0) {
			for (let k = 2; k < pts.length; k += 2) {
				if (rand() < 0.06)
					crack(pts[k], pts[k + 1], ang + (rand() < 0.5 ? 1 : -1) * (0.6 + rand()), 6 + rand() * 14, alpha * 0.7, depth - 1);
			}
		}
	};
	for (let i = 0; i < 6; i++) {
		const p = randomIcePoint(20);
		crack(p.x, p.y, rand() * Math.PI * 2, 15 + rand() * 50, 0.28 + rand() * 0.2, 2);
	}
	const bubbles: Layout['bubbles'] = [];
	for (let i = 0; i < 14; i++) {
		const p = randomIcePoint(30);
		const cnt = 4 + rand() * 14;
		for (let j = 0; j < cnt; j++) {
			bubbles.push({
				x: p.x + (rand() - 0.5) * 26,
				y: p.y + (rand() - 0.5) * 26,
				r: 0.6 + rand() * 1.6,
				alpha: 0.15 + rand() * 0.25
			});
		}
	}

	// ---------- shore objects ----------
	const shorePoint = (th: number, off: number) => {
		// march outward from the pond centre along a normalised angle until we hit the offset
		let t = pondRadius(pond, th);
		for (let i = 0; i < 200; i++) {
			const x = pond.cx + Math.cos(th) * pond.rx * t;
			const y = pond.cy + Math.sin(th) * pond.ry * t;
			if (sdf(x, y) >= off) return { x, y };
			t += 0.004;
		}
		return { x: pond.cx + Math.cos(th) * pond.rx * t, y: pond.cy + Math.sin(th) * pond.ry * t };
	};

	// trees: pick spots on the banks, denser close to the water
	const trees: Layout['trees'] = [];
	const taken: { x: number; y: number; r: number }[] = [];
	const free = (x: number, y: number, r: number) =>
		taken.every((t) => (t.x - x) ** 2 + (t.y - y) ** 2 > (t.r + r) ** 2);
	const forest = createNoise(rand);
	for (let tries = 0; tries < 1600 && trees.length < 46; tries++) {
		const x = rand() * W;
		const y = rand() * (H + 80);
		const d = sdf(x, y);
		if (d < 10) continue;
		if (rand() > (d < 110 ? 0.75 : 0.25)) continue;
		const f = forest.fbm(x * 0.006, y * 0.006, 3);
		// keep trees on the near (south) bank shorter so they don't hide the ice
		const southBank = y > pond.cy && d < 90;
		if (southBank && d < 28 && rand() > 0.3) continue;
		const south = southBank ? 0.5 : 1;
		const roll = rand();
		const rng = Math.floor(rand() * 2 ** 31);
		if (roll < 0.25 && d < 70) {
			if (!free(x, y, 5)) continue;
			taken.push({ x, y, r: 5 });
			const h = 10 + rand() * 9;
			trees.push({ kind: 'shrub', x, y, h, segs: growShrub(rand, h), rng });
		} else if (f > 0.56) {
			if (!free(x, y, 11)) continue;
			taken.push({ x, y, r: 11 });
			const h = (55 + rand() * 60) * south;
			trees.push({ kind: 'spruce', x, y, h, segs: growSpruce(rand, h, h * (0.2 + rand() * 0.05)), rng });
		} else {
			if (!free(x, y, 16)) continue;
			taken.push({ x, y, r: 16 });
			const h = (95 + rand() * 80) * south;
			trees.push({ kind: 'broadleaf', x, y, h, segs: growBroadleaf(rand, h), rng });
		}
	}
	trees.sort((a, b) => a.y - b.y);

	const reeds: Layout['reeds'] = [];
	for (let i = 0; i < 70; i++) {
		const p = shorePoint(rand() * Math.PI * 2, 3 + rand() * 30);
		const cnt = 3 + Math.floor(rand() * 7);
		for (let j = 0; j < cnt; j++) {
			const x = p.x + (rand() - 0.5) * 10;
			const y = p.y + (rand() - 0.5) * 6;
			const h = 4 + rand() * 9;
			reeds.push({
				x,
				y,
				tx: x + (rand() - 0.5) * 4,
				ty: y + (rand() - 0.5) * 2,
				h,
				c: Math.floor(rand() * 3) as 0 | 1 | 2,
				head: h > 8 && rand() < 0.4
			});
		}
	}

	const rocks: Layout['rocks'] = [];
	for (let i = 0; i < 16; i++) {
		const p = shorePoint(rand() * Math.PI * 2, 4 + rand() * 50);
		rocks.push({ ...p, r: 2 + rand() * 5 });
	}

	const fenceTh = rand() * Math.PI * 2;
	const fenceSpan = 0.6 + rand() * 0.7;
	const fence: Pt[] = [];
	for (let a = 0; a < fenceSpan; a += 0.018) fence.push(shorePoint(fenceTh + a, 40));

	const benchTh = fenceTh + fenceSpan + 0.25 + rand() * 1.5;
	const bp = shorePoint(benchTh, 22);
	const bnm = Math.hypot(pond.cx - bp.x, pond.cy - bp.y) || 1;
	const bn = { x: (pond.cx - bp.x) / bnm, y: (pond.cy - bp.y) / bnm };
	const bt = { x: -bn.y, y: bn.x };
	const bq = (along: number, out: number, z: number): P3 => ({
		x: bp.x + bt.x * along + bn.x * out,
		y: bp.y + bt.y * along + bn.y * out,
		z
	});
	const bench: Layout['bench'] = {
		seat: [bq(-7, -1.8, 4), bq(7, -1.8, 4), bq(7, 1.8, 4), bq(-7, 1.8, 4)],
		back: [bq(-7, -2.6, 5), bq(7, -2.6, 5), bq(7, -2.6, 9), bq(-7, -2.6, 9)],
		snow: [bq(-5, -1, 4.2), bq(4, -1.2, 4.2), bq(3, 0.8, 4.2), bq(-4.5, 1, 4.2)],
		legs: [bq(-6, -1.5, 0), bq(6, -1.5, 0), bq(-6, 1.5, 0), bq(6, 1.5, 0)],
		// whichever piece is further "north" on screen draws first
		backFirst: bn.y >= 0
	};
	const lamps = [shorePoint(benchTh + 0.07, 30), shorePoint(benchTh + Math.PI * (0.7 + rand() * 0.6), 26)];

	const footprints: Pt[] = [];
	{
		let th = benchTh;
		let off = 18;
		for (let i = 0; i < 160; i++) {
			th += 0.006 + (rand() - 0.5) * 0.004;
			off = clamp(off + (rand() - 0.5) * 3, 8, 60);
			const p = shorePoint(th, off);
			const r = shorePoint(th + 0.003, off);
			const m = Math.hypot(r.x - p.x, r.y - p.y) || 1;
			const side = i % 2 === 0 ? 1.4 : -1.4;
			footprints.push({
				x: Math.round(p.x - ((r.y - p.y) / m) * side),
				y: Math.round(p.y + ((r.x - p.x) / m) * side)
			});
		}
	}

	// ---------- shadow silhouettes (the same for every climate) ----------
	const shadowMask = makeCanvas(W, H);
	const sctx = shadowMask.getContext('2d', { willReadFrequently: true })!;
	sctx.fillStyle = sctx.strokeStyle = '#000';
	sctx.lineCap = 'round';
	sctx.lineJoin = 'round';
	for (const t of trees) drawTreeShadow(sctx, t, SP);
	const segShadow = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => {
		const [x0, y0] = SP(ax, ay, az);
		const [x1, y1] = SP(bx, by, bz);
		sctx.beginPath();
		sctx.moveTo(x0, y0);
		sctx.lineTo(x1, y1);
		sctx.stroke();
	};
	sctx.lineWidth = 1;
	for (const r of reeds) segShadow(r.x, r.y, 0, r.tx, r.ty, r.h);
	for (const r of rocks) {
		sctx.beginPath();
		sctx.ellipse(r.x + sun.x * r.r * 1.3, r.y + sun.y * r.r * 1.3, r.r * 1.4, r.r * 0.9, sunAng, 0, Math.PI * 2);
		sctx.fill();
	}
	for (let i = 0; i < fence.length; i++) {
		const f = fence[i];
		segShadow(f.x, f.y, 0, f.x, f.y, FH);
		if (i > 0) {
			const g = fence[i - 1];
			for (const z of [FH * 0.55, FH * 0.95]) segShadow(g.x, g.y, z, f.x, f.y, z);
		}
	}
	for (const quad of [bench.seat, bench.back]) {
		sctx.beginPath();
		quad.forEach((p, i) => {
			const [x, y] = SP(p.x, p.y, p.z);
			if (i === 0) sctx.moveTo(x, y);
			else sctx.lineTo(x, y);
		});
		sctx.closePath();
		sctx.fill();
	}
	for (const l of bench.legs) segShadow(l.x, l.y, 0, l.x, l.y, 4);
	sctx.lineWidth = 1.5;
	for (const l of lamps) {
		segShadow(l.x, l.y, 0, l.x, l.y, LAMP_H);
		const [tx, ty] = SP(l.x, l.y, LAMP_H);
		sctx.beginPath();
		sctx.arc(tx, ty, 2, 0, Math.PI * 2);
		sctx.fill();
	}

	// keep just the coverage; each climate tints it inside the ground pass
	const shade = new Uint8Array(n);
	const md = sctx.getImageData(0, 0, W, H).data;
	for (let i = 0; i < n; i++) shade[i] = md[i * 4 + 3];

	// sparkling points on the ice
	const glints: Layout['glints'] = [];
	for (let i = 0; i < 220; i++) {
		const p = randomIcePoint(6);
		glints.push({ x: Math.round(p.x), y: Math.round(p.y), p: rand() * 100, s: 0.4 + rand() * 1.2 });
	}

	// begin near the bank the sun is behind, so the long shadows stretch out in front of you
	const start = (() => {
		const th = Math.atan2(-sun.y * pond.rx, -sun.x * pond.ry);
		const b = shorePoint(th, 0);
		const m = Math.hypot(pond.cx - b.x, pond.cy - b.y) || 1;
		const p = { x: b.x + ((pond.cx - b.x) / m) * 105, y: b.y + ((pond.cy - b.y) / m) * 105 };
		return sdf(p.x, p.y) < -20 ? p : { x: pond.cx, y: pond.cy };
	})();

	const roots = [48, 50, 52, 53, 55];
	return {
		seed,
		W,
		H,
		pond,
		pondPath,
		sun,
		field: { ice, w, glow, grain, shade },
		scratches,
		cracks,
		bubbles,
		footprints,
		rocks,
		reeds,
		fence,
		bench,
		lamps,
		trees,
		glints,
		start,
		musicRoot: roots[Math.floor(rand() * roots.length)]
	};
}

// one scratch surface shared by every paint, so painting climates doesn't churn
// megabytes of garbage (which showed up as GC pauses mid-skate)
let scratch: { work: HTMLCanvasElement; ctx: CanvasRenderingContext2D; img: ImageData } | null = null;
function getScratch(W: number, H: number) {
	if (!scratch || scratch.work.width !== W || scratch.work.height !== H) {
		const work = makeCanvas(W, H);
		const ctx = work.getContext('2d', { willReadFrequently: true })!;
		scratch = { work, ctx, img: ctx.createImageData(W, H) };
	}
	return scratch;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/**
 * Paints one climate onto fresh canvases. It's a generator so the game can
 * spread the work over frames (a few ms at a time) while you keep skating.
 */
export function* paintClimate(L: Layout, P: Palette): Generator<void, Painted> {
	const { W, H } = L;
	const { work, ctx: wctx, img } = getScratch(W, H);
	wctx.setTransform(1, 0, 0, 1, 0, 0);
	wctx.globalAlpha = 1;
	wctx.globalCompositeOperation = 'source-over';
	const data = img.data;
	const { ice, w, glow, grain, shade } = L.field;
	const [sr, sg, sb] = P.shadow;
	const shadowK = P.shadowAlpha / 255;
	const [w0, w1, w2, w3, w4] = w;
	const K = 1 / 255;

	// ground colours from the cached weights
	const ROWS = 32;
	for (let y0 = 0; y0 < H; y0 += ROWS) {
		const end = Math.min(H, y0 + ROWS) * W;
		for (let i = y0 * W; i < end; i++) {
			let r: number, g: number, b: number;
			let t: number;
			if (ice[i]) {
				r = P.ice[0];
				g = P.ice[1];
				b = P.ice[2];
				t = w0[i] * K;
				r += (P.iceDeep[0] - r) * t; g += (P.iceDeep[1] - g) * t; b += (P.iceDeep[2] - b) * t;
				t = w1[i] * K;
				r += (P.iceLight[0] - r) * t; g += (P.iceLight[1] - g) * t; b += (P.iceLight[2] - b) * t;
				t = w2[i] * K;
				r += (P.iceLight[0] - r) * t; g += (P.iceLight[1] - g) * t; b += (P.iceLight[2] - b) * t;
				t = w3[i] * K;
				r += (P.iceLight[0] - r) * t; g += (P.iceLight[1] - g) * t; b += (P.iceLight[2] - b) * t;
				t = w4[i] * K;
				r += (P.snow[0] - r) * t; g += (P.snow[1] - g) * t; b += (P.snow[2] - b) * t;
			} else {
				r = P.snow[0];
				g = P.snow[1];
				b = P.snow[2];
				t = w0[i] * K;
				r += (P.snowShade[0] - r) * t; g += (P.snowShade[1] - g) * t; b += (P.snowShade[2] - b) * t;
				t = w1[i] * K;
				r += (P.snowShade[0] - r) * t; g += (P.snowShade[1] - g) * t; b += (P.snowShade[2] - b) * t;
				t = w2[i] * K;
				r += (P.earth[0] - r) * t; g += (P.earth[1] - g) * t; b += (P.earth[2] - b) * t;
				t = w3[i] * K;
				r += (P.snowShade[0] - r) * t; g += (P.snowShade[1] - g) * t; b += (P.snowShade[2] - b) * t;
				t = w4[i] * K;
				r += (P.iceDeep[0] - r) * t; g += (P.iceDeep[1] - g) * t; b += (P.iceDeep[2] - b) * t;
			}
			// low sun wash + cool falloff
			const gl = glow[i] * K;
			t = gl * P.glowStrength;
			r += (P.glow[0] - r) * t; g += (P.glow[1] - g) * t; b += (P.glow[2] - b) * t;
			t = (1 - gl) * 0.14;
			r += (P.cool[0] - r) * t; g += (P.cool[1] - g) * t; b += (P.cool[2] - b) * t;
			// shadows from trees, fence, bench and reeds
			t = shade[i] * shadowK;
			if (t > 0) {
				r += (sr - r) * t;
				g += (sg - g) * t;
				b += (sb - b) * t;
			}
			const gr = grain[i] * 0.05;
			const o = i * 4;
			data[o] = r + gr;
			data[o + 1] = g + gr;
			data[o + 2] = b + gr;
			data[o + 3] = 255;
		}
		yield;
	}
	wctx.putImageData(img, 0, 0);
	yield;

	// ice details
	wctx.save();
	wctx.clip(L.pondPath);
	wctx.lineCap = 'round';
	wctx.lineWidth = 1;
	for (const s of L.scratches) {
		wctx.strokeStyle = `rgba(255,255,255,${s.alpha})`;
		wctx.beginPath();
		wctx.ellipse(s.x, s.y, s.rx, s.ry, s.rot, s.a0, s.a1);
		wctx.stroke();
	}
	for (const c of L.cracks) {
		for (const [dx, color, a] of [
			[0, '#fff', c.alpha],
			[1, 'rgb(20,30,70)', c.alpha * 0.35]
		] as const) {
			wctx.globalAlpha = a;
			wctx.strokeStyle = color;
			wctx.beginPath();
			wctx.moveTo(c.pts[0] + dx, c.pts[1] + dx);
			for (let k = 2; k < c.pts.length; k += 2) wctx.lineTo(c.pts[k] + dx, c.pts[k + 1] + dx);
			wctx.stroke();
		}
	}
	wctx.globalAlpha = 1;
	for (const b of L.bubbles) {
		wctx.fillStyle = `rgba(255,255,255,${b.alpha})`;
		wctx.beginPath();
		wctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
		wctx.fill();
	}
	wctx.restore();
	yield;

	// footprints, rocks, reeds
	wctx.fillStyle = rgb(P.snowShade.map((v) => v * 0.82) as RGB, 0.9);
	for (const f of L.footprints) wctx.fillRect(f.x, f.y, 2, 1);
	for (const r of L.rocks) {
		wctx.fillStyle = rgb(P.earth.map((v) => v * 0.6) as RGB);
		wctx.beginPath();
		wctx.ellipse(r.x, r.y, r.r * 1.2, r.r * 0.8, 0, 0, Math.PI * 2);
		wctx.fill();
		wctx.fillStyle = rgb(P.snow);
		wctx.beginPath();
		wctx.ellipse(r.x - r.r * 0.1, r.y - r.r * 0.3, r.r * 0.95, r.r * 0.5, 0, 0, Math.PI * 2);
		wctx.fill();
	}
	wctx.lineWidth = 1;
	wctx.lineCap = 'round';
	for (const r of L.reeds) {
		const [tx, ty] = VP(r.tx, r.ty, r.h);
		wctx.strokeStyle = P.reed[r.c];
		wctx.beginPath();
		wctx.moveTo(r.x, r.y);
		wctx.lineTo(tx, ty);
		wctx.stroke();
		if (r.head) {
			wctx.fillStyle = P.woodDark;
			wctx.fillRect(Math.round(tx), Math.round(ty), 1, 2);
		}
	}
	yield;

	// ordered dithering + posterisation for that soft pixel-print texture
	const STEP = 9;
	for (let y0 = 0; y0 < H; y0 += ROWS) {
		const rows = Math.min(ROWS, H - y0);
		const strip = wctx.getImageData(0, y0, W, rows);
		const d = strip.data;
		for (let y = 0; y < rows; y++) {
			const by = ((y0 + y) & 3) << 2;
			for (let x = 0; x < W; x++) {
				const o = (y * W + x) * 4;
				const t = (BAYER[by | (x & 3)] / 16 - 0.47) * STEP;
				d[o] = Math.round((d[o] + t) / STEP) * STEP;
				d[o + 1] = Math.round((d[o + 1] + t) / STEP) * STEP;
				d[o + 2] = Math.round((d[o + 2] + t) / STEP) * STEP;
			}
		}
		wctx.putImageData(strip, 0, y0);
		yield;
	}
	// copy into a plain (GPU-friendly) canvas for blitting every frame
	const bg = makeCanvas(W, H);
	bg.getContext('2d')!.drawImage(work, 0, 0);
	yield;

	// ---------- foreground: things with height ----------
	const fg = makeCanvas(W, H);
	const fctx = fg.getContext('2d')!;
	fctx.lineCap = 'round';
	fctx.lineJoin = 'round';
	const line = (a: [number, number], b: [number, number]) => {
		fctx.beginPath();
		fctx.moveTo(a[0], a[1]);
		fctx.lineTo(b[0], b[1]);
		fctx.stroke();
	};

	fctx.lineWidth = 1;
	L.fence.forEach((f, i) => {
		const top = VP(f.x, f.y, FH);
		fctx.strokeStyle = P.woodDark;
		line([f.x, f.y], top);
		if (i > 0) {
			const g = L.fence[i - 1];
			fctx.strokeStyle = P.wood;
			for (const z of [FH * 0.55, FH * 0.95]) line(VP(g.x, g.y, z), VP(f.x, f.y, z));
		}
		fctx.fillStyle = P.barkSnow;
		fctx.fillRect(Math.round(top[0]), Math.round(top[1]) - 1, 1, 1);
	});

	const poly = (pts: P3[], color: string) => {
		fctx.beginPath();
		pts.forEach((p, i) => {
			const [x, y] = VP(p.x, p.y, p.z);
			if (i === 0) fctx.moveTo(x, y);
			else fctx.lineTo(x, y);
		});
		fctx.closePath();
		fctx.fillStyle = color;
		fctx.fill();
	};
	fctx.strokeStyle = P.woodDark;
	for (const l of L.bench.legs) line(VP(l.x, l.y, 0), VP(l.x, l.y, 4));
	const drawBack = () => poly(L.bench.back, P.woodDark);
	const drawSeat = () => {
		poly(L.bench.seat, P.wood);
		poly(L.bench.snow, P.barkSnow);
	};
	if (L.bench.backFirst) {
		drawBack();
		drawSeat();
	} else {
		drawSeat();
		drawBack();
	}

	// lamp posts (their light is drawn live, so it can fade with the climate)
	for (const l of L.lamps) {
		const [tx, ty] = VP(l.x, l.y, LAMP_H);
		fctx.strokeStyle = '#2a2a33';
		fctx.lineWidth = 1.5;
		line([l.x, l.y], [tx, ty]);
		fctx.fillStyle = '#3a3a44';
		fctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 2, 3, 3);
		fctx.fillStyle = P.barkSnow;
		fctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 3, 3, 1);
	}
	yield;

	const hex = (h: string): RGB => {
		const v = parseInt(h.slice(1), 16);
		return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
	};
	const blend = (h: string, c: RGB, t: number) => {
		const a = hex(h);
		return rgb([lerp(a[0], c[0], t), lerp(a[1], c[1], t), lerp(a[2], c[2], t)]);
	};
	const treeColors = {
		bark: P.bark,
		twig: blend(P.bark, P.snowShade, 0.25),
		needle: P.pine,
		needleLight: P.pineLight,
		snow: P.barkSnow,
		shrub: blend(P.wood, hex(P.bark), 0.4),
		litSide: L.sun.x > 0 ? -1 : 1
	};
	let batch = 0;
	for (const t of L.trees) {
		// a soft snow hollow at the base
		fctx.fillStyle = rgb(P.snowShade, 0.6);
		fctx.beginPath();
		fctx.ellipse(t.x, t.y + 0.5, t.kind === 'spruce' ? 5 : 3.5, 1.4, 0, 0, Math.PI * 2);
		fctx.fill();
		// each tree gets its own fixed random stream, so snow speckles land in
		// the same places in every climate and crossfades don't shimmer
		drawTree(fctx, t, VP, treeColors, mulberry32(t.rng));
		if (++batch % 2 === 0) yield;
	}

	return { bg, fg };
}
