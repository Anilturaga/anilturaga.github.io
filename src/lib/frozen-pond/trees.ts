import type { Rand } from './noise';

/**
 * Trees are grown as 3D line skeletons. The same skeleton is drawn twice:
 * once through the slightly tilted camera, and once flattened along the sun
 * direction to make the long shadow across the snow and ice.
 */

export interface Seg {
	x0: number;
	y0: number;
	z0: number;
	x1: number;
	y1: number;
	z1: number;
	/** thickness in world pixels */
	w: number;
	/** branching order: 0 = trunk, higher = finer */
	o: number;
	/** 0 = wood, 1 = needles */
	k: 0 | 1;
	/** carries snow on top */
	snow: boolean;
}

export type Tree = { kind: 'broadleaf' | 'spruce' | 'shrub'; x: number; y: number; segs: Seg[]; h: number };

type V = [number, number, number];
const norm = (v: V): V => {
	const m = Math.hypot(v[0], v[1], v[2]) || 1;
	return [v[0] / m, v[1] / m, v[2] / m];
};
const cross = (a: V, b: V): V => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0]
];

/** Rotate `d` away from itself by angle `a`, around a random axis. */
function deviate(d: V, a: number, rand: Rand): V {
	const ref: V = Math.abs(d[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
	const u = norm(cross(d, ref));
	const v = cross(d, u);
	const phi = rand() * Math.PI * 2;
	const c = Math.cos(a);
	const s = Math.sin(a);
	return norm([
		d[0] * c + (u[0] * Math.cos(phi) + v[0] * Math.sin(phi)) * s,
		d[1] * c + (u[1] * Math.cos(phi) + v[1] * Math.sin(phi)) * s,
		d[2] * c + (u[2] * Math.cos(phi) + v[2] * Math.sin(phi)) * s
	]);
}

/** A tall winter broadleaf (elm/birch-like): clear trunk, vase-shaped fractal crown. */
export function growBroadleaf(rand: Rand, H: number): Seg[] {
	const segs: Seg[] = [];
	const MAXO = 8;
	const push = (a: V, b: V, w: number, o: number) =>
		segs.push({ x0: a[0], y0: a[1], z0: a[2], x1: b[0], y1: b[1], z1: b[2], w, o, k: 0, snow: false });

	const rec = (p: V, d: V, len: number, w: number, o: number) => {
		// slight bend within each limb so nothing looks ruler-straight
		const mid: V = [
			p[0] + d[0] * len * 0.5 + (rand() - 0.5) * len * 0.08,
			p[1] + d[1] * len * 0.5 + (rand() - 0.5) * len * 0.08,
			p[2] + d[2] * len * 0.5
		];
		const end: V = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len];
		push(p, mid, w, o);
		push(mid, end, w * 0.92, o);
		if (o >= MAXO || len < 1.2) return;
		const n = o < 4 && rand() < 0.35 ? 3 : 2;
		for (let i = 0; i < n; i++) {
			const lead = i === 0;
			let nd = deviate(d, lead ? 0.15 + rand() * 0.25 : 0.45 + rand() * 0.4, rand);
			// upward tropism, stronger in the scaffold limbs
			nd = norm([nd[0], nd[1], nd[2] + 0.25 * (1 - o / MAXO)]);
			rec(end, nd, len * (lead ? 0.8 : 0.62 + rand() * 0.14), w * (lead ? 0.74 : 0.58), o + 1);
		}
	};

	const w0 = 1.3 + H / 75;
	const clear = H * (0.32 + rand() * 0.16);
	let p: V = [0, 0, 0];
	const lean: V = [(rand() - 0.5) * 0.12, (rand() - 0.5) * 0.12, 1];
	const steps = 5;
	for (let i = 0; i < steps; i++) {
		const q: V = [
			p[0] + (lean[0] * clear) / steps + (rand() - 0.5) * 0.8,
			p[1] + (lean[1] * clear) / steps + (rand() - 0.5) * 0.6,
			p[2] + clear / steps
		];
		push(p, q, w0 * (1 - 0.2 * (i / steps)), 0);
		// the odd low twig off the trunk
		if (i > 1 && rand() < 0.35) {
			const az = rand() * Math.PI * 2;
			rec(q, norm([Math.cos(az), Math.sin(az), 0.8]), H * 0.06, w0 * 0.25, 5);
		}
		p = q;
	}
	const scaffolds = 2 + Math.floor(rand() * 3);
	const az0 = rand() * Math.PI * 2;
	for (let i = 0; i < scaffolds; i++) {
		const az = az0 + (i / scaffolds) * Math.PI * 2 + (rand() - 0.5) * 0.8;
		const spread = 0.35 + rand() * 0.35;
		rec(p, norm([Math.cos(az) * spread, Math.sin(az) * spread, 1]), H * (0.2 + rand() * 0.06), w0 * 0.7, 1);
	}
	rec(p, norm([lean[0], lean[1], 1]), H * 0.22, w0 * 0.75, 1);

	// snow lies on the flatter, thicker limbs
	for (const s of segs) {
		const dz = Math.abs(s.z1 - s.z0) / (Math.hypot(s.x1 - s.x0, s.y1 - s.y0, s.z1 - s.z0) || 1);
		s.snow = s.w > 0.55 && dz < 0.75 && rand() < 0.75;
	}
	return segs;
}

/** A Norway-spruce-like conifer: whorls of drooping, needled branches. */
export function growSpruce(rand: Rand, H: number, R: number): Seg[] {
	const segs: Seg[] = [];
	const push = (a: V, b: V, w: number, o: number, k: 0 | 1, snow: boolean) =>
		segs.push({ x0: a[0], y0: a[1], z0: a[2], x1: b[0], y1: b[1], z1: b[2], w, o, k, snow });
	push([0, 0, 0], [0, 0, H], 1.4, 0, 0, false);
	let z = H * (0.05 + rand() * 0.04);
	while (z < H * 0.97) {
		const t = z / H;
		const n = 5 + Math.floor(rand() * 4);
		const az0 = rand() * Math.PI * 2;
		for (let i = 0; i < n; i++) {
			const az = az0 + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.7;
			const L = R * Math.pow(1 - t, 0.9) * (0.75 + rand() * 0.45) + 1.2;
			const droop = -0.15 - 0.35 * (1 - t) + (rand() - 0.5) * 0.1;
			const d = norm([Math.cos(az), Math.sin(az), droop]);
			const a: V = [0, 0, z];
			const b: V = [d[0] * L, d[1] * L, z + d[2] * L];
			const snowy = rand() < 0.65;
			push(a, b, 1.3, 1, 1, snowy);
			// needled sprigs hanging off each side
			const px = -Math.sin(az);
			const py = Math.cos(az);
			for (const f of [0.35, 0.6, 0.85]) {
				if (L * f < 1.5) continue;
				const base: V = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
				for (const side of [-1, 1]) {
					const sl = L * 0.32 * (1.1 - f * 0.5) * (0.7 + rand() * 0.5);
					const sd = norm([d[0] * 0.6 + px * side, d[1] * 0.6 + py * side, droop - 0.5]);
					push(base, [base[0] + sd[0] * sl, base[1] + sd[1] * sl, base[2] + sd[2] * sl], 0.9, 2, 1, snowy && rand() < 0.5);
				}
			}
		}
		z += H * (0.045 + rand() * 0.025);
	}
	// the leader at the top
	push([0, 0, H * 0.95], [0, 0, H * 1.04], 0.9, 2, 1, false);
	return segs;
}

/** Low, twiggy winter shrubs: several thin stems from the ground. */
export function growShrub(rand: Rand, H: number): Seg[] {
	const segs: Seg[] = [];
	const rec = (p: V, d: V, len: number, w: number, o: number) => {
		const end: V = [p[0] + d[0] * len, p[1] + d[1] * len, p[2] + d[2] * len];
		segs.push({ x0: p[0], y0: p[1], z0: p[2], x1: end[0], y1: end[1], z1: end[2], w, o, k: 0, snow: false });
		if (o >= 5) return;
		for (let i = 0; i < 2; i++) {
			const nd = norm(deviate(d, 0.3 + rand() * 0.4, rand).map((v, j) => (j === 2 ? v + 0.3 : v)) as V);
			rec(end, nd, len * (0.65 + rand() * 0.2), w * 0.7, o + 1);
		}
	};
	const stems = 3 + Math.floor(rand() * 4);
	for (let i = 0; i < stems; i++) {
		const az = rand() * Math.PI * 2;
		const sp = 0.3 + rand() * 0.6;
		rec([(rand() - 0.5) * 2, (rand() - 0.5) * 1.2, 0], norm([Math.cos(az) * sp, Math.sin(az) * sp, 1]), H * 0.4, 0.9, 2);
	}
	return segs;
}

type Proj = (x: number, y: number, z: number) => [number, number];

/** Opaque silhouette for the shadow layer. */
export function drawTreeShadow(ctx: CanvasRenderingContext2D, t: Tree, SP: Proj) {
	// batch by thickness so thousands of twigs stay cheap
	const groups = new Map<number, Seg[]>();
	for (const s of t.segs) {
		const key = Math.max(1, Math.round(s.w * 1.15 * 2) / 2);
		(groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
	}
	ctx.lineCap = 'round';
	for (const [w, segs] of groups) {
		ctx.lineWidth = w;
		ctx.beginPath();
		for (const s of segs) {
			const [ax, ay] = SP(t.x + s.x0, t.y + s.y0, s.z0);
			const [bx, by] = SP(t.x + s.x1, t.y + s.y1, s.z1);
			ctx.moveTo(ax, ay);
			ctx.lineTo(bx, by);
		}
		ctx.stroke();
	}
}

export interface TreeColors {
	bark: string;
	twig: string;
	needle: string;
	needleLight: string;
	snow: string;
	shrub: string;
	/** which screen side faces the sun: -1 left, 1 right */
	litSide: number;
}

export function drawTree(ctx: CanvasRenderingContext2D, t: Tree, VP: Proj, c: TreeColors, rand: Rand) {
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	const P = (s: Seg, end: 0 | 1) =>
		end ? VP(t.x + s.x1, t.y + s.y1, s.z1) : VP(t.x + s.x0, t.y + s.y0, s.z0);

	if (t.kind === 'spruce') {
		const trunk = t.segs[0];
		const [ax, ay] = P(trunk, 0);
		const [bx, by] = P(trunk, 1);
		ctx.strokeStyle = c.bark;
		ctx.lineWidth = 1.4;
		ctx.beginPath();
		ctx.moveTo(ax, ay);
		ctx.lineTo(bx, by);
		ctx.stroke();
		// branches roughly back-to-front within each whorl so the near ones overlap
		const rest = t.segs.slice(1);
		const passes: [string, number, number][] = [
			[c.needle, 1, 0],
			[c.needleLight, 0.55, -0.6]
		];
		for (const [color, alpha, dy] of passes) {
			ctx.globalAlpha = alpha;
			ctx.strokeStyle = color;
			for (const w of [1.3, 0.9]) {
				ctx.lineWidth = w + (dy ? -0.3 : 0.4);
				ctx.beginPath();
				for (const s of rest) {
					if (s.w !== w) continue;
					const [x0, y0] = P(s, 0);
					const [x1, y1] = P(s, 1);
					ctx.moveTo(x0, y0 + dy);
					ctx.lineTo(x1, y1 + dy);
				}
				ctx.stroke();
			}
		}
		ctx.globalAlpha = 0.9;
		ctx.strokeStyle = c.snow;
		ctx.lineWidth = 1;
		ctx.beginPath();
		for (const s of rest) {
			if (!s.snow) continue;
			const [x0, y0] = P(s, 0);
			const [x1, y1] = P(s, 1);
			const f = 0.25 + rand() * 0.2;
			ctx.moveTo(x0 + (x1 - x0) * f, y0 + (y1 - y0) * f - 0.9);
			ctx.lineTo(x1, y1 - 0.9);
		}
		ctx.stroke();
		ctx.globalAlpha = 1;
		return;
	}

	// broadleaf & shrub: draw coarse to fine; the fine twigs are see-through so
	// the crown reads as a soft, dense haze instead of a cartoon outline
	const base = t.kind === 'shrub' ? c.shrub : c.bark;
	const maxO = Math.max(...t.segs.map((s) => s.o));
	for (let o = 0; o <= maxO; o++) {
		const level = t.segs.filter((s) => s.o === o);
		if (!level.length) continue;
		const groups = new Map<number, Seg[]>();
		for (const s of level) {
			const key = Math.max(1, Math.round(s.w * 2) / 2);
			(groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
		}
		const avgW = level.reduce((a, s) => a + s.w, 0) / level.length;
		ctx.strokeStyle = avgW < 0.9 ? c.twig : base;
		ctx.globalAlpha = avgW >= 1 ? 1 : 0.3 + 0.6 * avgW;
		for (const [w, segs] of groups) {
			ctx.lineWidth = w;
			ctx.beginPath();
			for (const s of segs) {
				const [x0, y0] = P(s, 0);
				const [x1, y1] = P(s, 1);
				ctx.moveTo(x0, y0);
				ctx.lineTo(x1, y1);
			}
			ctx.stroke();
		}
	}
	ctx.globalAlpha = 1;

	// speckles of snow caught on the lit side of the trunk and on the limbs
	ctx.fillStyle = c.snow;
	for (const s of t.segs) {
		if (!(s.snow || (s.o === 0 && s.w > 1))) continue;
		const [x0, y0] = P(s, 0);
		const [x1, y1] = P(s, 1);
		const len = Math.hypot(x1 - x0, y1 - y0);
		const vertical = Math.abs(y1 - y0) > Math.abs(x1 - x0);
		for (let d = 0; d < len; d += 1.5) {
			if (rand() > (s.o === 0 ? 0.45 : 0.6)) continue;
			const f = d / len;
			const x = x0 + (x1 - x0) * f + (vertical ? c.litSide * s.w * 0.45 : 0);
			const y = y0 + (y1 - y0) * f - (vertical ? 0 : s.w * 0.5 + 0.4);
			ctx.globalAlpha = 0.6 + rand() * 0.4;
			ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
		}
	}
	ctx.globalAlpha = 1;
}
