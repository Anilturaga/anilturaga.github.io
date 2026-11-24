import {
	buildLayout,
	paintClimate,
	pondSdf,
	PALETTES,
	TILT,
	SHADOW_K,
	LAMP_H,
	type Layout,
	type Painted,
	type Palette,
	type RGB
} from './world';
import { PondAudio } from './audio';
import { clamp } from './noise';

interface P3 {
	x: number;
	y: number;
	z: number;
}

interface Particle {
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
	life: number;
	max: number;
	sparkle: boolean;
}

interface Flake {
	x: number;
	y: number;
	z: number;
	ph: number;
}

interface Bokeh {
	x: number;
	y: number;
	r: number;
	a: number;
	ph: number;
}

type Skeleton = {
	feet: P3[];
	knees: P3[];
	hips: P3[];
	shoulders: P3[];
	hands: P3[];
	head: P3;
	scarf: P3[];
	f: { x: number; y: number };
};

const MAX_SPEED = 125;
const TURN_RATE = 3.6;
const SIZE = 1.35; // skater scale in world pixels

const smooth = (t: number) => t * t * (3 - 2 * t);
const wrapAngle = (a: number) => {
	while (a > Math.PI) a -= Math.PI * 2;
	while (a < -Math.PI) a += Math.PI * 2;
	return a;
};
const approach = (v: number, target: number, rate: number, dt: number) =>
	v + (target - v) * (1 - Math.exp(-rate * dt));

function tint(hex: string, a: RGB) {
	const n = parseInt(hex.slice(1), 16);
	return `rgb(${(((n >> 16) & 255) * a[0]) | 0},${(((n >> 8) & 255) * a[1]) | 0},${((n & 255) * a[2]) | 0})`;
}

const SKATER_COLORS: Record<string, string> = {
	pants: '#2e3150',
	skate: '#dfe3ec',
	coat: '#efe0c6',
	coatShade: '#c4b096',
	scarf: '#d8462a',
	hat: '#c63a24',
	pom: '#f4ece0',
	skin: '#f1c7a1',
	mitt: '#b5341f'
};

/** The parts of a climate that are applied live, every frame, so they can ease. */
interface Look {
	ambient: RGB;
	shadow: RGB;
	shadowAlpha: number;
	trailAlpha: number;
	lamp: number;
	snowfall: number;
	wind: number;
}
const lookOf = (p: Palette): Look => ({
	ambient: [...p.ambient],
	shadow: [...p.shadow],
	shadowAlpha: p.shadowAlpha,
	trailAlpha: p.trailAlpha,
	lamp: p.lamp,
	snowfall: p.snowfall,
	wind: p.wind
});
const mixLook = (a: Look, b: Look, t: number, out: Look) => {
	const l = (x: number, y: number) => x + (y - x) * t;
	for (let i = 0; i < 3; i++) {
		out.ambient[i] = l(a.ambient[i], b.ambient[i]);
		out.shadow[i] = l(a.shadow[i], b.shadow[i]);
	}
	out.shadowAlpha = l(a.shadowAlpha, b.shadowAlpha);
	out.trailAlpha = l(a.trailAlpha, b.trailAlpha);
	out.lamp = l(a.lamp, b.lamp);
	out.snowfall = l(a.snowfall, b.snowfall);
	out.wind = l(a.wind, b.wind);
};

const WIPE_SECONDS = 0.5;
const MAX_SNOWFALL = 1.6;
// climates are painted while you're still reading the post; once you're playing
// only a sliver of each frame goes to it, so it never competes with the audio
const PAINT_BUDGET_IDLE_MS = 6;
const PAINT_BUDGET_PLAYING_MS = 1.5;
const PAINT_BUDGET_PENDING_MS = 4; // someone is waiting on this climate: hurry a little

/** Soft lamp light, rendered once and stamped with globalAlpha each frame. */
function glowSprite(r: number, stops: [number, string][]) {
	const c = document.createElement('canvas');
	c.width = c.height = r * 2;
	const g = c.getContext('2d')!;
	const grad = g.createRadialGradient(r, r, 0, r, r, r);
	for (const [o, col] of stops) grad.addColorStop(o, col);
	g.fillStyle = grad;
	g.fillRect(0, 0, r * 2, r * 2);
	return c;
}

export type InputKey = 'left' | 'right' | 'up' | 'down';

export class Game {
	world!: Layout;
	readonly audio = new PondAudio();
	onInfo?: (info: { palette: string; seed: number }) => void;

	private ctx: CanvasRenderingContext2D;
	private fxCtx: CanvasRenderingContext2D;
	private shadowCanvas = document.createElement('canvas');
	private sctx = this.shadowCanvas.getContext('2d')!;
	private trail = document.createElement('canvas');
	private tctx = this.trail.getContext('2d')!;
	private sprite = document.createElement('canvas');
	private poolSprite = glowSprite(70, [
		[0, 'rgba(255,170,90,0.35)'],
		[0.5, 'rgba(200,120,70,0.12)'],
		[1, 'rgba(0,0,0,0)']
	]);
	private bulbSprite = glowSprite(16, [
		[0, 'rgba(255,214,150,0.9)'],
		[0.25, 'rgba(255,170,90,0.35)'],
		[1, 'rgba(255,150,80,0)']
	]);

	private dpr = 1;
	private scale = 3;
	private cw = 0;
	private ch = 0;
	private cssW = 0;
	private cssH = 0;
	private cam = { x: 0, y: 0 };
	private ox = 0;
	private oy = 0;

