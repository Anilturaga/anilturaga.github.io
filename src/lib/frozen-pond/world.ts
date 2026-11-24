import { mulberry32, createNoise, clamp, lerp, smoothstep } from './noise';
import { growBroadleaf, growSpruce, growShrub, drawTree, drawTreeShadow, type Tree } from './trees';

export type RGB = [number, number, number];

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
	shadow: string;
	shadowAlpha: number;
	bark: string;
	barkSnow: string;
	pine: string;
	pineLight: string;
	reed: string[];
	wood: string;
	woodDark: string;
	trail: string;
	/** multiplier applied to the skater's colours so they sit in the scene's light */
	ambient: RGB;
	lampsLit: boolean;
	snowAmount: [number, number];
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
		shadow: '#34408a',
		shadowAlpha: 0.42,
		bark: '#5a4448',
		barkSnow: '#ece4ee',
		pine: '#3a4a58',
		pineLight: '#56687a',
		reed: ['#c9a46a', '#a8834f', '#dcc08a'],
		wood: '#8a5a44',
		woodDark: '#5e3c30',
		trail: 'rgba(244,242,255,0.62)',
		ambient: [1, 0.95, 0.96],
		lampsLit: false,
		snowAmount: [0.6, 1]
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
		shadow: '#3f5e98',
		shadowAlpha: 0.38,
		bark: '#4e3c36',
		barkSnow: '#ffffff',
		pine: '#2f4a46',
		pineLight: '#4a6a60',
		reed: ['#d4ae6c', '#b08a52', '#e6c890'],
		wood: '#91603f',
		woodDark: '#62402c',
		trail: 'rgba(255,255,255,0.7)',
		ambient: [1, 1, 1],
		lampsLit: false,
		snowAmount: [0.2, 0.6]
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
		shadow: '#4c5a68',
		shadowAlpha: 0.24,
		bark: '#4a4442',
		barkSnow: '#f0f0f0',
		pine: '#3c4a48',
		pineLight: '#566462',
		reed: ['#b8a07a', '#988060', '#cdb894'],
		wood: '#7a5c4a',
		woodDark: '#544034',
		trail: 'rgba(250,250,252,0.6)',
		ambient: [0.96, 0.97, 0.98],
		lampsLit: false,
		snowAmount: [0.8, 1.3]
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
		shadow: '#10183a',
		shadowAlpha: 0.5,
		bark: '#2c2834',
		barkSnow: '#aab4d8',
		pine: '#1c2834',
		pineLight: '#2c3c4c',
		reed: ['#7c6e66', '#5e544e', '#958478'],
		wood: '#4a3a3a',
		woodDark: '#2e2428',
		trail: 'rgba(200,214,255,0.55)',
		ambient: [0.55, 0.6, 0.82],
		lampsLit: true,
		snowAmount: [0.5, 1]
	}
];

export const TILT = 0.5; // how much height lifts things up the screen (oblique top-down view)
export const SHADOW_K = 1.55; // how far shadows stretch per unit of height

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

export interface World {
	seed: number;
	W: number;
	H: number;
	palette: Palette;
	pond: Pond;
	sun: { x: number; y: number }; // direction shadows are cast
	bg: HTMLCanvasElement;
	fg: HTMLCanvasElement;
	glints: { x: number; y: number; p: number; s: number }[];
	wind: number;
	snowDensity: number;
	start: { x: number; y: number };
	musicRoot: number;
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

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Ordered dithering + posterisation for that soft pixel-print texture. */
function dither(ctx: CanvasRenderingContext2D, w: number, h: number, step: number) {
	const img = ctx.getImageData(0, 0, w, h);
	const d = img.data;
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = (y * w + x) * 4;
			if (d[i + 3] === 0) continue;
			const t = (BAYER[((y & 3) << 2) | (x & 3)] / 16 - 0.47) * step;
			for (let c = 0; c < 3; c++) {
				const v = Math.round((d[i + c] + t) / step) * step;
				d[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
			}
		}
	}
	ctx.putImageData(img, 0, 0);
}

export function generateWorld(seed: number): World {
	const rand = mulberry32(seed);
	const N = createNoise(rand);
	const N2 = createNoise(rand);
	const W = 840;
	const H = 660;
	const palette = PALETTES[Math.floor(rand() * PALETTES.length)];

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
	const wind = (rand() - 0.5) * 2;
	const snowDensity = lerp(palette.snowAmount[0], palette.snowAmount[1], rand());

	const sdf = (x: number, y: number) => pondSdf(pond, x, y);

	// ---------- ground pixels ----------
	const bg = makeCanvas(W, H);
	const bctx = bg.getContext('2d', { willReadFrequently: true })!;
	const img = bctx.createImageData(W, H);
	const data = img.data;
	const gx = pond.cx - sun.x * W * 0.62;
	const gy = pond.cy - sun.y * H * 0.62;
	const cw = Math.cos(windAng);
	const sw = Math.sin(windAng);
	const P = palette;
	const col: RGB = [0, 0, 0];
	const mix = (c: RGB, t: number) => {
		col[0] += (c[0] - col[0]) * t;
		col[1] += (c[1] - col[1]) * t;
		col[2] += (c[2] - col[2]) * t;
	};

	for (let y = 0; y < H; y++) {
		for (let x = 0; x < W; x++) {
			const d = sdf(x, y);
			const u = x * cw + y * sw;
			const v = -x * sw + y * cw;
			if (d < 0) {
				col[0] = P.ice[0];
				col[1] = P.ice[1];
				col[2] = P.ice[2];
				const deep = N.fbm(x * 0.0055, y * 0.0055, 4);
				mix(P.iceDeep, smoothstep(0.42, 0.75, deep) * 0.85);
				// wind-blown streaks of powder over the ice
				const streak = N2.fbm(u * 0.0035, v * 0.028, 3);
				mix(P.iceLight, smoothstep(0.55, 0.82, streak) * 0.6);
				const patch = N2.fbm(x * 0.012 + 40, y * 0.012, 3);
				mix(P.iceLight, smoothstep(0.62, 0.78, patch) * 0.35);
				// drifted snow against the bank
				const edge = smoothstep(-16, 0, d + (N.noise(x * 0.06, y * 0.06) - 0.5) * 10);
				mix(P.iceLight, edge * 0.7);
				// a thin bright rim where ice meets the bank
				mix(P.snow, smoothstep(-2.5, 0, d) * 0.6);
			} else {
				col[0] = P.snow[0];
				col[1] = P.snow[1];
				col[2] = P.snow[2];
				const n = N.fbm(x * 0.018, y * 0.018, 4);
				mix(P.snowShade, smoothstep(0.35, 0.8, n) * 0.7);
				const ripple = N2.fbm(u * 0.01, v * 0.06, 2);
				mix(P.snowShade, smoothstep(0.6, 0.85, ripple) * 0.35);
				const earth = N2.fbm(x * 0.03 + 90, y * 0.03, 3);
				mix(P.earth, smoothstep(0.72, 0.82, earth) * 0.25 * smoothstep(20, 80, d));
				// the bank lip: a soft shaded band just above the ice
				const lip = 1 - smoothstep(0, 9, d);
				mix(P.snowShade, lip * 0.5);
				mix(P.iceDeep, (1 - smoothstep(0, 2.5, d)) * 0.35);
			}
			// low sun wash + cool falloff
			const gd = ((x - gx) ** 2 + (y - gy) ** 2) / (W * W * 0.42);
			const g = Math.exp(-gd);
			mix(P.glow, g * P.glowStrength);
			mix(P.cool, (1 - g) * 0.14);
			const grain = (N.noise(x * 0.9, y * 0.9) - 0.5) * 5;
			const i = (y * W + x) * 4;
			data[i] = col[0] + grain;
			data[i + 1] = col[1] + grain;
			data[i + 2] = col[2] + grain;
			data[i + 3] = 255;
		}
	}
	bctx.putImageData(img, 0, 0);

	// pond outline path for clipping ice details
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

	// ---------- ice details: old scratches, cracks, bubbles ----------
	bctx.save();
	bctx.clip(pondPath);
	bctx.lineCap = 'round';
	for (let i = 0; i < 22; i++) {
		const p = randomIcePoint(30);
		const r = 20 + rand() * 120;
		const a0 = rand() * Math.PI * 2;
		bctx.strokeStyle = `rgba(255,255,255,${0.04 + rand() * 0.07})`;
		bctx.lineWidth = 1;
		bctx.beginPath();
		bctx.ellipse(p.x, p.y, r, r * (0.3 + rand() * 0.7), rand() * 3, a0, a0 + 0.6 + rand() * 2);
		bctx.stroke();
	}
	const crack = (x: number, y: number, ang: number, steps: number, alpha: number, depth: number) => {
		bctx.beginPath();
		bctx.moveTo(x, y);
		const pts: [number, number][] = [];
		for (let s = 0; s < steps; s++) {
			ang += (rand() - 0.5) * 0.25 + (rand() < 0.08 ? (rand() - 0.5) * 1.6 : 0);
			x += Math.cos(ang) * 3;
			y += Math.sin(ang) * 3;
			bctx.lineTo(x, y);
			pts.push([x, y]);
		}
		bctx.strokeStyle = `rgba(255,255,255,${alpha})`;
		bctx.lineWidth = 1;
		bctx.stroke();
		bctx.save();
		bctx.translate(1, 1);
		bctx.strokeStyle = `rgba(20,30,70,${alpha * 0.35})`;
		bctx.stroke();
		bctx.restore();
		if (depth > 0) {
			for (const [px, py] of pts) {
				if (rand() < 0.06) crack(px, py, ang + (rand() < 0.5 ? 1 : -1) * (0.6 + rand()), 6 + rand() * 14, alpha * 0.7, depth - 1);
			}
		}
	};
	for (let i = 0; i < 6; i++) {
		const p = randomIcePoint(20);
		crack(p.x, p.y, rand() * Math.PI * 2, 15 + rand() * 50, 0.28 + rand() * 0.2, 2);
	}
	for (let i = 0; i < 14; i++) {
		const p = randomIcePoint(30);
		const n = 4 + rand() * 14;
		for (let j = 0; j < n; j++) {
			const bx = p.x + (rand() - 0.5) * 26;
			const by = p.y + (rand() - 0.5) * 26;
			const r = 0.6 + rand() * 1.6;
			bctx.fillStyle = `rgba(255,255,255,${0.15 + rand() * 0.25})`;
			bctx.beginPath();
			bctx.arc(bx, by, r, 0, Math.PI * 2);
			bctx.fill();
		}
	}
	bctx.restore();

	// ---------- shore objects ----------
	const shorePoint = (th: number, off: number) => {
		// march outward from the pond centre along a normalised angle until we hit the offset
		const f = pondRadius(pond, th);
		let t = f;
		for (let i = 0; i < 200; i++) {
			const x = pond.cx + Math.cos(th) * pond.rx * t;
			const y = pond.cy + Math.sin(th) * pond.ry * t;
			if (sdf(x, y) >= off) return { x, y };
			t += 0.004;
		}
		return { x: pond.cx + Math.cos(th) * pond.rx * t, y: pond.cy + Math.sin(th) * pond.ry * t };
	};

	const shadow = makeCanvas(W, H);
	const sctx = shadow.getContext('2d')!;
	sctx.fillStyle = sctx.strokeStyle = '#000';
	sctx.lineCap = 'round';
	sctx.lineJoin = 'round';
	const fg = makeCanvas(W, H);
	const fctx = fg.getContext('2d')!;
	fctx.lineCap = 'round';
	fctx.lineJoin = 'round';

	const SP = (x: number, y: number, z: number): [number, number] => [
		x + sun.x * z * SHADOW_K,
		y + sun.y * z * SHADOW_K
	];
	const VP = (x: number, y: number, z: number): [number, number] => [x, y - z * TILT];

	// trees: pick spots on the banks, denser close to the water
	const trees: Tree[] = [];
	const taken: { x: number; y: number; r: number }[] = [];
	const free = (x: number, y: number, r: number) =>
		taken.every((t) => (t.x - x) ** 2 + (t.y - y) ** 2 > (t.r + r) ** 2);
	const forest = createNoise(rand);
	const roll0 = rand;
	for (let tries = 0; tries < 1600 && trees.length < 46; tries++) {
		const x = rand() * W;
		const y = rand() * (H + 80);
		const d = sdf(x, y);
		if (d < 10) continue;
		if (rand() > (d < 110 ? 0.75 : 0.25)) continue;
		const f = forest.fbm(x * 0.006, y * 0.006, 3);
		// keep trees on the near (south) bank shorter so they don't hide the ice
		const southBank = y > pond.cy && d < 90;
		if (southBank && d < 28 && roll0() > 0.3) continue;
		const south = southBank ? 0.5 : 1;
		const roll = rand();
		if (roll < 0.25 && d < 70) {
			if (!free(x, y, 5)) continue;
			taken.push({ x, y, r: 5 });
			const h = 10 + rand() * 9;
			trees.push({ kind: 'shrub', x, y, h, segs: growShrub(rand, h) });
		} else if (f > 0.56) {
			if (!free(x, y, 11)) continue;
			taken.push({ x, y, r: 11 });
			const h = (55 + rand() * 60) * south;
			trees.push({ kind: 'spruce', x, y, h, segs: growSpruce(rand, h, h * (0.2 + rand() * 0.05)) });
		} else {
			if (!free(x, y, 16)) continue;
			taken.push({ x, y, r: 16 });
			const h = (95 + rand() * 80) * south;
			trees.push({ kind: 'broadleaf', x, y, h, segs: growBroadleaf(rand, h) });
		}
	}

	// tree shadows
	for (const t of trees) drawTreeShadow(sctx, t, SP);

	// reeds poking through the snow near the water
	const reeds: { x: number; y: number; tx: number; ty: number; h: number; c: string }[] = [];
	for (let i = 0; i < 70; i++) {
		const th = rand() * Math.PI * 2;
		const p = shorePoint(th, 3 + rand() * 30);
		const n = 3 + Math.floor(rand() * 7);
		for (let j = 0; j < n; j++) {
			const x = p.x + (rand() - 0.5) * 10;
			const y = p.y + (rand() - 0.5) * 6;
			const h = 4 + rand() * 9;
			reeds.push({
				x,
				y,
				tx: x + (rand() - 0.5) * 4,
				ty: y + (rand() - 0.5) * 2,
				h,
				c: P.reed[Math.floor(rand() * P.reed.length)]
			});
		}
	}
	sctx.lineWidth = 1;
	for (const r of reeds) {
		const [sx, sy] = SP(r.tx, r.ty, r.h);
		sctx.beginPath();
		sctx.moveTo(r.x, r.y);
		sctx.lineTo(sx, sy);
		sctx.stroke();
	}

	// rocks
	const rocks: { x: number; y: number; r: number }[] = [];
	for (let i = 0; i < 16; i++) {
		const p = shorePoint(rand() * Math.PI * 2, 4 + rand() * 50);
		const r = 2 + rand() * 5;
		rocks.push({ ...p, r });
		sctx.beginPath();
		sctx.ellipse(p.x + sun.x * r * 1.3, p.y + sun.y * r * 1.3, r * 1.4, r * 0.9, Math.atan2(sun.y, sun.x), 0, Math.PI * 2);
		sctx.fill();
	}

	// fence along part of the bank
	const fenceTh = rand() * Math.PI * 2;
	const fenceSpan = 0.6 + rand() * 0.7;
	const fence: { x: number; y: number }[] = [];
	for (let a = 0; a < fenceSpan; a += 0.018) fence.push(shorePoint(fenceTh + a, 40));
	const FH = 7;
	sctx.lineWidth = 1;
	for (let i = 0; i < fence.length; i++) {
		const f = fence[i];
		const [tx, ty] = SP(f.x, f.y, FH);
		sctx.beginPath();
		sctx.moveTo(f.x, f.y);
		sctx.lineTo(tx, ty);
		sctx.stroke();
		if (i > 0) {
			const g = fence[i - 1];
			for (const z of [FH * 0.55, FH * 0.95]) {
				const [ax, ay] = SP(g.x, g.y, z);
				const [bx, by] = SP(f.x, f.y, z);
				sctx.beginPath();
				sctx.moveTo(ax, ay);
				sctx.lineTo(bx, by);
				sctx.stroke();
			}
		}
	}

	// bench + lamp
	const benchTh = fenceTh + fenceSpan + 0.25 + rand() * 1.5;
	const bench = shorePoint(benchTh, 22);
	const bnx = pond.cx - bench.x;
	const bny = pond.cy - bench.y;
	const bnm = Math.hypot(bnx, bny);
	const bn = { x: bnx / bnm, y: bny / bnm };
	const bt = { x: -bn.y, y: bn.x };
	const bq = (along: number, out: number, z: number) => ({
		x: bench.x + bt.x * along + bn.x * out,
		y: bench.y + bt.y * along + bn.y * out,
		z
	});
	const seat = [bq(-7, -1.8, 4), bq(7, -1.8, 4), bq(7, 1.8, 4), bq(-7, 1.8, 4)];
	const back = [bq(-7, -2.6, 5), bq(7, -2.6, 5), bq(7, -2.6, 9), bq(-7, -2.6, 9)];
	const benchLegs = [bq(-6, -1.5, 0), bq(6, -1.5, 0), bq(-6, 1.5, 0), bq(6, 1.5, 0)];
	const poly = (ctx: CanvasRenderingContext2D, pts: { x: number; y: number; z: number }[], proj: typeof SP) => {
		ctx.beginPath();
		pts.forEach((p, i) => {
			const [x, y] = proj(p.x, p.y, p.z);
			if (i === 0) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		});
		ctx.closePath();
	};
	poly(sctx, seat, SP);
	sctx.fill();
	poly(sctx, back, SP);
	sctx.fill();
	for (const l of benchLegs) {
		const [ax, ay] = SP(l.x, l.y, 0);
		const [bx, by] = SP(l.x, l.y, 4);
		sctx.beginPath();
		sctx.moveTo(ax, ay);
		sctx.lineTo(bx, by);
		sctx.stroke();
	}

	const lamps = [shorePoint(benchTh + 0.07, 30), shorePoint(benchTh + Math.PI * (0.7 + rand() * 0.6), 26)];
	const LH = 26;
	sctx.lineWidth = 1.5;
	for (const l of lamps) {
		const [tx, ty] = SP(l.x, l.y, LH);
		sctx.beginPath();
		sctx.moveTo(l.x, l.y);
		sctx.lineTo(tx, ty);
		sctx.stroke();
		sctx.beginPath();
		sctx.arc(tx, ty, 2, 0, Math.PI * 2);
		sctx.fill();
	}

	// composite shadows in one pass so overlaps don't double up
	const tint = makeCanvas(W, H);
	const tctx = tint.getContext('2d')!;
	tctx.drawImage(shadow, 0, 0);
	tctx.globalCompositeOperation = 'source-in';
	tctx.fillStyle = P.shadow;
	tctx.fillRect(0, 0, W, H);
	bctx.globalAlpha = P.shadowAlpha;
	bctx.drawImage(tint, 0, 0);
	bctx.globalAlpha = 1;

	// lamp light pools at night
	if (P.lampsLit) {
		bctx.globalCompositeOperation = 'lighter';
		for (const l of lamps) {
			const g = bctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, 70);
			g.addColorStop(0, 'rgba(255,170,90,0.35)');
			g.addColorStop(0.5, 'rgba(200,120,70,0.12)');
			g.addColorStop(1, 'rgba(0,0,0,0)');
			bctx.fillStyle = g;
			bctx.fillRect(l.x - 70, l.y - 70, 140, 140);
		}
		bctx.globalCompositeOperation = 'source-over';
	}

	// footprints wandering along the bank
	{
		let th = benchTh;
		let off = 18;
		bctx.fillStyle = rgb(P.snowShade.map((v) => v * 0.82) as RGB, 0.9);
		for (let i = 0; i < 160; i++) {
			th += 0.006 + (rand() - 0.5) * 0.004;
			off = clamp(off + (rand() - 0.5) * 3, 8, 60);
			const p = shorePoint(th, off);
			const q = shorePoint(th + 0.003, off);
			const dx = q.x - p.x;
			const dy = q.y - p.y;
			const m = Math.hypot(dx, dy) || 1;
			const side = i % 2 === 0 ? 1.4 : -1.4;
			bctx.fillRect(Math.round(p.x - (dy / m) * side), Math.round(p.y + (dx / m) * side), 2, 1);
		}
	}

	// rocks
	for (const r of rocks) {
		bctx.fillStyle = rgb(P.earth.map((v) => v * 0.6) as RGB);
		bctx.beginPath();
		bctx.ellipse(r.x, r.y, r.r * 1.2, r.r * 0.8, 0, 0, Math.PI * 2);
		bctx.fill();
		bctx.fillStyle = rgb(P.snow);
		bctx.beginPath();
		bctx.ellipse(r.x - r.r * 0.1, r.y - r.r * 0.3, r.r * 0.95, r.r * 0.5, 0, 0, Math.PI * 2);
		bctx.fill();
	}

	// reeds
	bctx.lineWidth = 1;
	bctx.lineCap = 'round';
	for (const r of reeds) {
		const [tx, ty] = VP(r.tx, r.ty, r.h);
		bctx.strokeStyle = r.c;
		bctx.beginPath();
		bctx.moveTo(r.x, r.y);
		bctx.lineTo(tx, ty);
		bctx.stroke();
		if (r.h > 8 && (r.x * 7 + r.y * 13) % 3 < 1.2) {
			bctx.fillStyle = P.woodDark;
			bctx.fillRect(Math.round(tx), Math.round(ty), 1, 2);
		}
	}

	dither(bctx, W, H, 9);

	// ---------- foreground: things with height ----------
	// fence
	fctx.lineWidth = 1;
	for (let i = 0; i < fence.length; i++) {
		const f = fence[i];
		const [tx, ty] = VP(f.x, f.y, FH);
		fctx.strokeStyle = P.woodDark;
		fctx.beginPath();
		fctx.moveTo(f.x, f.y);
		fctx.lineTo(tx, ty);
		fctx.stroke();
		if (i > 0) {
			const g = fence[i - 1];
			fctx.strokeStyle = P.wood;
			for (const z of [FH * 0.55, FH * 0.95]) {
				const [ax, ay] = VP(g.x, g.y, z);
				const [bx, by] = VP(f.x, f.y, z);
				fctx.beginPath();
				fctx.moveTo(ax, ay);
				fctx.lineTo(bx, by);
				fctx.stroke();
			}
		}
		fctx.fillStyle = P.barkSnow;
		fctx.fillRect(Math.round(tx), Math.round(ty) - 1, 1, 1);
	}

	// bench
	fctx.strokeStyle = P.woodDark;
	for (const l of benchLegs) {
		const [ax, ay] = VP(l.x, l.y, 0);
		const [bx, by] = VP(l.x, l.y, 4);
		fctx.beginPath();
		fctx.moveTo(ax, ay);
		fctx.lineTo(bx, by);
		fctx.stroke();
	}
	const drawBack = () => {
		poly(fctx, back, VP);
		fctx.fillStyle = P.woodDark;
		fctx.fill();
	};
	const drawSeat = () => {
		poly(fctx, seat, VP);
		fctx.fillStyle = P.wood;
		fctx.fill();
		poly(
			fctx,
			[bq(-5, -1, 4.2), bq(4, -1.2, 4.2), bq(3, 0.8, 4.2), bq(-4.5, 1, 4.2)],
			VP
		);
		fctx.fillStyle = P.barkSnow;
		fctx.fill();
	};
	// whichever piece is further "north" on screen draws first
	if (bn.y < 0) {
		drawSeat();
		drawBack();
	} else {
		drawBack();
		drawSeat();
	}

	// lamps
	for (const l of lamps) {
		const [tx, ty] = VP(l.x, l.y, LH);
		fctx.strokeStyle = '#2a2a33';
		fctx.lineWidth = 1.5;
		fctx.beginPath();
		fctx.moveTo(l.x, l.y);
		fctx.lineTo(tx, ty);
		fctx.stroke();
		if (P.lampsLit) {
			const g = fctx.createRadialGradient(tx, ty, 0, tx, ty, 16);
			g.addColorStop(0, 'rgba(255,214,150,0.9)');
			g.addColorStop(0.25, 'rgba(255,170,90,0.35)');
			g.addColorStop(1, 'rgba(255,150,80,0)');
			fctx.fillStyle = g;
			fctx.fillRect(tx - 16, ty - 16, 32, 32);
			fctx.fillStyle = '#fff2d0';
		} else {
			fctx.fillStyle = '#3a3a44';
		}
		fctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 2, 3, 3);
		fctx.fillStyle = P.barkSnow;
		fctx.fillRect(Math.round(tx) - 1, Math.round(ty) - 3, 3, 1);
	}

	// trees, back to front
	trees.sort((a, b) => a.y - b.y);
	const hex = (h: string): RGB => {
		const n = parseInt(h.slice(1), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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
		litSide: sun.x > 0 ? -1 : 1
	};
	for (const t of trees) {
		// a soft snow hollow at the base
		fctx.fillStyle = rgb(P.snowShade, 0.6);
		fctx.beginPath();
		fctx.ellipse(t.x, t.y + 0.5, t.kind === 'spruce' ? 5 : 3.5, 1.4, 0, 0, Math.PI * 2);
		fctx.fill();
		drawTree(fctx, t, VP, treeColors, rand);
	}

	// sparkling points on the ice
	const glints: World['glints'] = [];
	for (let i = 0; i < 220; i++) {
		const p = randomIcePoint(6);
		glints.push({ x: Math.round(p.x), y: Math.round(p.y), p: rand() * 100, s: 0.4 + rand() * 1.2 });
	}

	const roots = [48, 50, 52, 53, 55];
	return {
		seed,
		W,
		H,
		palette,
		pond,
		sun,
		bg,
		fg,
		glints,
		wind,
		snowDensity,
		// begin near the bank the sun is behind, so the long shadows stretch out in front of you
		start: (() => {
			const th = Math.atan2(-sun.y * pond.rx, -sun.x * pond.ry);
			const b = shorePoint(th, 0);
			const dx = pond.cx - b.x;
			const dy = pond.cy - b.y;
			const m = Math.hypot(dx, dy) || 1;
			const p = { x: b.x + (dx / m) * 105, y: b.y + (dy / m) * 105 };
			return sdf(p.x, p.y) < -20 ? p : { x: pond.cx, y: pond.cy };
		})(),
		musicRoot: roots[Math.floor(rand() * roots.length)]
	};
}