	private s = {
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
		heading: -Math.PI / 2,
		spinVel: 0,
		phase: 0,
		pushW: 0,
		glideW: 0,
		spinW: 0,
		bank: 0,
		/** 0 upright … 1 sprawled on the ice */
		fall: 0,
		/** seconds since the fall began, -1 while upright */
		downT: -1,
		fallDir: 0,
		tumble: 0,
		/** builds up while skidding too hard; past a threshold you go down */
		imb: 0
	};
	private prevBody: { x: number; y: number } | null = null;
	private prevFeet: P3[] | null = null;
	private particles: Particle[] = [];
	private flakes: Flake[] = [];
	private bokeh: Bokeh[] = [];
	private pointer = { x: 0, y: 0, down: false };
	private keys = new Set<InputKey>();
	private raf = 0;
	private running = false;
	private last = 0;
	private t = 0;
	private colors: Record<string, string> = {};
	private shadowCss = '#000';

	// climates: each one is painted once in the background, then crossfaded to
	private painted = new Map<number, Painted>();
	private job: { idx: number; gen: Generator<void, Painted> } | null = null;
	private climate = 0;
	private pending = -1;
	private from!: Painted;
	private to: Painted | null = null;
	private fade = 1;
	private fadeE = 1;
	/** the wipe's direction across the screen */
	private wipe = { dx: 1, dy: 0 };
	private wipePath: Path2D | null = null;
	/** set while the player is in the game (vs. looking at the thumbnail) */
	playing = false;
	private mixes: Painted[] = [];
	private look!: Look;
	private lookFrom!: Look;
	private lookTo!: Look;

	constructor(
		private canvas: HTMLCanvasElement,
		private fx: HTMLCanvasElement
	) {
		this.ctx = canvas.getContext('2d')!;
		this.fxCtx = fx.getContext('2d')!;
		this.sprite.width = this.sprite.height = 64;
		const sp = this.sprite.getContext('2d')!;
		const g = sp.createRadialGradient(32, 32, 0, 32, 32, 32);
		g.addColorStop(0, 'rgba(255,255,255,1)');
		g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
		g.addColorStop(1, 'rgba(255,255,255,0)');
		sp.fillStyle = g;
		sp.fillRect(0, 0, 64, 64);
	}

	regenerate(seed = Math.floor(Math.random() * 1e9)) {
		this.world = buildLayout(seed);
		const w = this.world;
		this.trail.width = w.W;
		this.trail.height = w.H;
		this.tctx.lineCap = 'round';
		Object.assign(this.s, {
			x: w.start.x,
			y: w.start.y,
			vx: 0,
			vy: 0,
			heading: Math.atan2(w.pond.cy - w.start.y, w.pond.cx - w.start.x),
			spinVel: 0,
			pushW: 0,
			glideW: 0,
			spinW: 0,
			fall: 0,
			downT: -1,
			imb: 0
		});
		this.prevBody = null;
		this.prevFeet = null;
		this.particles = [];
		this.cam = { x: w.start.x, y: w.start.y - 20 };

		// the first climate is painted right away; the rest follow in the background
		this.painted.clear();
		this.job = null;
		this.pending = -1;
		this.climate = Math.floor(Math.random() * PALETTES.length);
		const gen = paintClimate(w, PALETTES[this.climate]);
		let r = gen.next();
		while (!r.done) r = gen.next();
		this.painted.set(this.climate, r.value);
		this.from = r.value;
		this.to = null;
		this.fade = this.fadeE = 1;
		this.look = lookOf(PALETTES[this.climate]);
		this.lookFrom = lookOf(PALETTES[this.climate]);
		this.lookTo = lookOf(PALETTES[this.climate]);
		this.applyLook();

		this.audio.root = w.musicRoot;
		this.onInfo?.({ palette: PALETTES[this.climate].name, seed });
	}

	/** Switch to a different climate, keeping the skater, trails and everything else. */
	nextClimate() {
		if (!this.world) return;
		let idx = this.climate;
		while (idx === this.climate) idx = Math.floor(Math.random() * PALETTES.length);
		this.climate = idx;
		this.onInfo?.({ palette: PALETTES[idx].name, seed: this.world.seed });
		if (this.painted.has(idx)) this.fadeTo(idx);
		else this.pending = idx; // fades in as soon as its paint finishes
	}

	private fadeTo(idx: number) {
		const target = this.painted.get(idx)!;
		this.pending = -1;
		if (target === this.to) return;
		if (this.to) {
			// mid-fade: fold what's on screen into a scratch pair and fade on from there
			const m = this.scratchPair();
			const clip = this.wipePath ?? this.buildWipe();
			for (const k of ['bg', 'fg'] as const) {
				const c = m[k].getContext('2d')!;
				c.clearRect(0, 0, m[k].width, m[k].height);
				c.drawImage(this.from[k], 0, 0);
				c.save();
				c.translate(this.ox, this.oy); // the wipe lives in screen space
				c.clip(clip);
				c.drawImage(this.to[k], -this.ox, -this.oy);
				c.restore();
			}
			this.from = m;
		}
		if (target === this.from) {
			this.to = null;
			this.fade = this.fadeE = 1;
		} else {
			this.to = target;
			this.fade = this.fadeE = 0;
			const a = (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.9;
			this.wipe = { dx: Math.cos(a), dy: Math.sin(a) };
		}
		this.lookFrom = { ...this.look, ambient: [...this.look.ambient], shadow: [...this.look.shadow] };
		this.lookTo = lookOf(PALETTES[idx]);
	}

	private scratchPair(): Painted {
		const { W, H } = this.world;
		if (this.mixes.length < 2 || this.mixes[0].bg.width !== W) {
			const mk = () => {
				const c = document.createElement('canvas');
				c.width = W;
				c.height = H;
				return c;
			};
			this.mixes = [
				{ bg: mk(), fg: mk() },
				{ bg: mk(), fg: mk() }
			];
		}
		return this.mixes[0] === this.from ? this.mixes[1] : this.mixes[0];
	}

	/** Paint unpainted climates a few milliseconds at a time. */
	private pumpPaint() {
		const t0 = performance.now();
		const budget =
			this.pending >= 0
				? PAINT_BUDGET_PENDING_MS
				: this.playing
					? PAINT_BUDGET_PLAYING_MS
					: PAINT_BUDGET_IDLE_MS;
		while (performance.now() - t0 < budget) {
			if (!this.job) {
				let idx = this.pending >= 0 && !this.painted.has(this.pending) ? this.pending : -1;
				if (idx < 0) idx = PALETTES.findIndex((_, i) => !this.painted.has(i));
				if (idx < 0) return;
				this.job = { idx, gen: paintClimate(this.world, PALETTES[idx]) };
			}
			const r = this.job.gen.next();
			if (r.done) {
				this.painted.set(this.job.idx, r.value);
				if (this.pending === this.job.idx) this.fadeTo(this.job.idx);
				this.job = null;
			}
		}
	}

	/**
	 * The region the new climate has reached: everything behind a straight
	 * front sweeping across the screen.
	 */
	private buildWipe() {
		const { dx, dy } = this.wipe;
		const px = -dy;
		const py = dx;
		const { cw, ch } = this;
		// how far the front has to travel to cross the whole screen
		const proj = [0, cw * dx, ch * dy, cw * dx + ch * dy];
		const lo = Math.min(...proj);
		const hi = Math.max(...proj);
		const front = lo + (hi - lo) * this.fadeE;
		// extend well past the screen so a bake covers the whole world
		const far = 2000;
		const path = new Path2D();
		path.moveTo(dx * front + px * far, dy * front + py * far);
		path.lineTo(dx * front - px * far, dy * front - py * far);
		path.lineTo(dx * -far - px * far, dy * -far - py * far);
		path.lineTo(dx * -far + px * far, dy * -far + py * far);
		path.closePath();
		return path;
	}

	private applyLook() {
		const a = this.look.ambient;
		for (const k in SKATER_COLORS) this.colors[k] = tint(SKATER_COLORS[k], a);
		const c = this.look.shadow;
		this.shadowCss = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
	}

	resize(cssW: number, cssH: number) {
		if (!this.world) return;
		this.cssW = cssW;
		this.cssH = cssH;
		this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
		const devW = cssW * this.dpr;
		const devH = cssH * this.dpr;
		let scale = Math.max(2, Math.round(devW / 380));
		while (devW / scale > this.world.W - 40 || devH / scale > this.world.H - 40) scale++;
		this.scale = scale;
		this.cw = Math.ceil(devW / scale);
		this.ch = Math.ceil(devH / scale);
		this.canvas.width = this.shadowCanvas.width = this.cw;
		this.canvas.height = this.shadowCanvas.height = this.ch;
		this.fx.width = Math.round(devW);
		this.fx.height = Math.round(devH);
		this.ctx.imageSmoothingEnabled = false;
		this.resetWeather();
		this.render();
	}

	private resetWeather() {
		if (!this.cw || !this.world) return;
		// allocate for the heaviest snowfall; each climate just shows a share of it
		const n = Math.round(240 * MAX_SNOWFALL * ((this.cw * this.ch) / (420 * 300)));
		this.flakes = Array.from({ length: n }, () => ({
			x: Math.random() * this.cw,
			y: Math.random() * this.ch,
			z: Math.pow(Math.random(), 1.6),
			ph: Math.random() * 100
		}));
		const nb = Math.round(16 * MAX_SNOWFALL);
		this.bokeh = Array.from({ length: nb }, () => this.newBokeh(true));
	}

	private newBokeh(anywhere: boolean): Bokeh {
		return {
			x: Math.random() * this.cssW,
			y: anywhere ? Math.random() * this.cssH : -30,
			r: 5 + Math.pow(Math.random(), 2) * 22,
			a: 0.08 + Math.random() * 0.2,
			ph: Math.random() * 100
		};
	}

	// ---------- input ----------
	setPointer(x: number, y: number, down: boolean) {
		this.pointer.x = x;
		this.pointer.y = y;
		this.pointer.down = down;
	}

	setKey(k: InputKey, down: boolean) {
		if (down) this.keys.add(k);
		else this.keys.delete(k);
	}

	spin() {
		const s = this.s;
		if (s.spinW > 0.35 || s.downT >= 0) return;
		s.spinVel = (s.bank >= 0 ? 1 : -1) * 16;
		this.audio.spin();
		for (let i = 0; i < 24; i++) {
			const a = Math.random() * Math.PI * 2;
			const r = 3 + Math.random() * 6;
			this.particles.push({
				x: s.x + Math.cos(a) * r,
				y: s.y + Math.sin(a) * r,
				z: Math.random() * 12,
				vx: Math.cos(a) * 8,
				vy: Math.sin(a) * 8,
				vz: 4 + Math.random() * 8,
				life: 0.8 + Math.random() * 0.8,
				max: 1.6,
				sparkle: true
			});
		}
	}

	// ---------- loop ----------
	start() {
		if (this.running) return;
		this.running = true;
		this.last = performance.now();
		const tick = (now: number) => {
			if (!this.running) return;
			const dt = Math.min(0.05, (now - this.last) / 1000);
			this.last = now;
			this.update(dt);
			this.render();
			this.raf = requestAnimationFrame(tick);
		};
		this.raf = requestAnimationFrame(tick);
	}

	stop() {
		this.running = false;
		cancelAnimationFrame(this.raf);
	}

	dispose() {
		this.stop();
		this.audio.dispose();
	}

	private update(dt: number) {
		const s = this.s;
		const w = this.world;
		this.t += dt;
		this.pumpPaint();
		if (this.to) {
			this.fade = Math.min(1, this.fade + dt / WIPE_SECONDS);
			this.fadeE = smooth(this.fade);
			mixLook(this.lookFrom, this.lookTo, this.fadeE, this.look);
			this.applyLook();
			if (this.fade >= 1) {
				this.from = this.to;
				this.to = null;
				this.wipePath = null;
			}
		}

		const down = s.downT >= 0;
		let throttle = 0;
		let desired: number | null = null;
		const brake = !down && this.keys.has('down');
		if (!down && this.keys.has('up')) throttle = 1;
		if (!down && this.pointer.down) {
			const px = this.ox + (this.pointer.x * this.dpr) / this.scale;
			const py = this.oy + (this.pointer.y * this.dpr) / this.scale + 4; // aim from the body, not the blades
			const dx = px - s.x;
			const dy = py - s.y;
			const dist = Math.hypot(dx, dy);
			if (dist > 7) {
				desired = Math.atan2(dy, dx);
				throttle = clamp(dist / 70, 0.35, 1);
			}
		}

		const prevHeading = s.heading;
		if (s.spinVel !== 0) {
			s.heading += s.spinVel * dt;
			s.spinVel *= Math.exp(-1.4 * dt);
			if (Math.abs(s.spinVel) < 0.6) s.spinVel = 0;
		} else if (!down) {
			if (desired !== null) {
				const diff = wrapAngle(desired - s.heading);
				s.heading += clamp(diff, -TURN_RATE * dt, TURN_RATE * dt);
			}
			if (this.keys.has('left')) s.heading -= TURN_RATE * dt;
			if (this.keys.has('right')) s.heading += TURN_RATE * dt;
		}
		const spinning = s.spinVel !== 0;
		const angVel = (s.heading - prevHeading) / Math.max(dt, 1e-4);

		const fx = Math.cos(s.heading);
		const fy = Math.sin(s.heading);
		const rx = -fy;
		const ry = fx;
		let vf = s.vx * fx + s.vy * fy;
		let vl = s.vx * rx + s.vy * ry;
		const speed0 = Math.hypot(s.vx, s.vy);

		let skid = 0;
		const pushing = throttle > 0 && !spinning && !down;
		if (down) {
			// sliding on your side: no grip, lots of friction
			const k = Math.exp(-1.6 * dt);
			s.vx *= k;
			s.vy *= k;
			skid = speed0 * 0.04;
		} else {
			// blades grip sideways; a gentle carve keeps most of the speed, a sharp one skids
			const grip = spinning ? 0.4 : 7;
			const vl2 = vl * Math.exp(-grip * dt);
			const lost = vl * vl - vl2 * vl2;
			const slip = Math.atan2(Math.abs(vl), Math.abs(vf) + 1e-3);
			const carve = spinning ? 0.98 : clamp(1 - slip / 1.1, 0, 1) * 0.94;
			vf = (vf >= 0 ? 1 : -1) * Math.sqrt(vf * vf + lost * carve);
			vl = vl2;
			skid = Math.sqrt(Math.max(0, lost * (1 - carve)));

			vf *= Math.exp(-0.09 * dt);
			if (brake) {
				const before = vf;
				vf *= Math.exp(-2.4 * dt);
				skid += Math.abs(before - vf) * 0.6;
			}

			// pushing strides
			if (pushing) {
				const prevSin = Math.sin(s.phase);
				s.phase += dt * (4.6 + Math.max(vf, 0) * 0.018);
				if (Math.sign(Math.sin(s.phase)) !== Math.sign(prevSin)) this.audio.stroke();
				const target = MAX_SPEED * throttle;
				if (vf < target) {
					const stroke = 0.45 + 0.55 * Math.abs(Math.sin(s.phase));
					vf += throttle * 110 * stroke * dt;
				}
			}

			// lose your balance if you whip the blades around too far, too fast:
			// a quarter turn at full speed is fine, a reversal or frantic zigzag is not
			// (smooth carving under ~1.5 rad/s never counts, however long you keep it up)
			const hard = spinning ? 0 : clamp((speed0 - 40) / 50, 0, 1);
			s.imb += (Math.max(0, Math.abs(angVel) - 1.5) + Math.max(0, slip - 0.95) * 3) * hard * dt;
			s.imb *= Math.exp(-0.8 * dt);

			s.vx = fx * vf + rx * vl;
			s.vy = fy * vf + ry * vl;
			if (s.imb > 1.1) this.fall(Math.atan2(s.vy, s.vx));
		}
		let nx = s.x + s.vx * dt;
		let ny = s.y + s.vy * dt;

		// keep to the ice
		const M = 4;
		const d = pondSdf(w.pond, nx, ny);
		if (d > -M) {
			const e = 1;
			let gx = pondSdf(w.pond, nx + e, ny) - pondSdf(w.pond, nx - e, ny);
			let gy = pondSdf(w.pond, nx, ny + e) - pondSdf(w.pond, nx, ny - e);
			const gm = Math.hypot(gx, gy) || 1;
			gx /= gm;
			gy /= gm;
			nx -= gx * (d + M);
			ny -= gy * (d + M);
			const vn = s.vx * gx + s.vy * gy;
			if (vn > 0) {
				s.vx -= gx * vn * 1.45;
				s.vy -= gy * vn * 1.45;
				s.vx *= 0.82;
				s.vy *= 0.82;
				if (vn > 75 && s.downT < 0) this.fall(Math.atan2(gy, gx));
				if (vn > 20) {
					this.audio.bump(clamp(vn / 110, 0.15, 1));
					this.spray(Math.round(vn / 4), -gx, -gy);
				}
			}
		}
		s.x = nx;
		s.y = ny;

		const speed = Math.hypot(s.vx, s.vy);
		const sp01 = clamp(speed / MAX_SPEED, 0, 1);
		s.pushW = approach(s.pushW, pushing ? 1 : 0, 5, dt);
		s.glideW = approach(s.glideW, speed > 14 ? 1 : 0, 3, dt);
		s.spinW = approach(s.spinW, spinning ? 1 : 0, 8, dt);
		s.bank = approach(s.bank, spinning ? s.bank : clamp(angVel * sp01 * 0.45, -1, 1), 6, dt);
		if (s.downT >= 0) {
			s.downT += dt;
			const T = s.downT;
			s.fallDir += s.tumble * sp01 * dt;
			if (T < 0.32) s.fall = Math.pow(T / 0.32, 2);
			else if (T < 1.9) s.fall = 1;
			else if (T < 2.6) s.fall = 1 - smooth((T - 1.9) / 0.7);
			else {
				s.fall = 0;
				s.downT = -1;
			}
			// once flat, face the way we'll stand back up
			if (s.fall > 0.95) s.heading = s.fallDir;
			// the body leaves a scuff where it slides
			if (this.prevBody && speed > 12 && s.fall > 0.6) {
				const tc = this.tctx;
				const bx = s.x + Math.cos(s.fallDir) * 2 * SIZE;
				const by = s.y + Math.sin(s.fallDir) * 2 * SIZE;
				tc.strokeStyle = 'rgba(255,255,255,0.16)';
				tc.lineWidth = 3;
				tc.beginPath();
				tc.moveTo(this.prevBody.x, this.prevBody.y);
				tc.lineTo(bx, by);
				tc.stroke();
			}
		}
		this.prevBody = {
			x: s.x + Math.cos(s.fallDir) * 2 * SIZE,
			y: s.y + Math.sin(s.fallDir) * 2 * SIZE
		};
		if (!pushing) s.phase = approach(s.phase, Math.round(s.phase / Math.PI) * Math.PI, 2, dt);

		if (skid > 0.6 && speed0 > 10) {
			const side = Math.sign(s.vx * rx + s.vy * ry) || 1;
			this.spray(Math.min(10, Math.floor(skid * 0.7 + Math.random())), rx * side + s.vx * 0.004, ry * side + s.vy * 0.004);
		}
		this.audio.update(sp01, clamp(skid / 14, 0, 1));

		// blade marks
		const sk = this.skeleton();
		if (this.prevFeet) {
			const tc = this.tctx;
			tc.strokeStyle = 'rgba(255,255,255,0.8)'; // brightness is applied per climate when drawn
			tc.lineWidth = 1;
			for (let i = 0; i < 2; i++) {
				const a = this.prevFeet[i];
				const b = sk.feet[i];
				if (a.z > 0.8 || b.z > 0.8) continue;
				if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 < 0.04) continue;
				tc.beginPath();
				tc.moveTo(a.x, a.y);
				tc.lineTo(b.x, b.y);
				tc.stroke();
			}
		}
		this.prevFeet = sk.feet.map((p) => ({ ...p }));

		// old marks slowly soften under fresh snow
		if (Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) {
			const tc = this.tctx;
			tc.globalCompositeOperation = 'destination-out';
			tc.fillStyle = 'rgba(0,0,0,0.012)';
			tc.fillRect(0, 0, w.W, w.H);
			tc.globalCompositeOperation = 'source-over';
		}

		// particles
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			p.z += p.vz * dt;
			if (p.sparkle) {
				p.vx *= Math.exp(-2 * dt);
				p.vy *= Math.exp(-2 * dt);
			} else {
				p.vz -= 90 * dt;
				p.vx *= Math.exp(-1.5 * dt);
				p.vy *= Math.exp(-1.5 * dt);
				if (p.z <= 0) {
					this.tctx.fillStyle = 'rgba(255,255,255,0.3)';
					this.tctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1);
					p.life = 0;
				}
			}
			if (p.life <= 0) this.particles.splice(i, 1);
		}
		if (spinning && Math.random() < 0.5) {
			const a = Math.random() * Math.PI * 2;
			this.particles.push({
				x: s.x + Math.cos(a) * 5,
				y: s.y + Math.sin(a) * 5,
				z: 1,
				vx: Math.cos(a) * 10,
				vy: Math.sin(a) * 10,
				vz: 5,
				life: 1,
				max: 1,
				sparkle: true
			});
		}

		// camera leads a little ahead of the skater
		const prevOx = this.ox;
		const prevOy = this.oy;
		const tx = s.x + s.vx * 0.5;
		const ty = s.y + s.vy * 0.5 - 8;
		this.cam.x = approach(this.cam.x, tx, 2.2, dt);
		this.cam.y = approach(this.cam.y, ty, 2.2, dt);
		this.cam.x = clamp(this.cam.x, this.cw / 2, w.W - this.cw / 2);
		this.cam.y = clamp(this.cam.y, this.ch / 2, w.H - this.ch / 2);
		this.ox = Math.round(this.cam.x - this.cw / 2);
		this.oy = Math.round(this.cam.y - this.ch / 2);
		const cdx = this.ox - prevOx;
		const cdy = this.oy - prevOy;

		// weather
		const wind = this.look.wind;
		for (const f of this.flakes) {
			f.y += (5 + 15 * f.z) * dt - cdy * (1 + f.z * 0.4);
			f.x += (wind * (4 + 12 * f.z) + Math.sin(this.t * 0.9 + f.ph) * 3 * f.z) * dt - cdx * (1 + f.z * 0.4);
			if (f.y > this.ch + 2) f.y -= this.ch + 4;
			if (f.y < -2) f.y += this.ch + 4;
			if (f.x > this.cw + 2) f.x -= this.cw + 4;
			if (f.x < -2) f.x += this.cw + 4;
		}
		const k = this.scale / this.dpr;
		for (let i = 0; i < this.bokeh.length; i++) {
			const b = this.bokeh[i];
			const depth = 1.4 + b.r / 20;
			b.y += (10 + b.r * 1.4) * dt - cdy * k * depth;
			b.x += (wind * 12 + Math.sin(this.t * 0.6 + b.ph) * 6) * dt - cdx * k * depth;
			const m = b.r * 2;
			if (b.y > this.cssH + m || b.x < -m * 2 || b.x > this.cssW + m * 2 || b.y < -m * 3) {
				this.bokeh[i] = this.newBokeh(false);
				if (b.y < -m * 3) this.bokeh[i].y = this.cssH + m;
				if (b.x < -m * 2) this.bokeh[i].x = this.cssW + m;
				if (b.x > this.cssW + m * 2) this.bokeh[i].x = -m;
			}
		}
	}

	private fall(dir: number) {
		const s = this.s;
		if (s.downT >= 0) return;
		s.downT = 0;
		s.fallDir = dir;
		s.tumble = (Math.random() - 0.5) * 3;
		s.spinVel = 0;
		s.imb = 0;
		this.audio.fall();
		this.spray(28, Math.cos(dir), Math.sin(dir));
	}

	private spray(n: number, dx: number, dy: number) {
		const s = this.s;
		const m = Math.hypot(dx, dy) || 1;
		dx /= m;
		dy /= m;
		for (let i = 0; i < n && this.particles.length < 500; i++) {
			const sp = 20 + Math.random() * 45;
			const spread = (Math.random() - 0.5) * 1.2;
			const c = Math.cos(spread);
			const sn = Math.sin(spread);
			this.particles.push({
				x: s.x + (Math.random() - 0.5) * 3,
				y: s.y + (Math.random() - 0.5) * 3,
				z: 0.5,
				vx: (dx * c - dy * sn) * sp + s.vx * 0.3,
				vy: (dx * sn + dy * c) * sp + s.vy * 0.3,
				vz: 10 + Math.random() * 26,
				life: 1.2,
				max: 1.2,
				sparkle: false
			});
		}
	}

	private skeleton(): Skeleton {
		const s = this.s;
		const fx = Math.cos(s.heading);
		const fy = Math.sin(s.heading);
		const rx = -fy;
		const ry = fx;
		const L = (a: number, b: number, z: number): P3 => ({
			x: s.x + (fx * a + rx * b) * SIZE,
			y: s.y + (fy * a + ry * b) * SIZE,
			z: z * SIZE
		});
		const mix = (p: number[], q: number[], t: number) => p.map((v, i) => v + (q[i] - v) * t);
		const pose = (rest: number[], glide: number[], push: number[], spin: number[]) => {
			let v = mix(rest, glide, s.glideW);
			v = mix(v, push, s.pushW);
			v = mix(v, spin, s.spinW);
			return L(v[0], v[1], v[2]);
		};
		const sin = Math.sin(s.phase);
		const cos = Math.cos(s.phase);
		const aL = Math.max(0, sin);
		const aR = Math.max(0, -sin);
		const speed = Math.hypot(s.vx, s.vy);
		const lean = clamp(s.pushW * 0.8 + (speed / MAX_SPEED) * 0.4, 0, 1);
		const bank = s.bank * (1 - s.spinW);

		const feet = [
			pose([0, -1.2, 0], [0.6, -1.4, 0], [0.3 - 2.8 * aL, -1.4 - 3 * aL, 0], [0, -0.7, 0]),
			pose([0, 1.2, 0], [-0.4, 1.4, 0], [0.3 - 2.8 * aR, 1.4 + 3 * aR, 0], [-1.6, 1.2, 3.2])
		];
		const hips = [L(-0.3 * lean, -1.3, 7), L(-0.3 * lean, 1.3, 7)];
		const knees = feet.map((ft, i) => {
			const h = hips[i];
			return { x: (ft.x + h.x) / 2 + fx * 1.1 * SIZE, y: (ft.y + h.y) / 2 + fy * 1.1 * SIZE, z: (ft.z + h.z) / 2 };
		});
		const shoulders = [L(1.7 * lean, -2.5 + bank * 2, 11.5), L(1.7 * lean, 2.5 + bank * 2, 11.5)];
		const hands = [
			pose([0.3, -2.9, 7.5], [-1, -5.6, 10], [2.6 * cos, -3.4, 9], [1.2, -1.2, 11.6]),
			pose([0.3, 2.9, 7.5], [-1, 5.6, 10], [-2.6 * cos, 3.4, 9], [1.2, 1.2, 11.6])
		];
		const head = L(2.1 * lean, bank * 2.4, 14);
		const sk0 = { feet, knees, hips, shoulders, hands };
		// scarf streams behind the direction of travel
		const sp01 = clamp(speed / MAX_SPEED, 0, 1);
		let bx = -fx;
		let by = -fy;
		if (speed > 5) {
			bx = -s.vx / speed;
			by = -s.vy / speed;
		}
		const neck = L(1.4 * lean, bank * 2, 12.2);
		const scarf: P3[] = [neck];
		for (let i = 1; i <= 4; i++) {
			const flutter = Math.sin(this.t * 15 - i * 1.3) * 0.6 * sp01;
			const len = i * (0.6 + 1.1 * sp01) * SIZE;
			scarf.push({
				x: neck.x + bx * len - by * flutter,
				y: neck.y + by * len + bx * flutter,
				z: neck.z - i * (0.9 - 0.6 * sp01) * SIZE
			});
		}
		if (s.fall > 0) {
			// sprawled on the ice, laid out along the fall direction
			const gx = Math.cos(s.fallDir);
			const gy = Math.sin(s.fallDir);
			const F = (a: number, b: number, z: number): P3 => ({
				x: s.x + (gx * a - gy * b) * SIZE,
				y: s.y + (gy * a + gx * b) * SIZE,
				z: z * SIZE
			});
			const t = s.fall;
			const blend = (p: P3, q: P3) => {
				p.x += (q.x - p.x) * t;
				p.y += (q.y - p.y) * t;
				p.z += (q.z - p.z) * t;
			};
			const lay = {
				feet: [F(-6.5, -2.2, 1.6), F(-6, 2.6, 0.8)],
				knees: [F(-3.5, -1.8, 0.9), F(-3.4, 2.2, 2.2)],
				hips: [F(-1, -1.3, 1.1), F(-1, 1.3, 1.1)],
				shoulders: [F(3.5, -2.5, 1.2), F(3.5, 2.5, 1.2)],
				hands: [F(7.2, -5, 0.6), F(4.5, 6.4, 0.6)]
			};
			for (const k of ['feet', 'knees', 'hips', 'shoulders', 'hands'] as const) {
				sk0[k].forEach((p, i) => blend(p, lay[k][i]));
			}
			blend(head, F(5.8, 0.3, 1.4));
			scarf.forEach((p, i) => blend(p, F(4.6 - i * 1.2, (i % 2 ? 0.6 : -0.4) + i * 0.3, 1.2)));
		}
		return { feet, knees, hips, shoulders, hands, head, scarf, f: { x: fx, y: fy } };
	}

	// ---------- drawing ----------
	private drawSkater(
		ctx: CanvasRenderingContext2D,
		sk: Skeleton,
		proj: (p: P3) => [number, number],
		colors: Record<string, string> | null,
		shadowColor = ''
	) {
		const c = (k: string) => (colors ? colors[k] : shadowColor);
		const line = (pts: P3[], width: number, color: string) => {
			ctx.strokeStyle = color;
			ctx.lineWidth = width;
			ctx.beginPath();
			pts.forEach((p, i) => {
				const [x, y] = proj(p);
				if (i === 0) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			});
			ctx.stroke();
		};
		const dot = (p: P3, r: number, color: string, dy = 0) => {
			const [x, y] = proj(p);
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.arc(x, y + dy, r, 0, Math.PI * 2);
			ctx.fill();
		};
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		const sh = (colors ? 1 : 1.25) * SIZE;

		// legs, the one further from camera first
		const legOrder = sk.feet[0].y < sk.feet[1].y ? [0, 1] : [1, 0];
		for (const i of legOrder) {
			const ft = sk.feet[i];
			line([sk.hips[i], sk.knees[i], ft], 1.7 * sh, c('pants'));
			line(
				[
					{ x: ft.x - sk.f.x * 1.6 * SIZE, y: ft.y - sk.f.y * 1.6 * SIZE, z: ft.z + 0.2 },
					{ x: ft.x + sk.f.x * 1.6 * SIZE, y: ft.y + sk.f.y * 1.6 * SIZE, z: ft.z + 0.2 }
				],
				1.1 * sh,
				c('skate')
			);
		}
		const mid = (a: P3, b: P3): P3 => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
		const hipC = mid(sk.hips[0], sk.hips[1]);
		const shC = mid(sk.shoulders[0], sk.shoulders[1]);
		const armOrder = sk.hands[0].y < sk.hands[1].y ? [0, 1] : [1, 0];
		const arm = (i: number) => {
			line([sk.shoulders[i], sk.hands[i]], 1.3 * sh, c('coat'));
			dot(sk.hands[i], 0.9 * sh, c('mitt'));
		};
		arm(armOrder[0]);
		line([hipC, shC], 4 * sh, c('coatShade'));
		line([hipC, mid(hipC, shC), shC], 3.2 * sh, c('coat'));
		line([sk.shoulders[0], sk.shoulders[1]], 2.2 * sh, c('coat'));
		arm(armOrder[1]);
		line(sk.scarf, 1.2 * sh, c('scarf'));
		dot(sk.head, 1.9 * sh, c('skin'));
		if (colors) {
			dot(sk.head, 1.8 * SIZE, c('hat'), -0.8);
			dot({ ...sk.head, z: sk.head.z + 1.8 * SIZE }, 0.8, c('pom'));
		}
	}

	render() {
		const w = this.world;
		if (!w || !this.cw) return;
		const ctx = this.ctx;
		const { ox, oy, cw, ch } = this;
		ctx.globalAlpha = 1;
		// the old climate stays fully opaque and the new one fades in over it
		this.wipePath = this.to ? this.buildWipe() : null;
		ctx.drawImage(this.from.bg, ox, oy, cw, ch, 0, 0, cw, ch);
		if (this.to && this.wipePath) {
			ctx.save();
			ctx.clip(this.wipePath);
			ctx.drawImage(this.to.bg, ox, oy, cw, ch, 0, 0, cw, ch);
			ctx.restore();
		}
		ctx.globalAlpha = this.look.trailAlpha;
		ctx.drawImage(this.trail, ox, oy, cw, ch, 0, 0, cw, ch);
		ctx.globalAlpha = 1;

		// pools of lamplight on the snow
		const lamp = this.look.lamp;
		if (lamp > 0.01) {
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = lamp;
			for (const l of w.lamps) {
				const x = l.x - ox;
				const y = l.y - oy;
				if (x < -70 || y < -70 || x > cw + 70 || y > ch + 70) continue;
				ctx.drawImage(this.poolSprite, x - 70, y - 70);
			}
			ctx.globalAlpha = 1;
			ctx.globalCompositeOperation = 'source-over';
		}

		// glints twinkle on the ice
		for (const g of w.glints) {
			const x = g.x - ox;
			const y = g.y - oy;
			if (x < 0 || y < 0 || x >= cw || y >= ch) continue;
			const tw = Math.sin(this.t * g.s + g.p);
			if (tw < 0.9) continue;
			const a = (tw - 0.9) / 0.1;
			ctx.fillStyle = '#fff';
			ctx.globalAlpha = a;
			ctx.fillRect(x, y, 1, 1);
			if (a > 0.55) {
				ctx.globalAlpha = a * 0.4;
				ctx.fillRect(x - 1, y, 1, 1);
				ctx.fillRect(x + 1, y, 1, 1);
				ctx.fillRect(x, y - 1, 1, 1);
				ctx.fillRect(x, y + 1, 1, 1);
			}
		}
		ctx.globalAlpha = 1;

		const sk = this.skeleton();
		const sun = w.sun;
		const sProj = (p: P3): [number, number] => [
			p.x + sun.x * p.z * SHADOW_K - ox,
			p.y + sun.y * p.z * SHADOW_K - oy
		];
		const vProj = (p: P3): [number, number] => [p.x - ox, p.y - p.z * TILT - oy];

		// shadow (drawn opaque off-screen, then laid down once so overlaps stay even)
		const sc = this.sctx;
		sc.clearRect(0, 0, cw, ch);
		this.drawSkater(sc, sk, sProj, null, this.shadowCss);
		sc.fillStyle = this.shadowCss;
		for (const p of this.particles) {
			if (p.sparkle) continue;
			const [x, y] = sProj(p);
			sc.fillRect(Math.round(x), Math.round(y), 1, 1);
		}
		ctx.globalAlpha = Math.min(0.7, this.look.shadowAlpha * 1.25);
		ctx.drawImage(this.shadowCanvas, 0, 0);
		ctx.globalAlpha = 1;

		// particles behind / with the skater
		for (const p of this.particles) {
			const [x, y] = vProj(p);
			const a = clamp(p.life / p.max, 0, 1);
			if (p.sparkle) {
				ctx.fillStyle = '#fffaeb';
				ctx.globalAlpha = a * (0.5 + 0.5 * Math.sin(this.t * 20 + p.x));
			} else {
				ctx.fillStyle = '#fff';
				ctx.globalAlpha = 0.5 + a * 0.5;
			}
			ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
		}
		ctx.globalAlpha = 1;

		this.drawSkater(ctx, sk, vProj, this.colors);

		// lamp bulbs, under the trees so nearer branches still cover them
		if (lamp > 0.01) {
			for (const l of w.lamps) {
				const x = l.x - ox;
				const y = l.y - LAMP_H * TILT - oy;
				if (x < -16 || y < -16 || x > cw + 16 || y > ch + 16) continue;
				ctx.globalAlpha = lamp;
				ctx.drawImage(this.bulbSprite, x - 16, y - 16);
				ctx.fillStyle = '#fff2d0';
				ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 3);
				ctx.globalAlpha = 1;
			}
		}

		ctx.drawImage(this.from.fg, ox, oy, cw, ch, 0, 0, cw, ch);
		if (this.to && this.wipePath) {
			ctx.save();
			ctx.clip(this.wipePath);
			ctx.drawImage(this.to.fg, ox, oy, cw, ch, 0, 0, cw, ch);
			ctx.restore();
		}

		// snow: the pool is sized for a blizzard, each climate shows a share of it
		// the last flake in the share fades with the fractional part, so snowfall eases instead of popping
		const share = this.flakes.length * (this.look.snowfall / MAX_SNOWFALL);
		const flakes = Math.min(this.flakes.length, Math.ceil(share));
		ctx.fillStyle = '#fff';
		for (let i = 0; i < flakes; i++) {
			const f = this.flakes[i];
			ctx.globalAlpha = (0.35 + f.z * 0.6) * (i === flakes - 1 ? share - i : 1);
			const sz = f.z > 0.82 ? 2 : 1;
			ctx.fillRect(Math.round(f.x), Math.round(f.y), sz, sz);
		}
		ctx.globalAlpha = 1;

		// soft out-of-focus flakes drifting near the lens
		const fc = this.fxCtx;
		fc.clearRect(0, 0, this.fx.width, this.fx.height);
		const d = this.dpr;
		const bShare = this.bokeh.length * (this.look.snowfall / MAX_SNOWFALL);
		const nb = Math.min(this.bokeh.length, Math.ceil(bShare));
		for (let i = 0; i < nb; i++) {
			const b = this.bokeh[i];
			fc.globalAlpha = b.a * (i === nb - 1 ? bShare - i : 1);
			const r = b.r * d;
			fc.drawImage(this.sprite, b.x * d - r, b.y * d - r, r * 2, r * 2);
		}
		fc.globalAlpha = 1;
	}
}
