import { generateWorld, pondSdf, TILT, SHADOW_K, type World, type RGB } from './world';
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

export type InputKey = 'left' | 'right' | 'up' | 'down';

export class Game {
	world!: World;
	readonly audio = new PondAudio();
	onInfo?: (info: { palette: string; seed: number }) => void;

	private ctx: CanvasRenderingContext2D;
	private fxCtx: CanvasRenderingContext2D;
	private shadowCanvas = document.createElement('canvas');
	private sctx = this.shadowCanvas.getContext('2d')!;
	private trail = document.createElement('canvas');
	private tctx = this.trail.getContext('2d')!;
	private sprite = document.createElement('canvas');

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
		bank: 0
	};
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
		this.world = generateWorld(seed);
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
			spinW: 0
		});
		this.prevFeet = null;
		this.particles = [];
		this.cam = { x: w.start.x, y: w.start.y - 20 };
		const amb = w.palette.ambient;
		this.colors = {
			pants: tint('#2e3150', amb),
			skate: tint('#dfe3ec', amb),
			coat: tint('#efe0c6', amb),
			coatShade: tint('#c4b096', amb),
			scarf: tint('#d8462a', amb),
			hat: tint('#c63a24', amb),
			pom: tint('#f4ece0', amb),
			skin: tint('#f1c7a1', amb),
			mitt: tint('#b5341f', amb)
		};
		this.audio.root = w.musicRoot;
		this.resetWeather();
		this.onInfo?.({ palette: w.palette.name, seed });
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
		const d = this.world.snowDensity;
		const n = Math.round(240 * d * ((this.cw * this.ch) / (420 * 300)));
		this.flakes = Array.from({ length: n }, () => ({
			x: Math.random() * this.cw,
			y: Math.random() * this.ch,
			z: Math.pow(Math.random(), 1.6),
			ph: Math.random() * 100
		}));
		const nb = Math.round(16 * d);
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
		if (s.spinW > 0.35) return;
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

		let throttle = 0;
		let desired: number | null = null;
		const brake = this.keys.has('down');
		if (this.keys.has('up')) throttle = 1;
		if (this.pointer.down) {
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
		} else {
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

		// blades grip sideways; a gentle carve keeps most of the speed, a sharp one skids
		const grip = spinning ? 0.4 : 7;
		const vl2 = vl * Math.exp(-grip * dt);
		const lost = vl * vl - vl2 * vl2;
		const slip = Math.atan2(Math.abs(vl), Math.abs(vf) + 1e-3);
		const carve = spinning ? 0.98 : clamp(1 - slip / 1.1, 0, 1) * 0.94;
		vf = (vf >= 0 ? 1 : -1) * Math.sqrt(vf * vf + lost * carve);
		vl = vl2;
		let skid = Math.sqrt(Math.max(0, lost * (1 - carve)));

		vf *= Math.exp(-0.09 * dt);
		if (brake) {
			const before = vf;
			vf *= Math.exp(-2.4 * dt);
			skid += Math.abs(before - vf) * 0.6;
		}

		// pushing strides
		const pushing = throttle > 0 && !spinning;
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

		s.vx = fx * vf + rx * vl;
		s.vy = fy * vf + ry * vl;
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
			tc.strokeStyle = w.palette.trail;
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
		const wind = w.wind;
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
		ctx.drawImage(w.bg, ox, oy, cw, ch, 0, 0, cw, ch);
		ctx.drawImage(this.trail, ox, oy, cw, ch, 0, 0, cw, ch);

		// glints twinkle on the ice
		for (const g of w.glints) {
			const x = g.x - ox;
			const y = g.y - oy;
			if (x < 0 || y < 0 || x >= cw || y >= ch) continue;
			const tw = Math.sin(this.t * g.s + g.p);
			if (tw < 0.9) continue;
			const a = (tw - 0.9) / 0.1;
			ctx.fillStyle = `rgba(255,255,255,${a})`;
			ctx.fillRect(x, y, 1, 1);
			if (a > 0.55) {
				ctx.fillStyle = `rgba(255,255,255,${a * 0.4})`;
				ctx.fillRect(x - 1, y, 1, 1);
				ctx.fillRect(x + 1, y, 1, 1);
				ctx.fillRect(x, y - 1, 1, 1);
				ctx.fillRect(x, y + 1, 1, 1);
			}
		}

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
		this.drawSkater(sc, sk, sProj, null, w.palette.shadow);
		sc.fillStyle = w.palette.shadow;
		for (const p of this.particles) {
			if (p.sparkle) continue;
			const [x, y] = sProj(p);
			sc.fillRect(Math.round(x), Math.round(y), 1, 1);
		}
		ctx.globalAlpha = Math.min(0.7, w.palette.shadowAlpha * 1.25);
		ctx.drawImage(this.shadowCanvas, 0, 0);
		ctx.globalAlpha = 1;

		// particles behind / with the skater
		for (const p of this.particles) {
			const [x, y] = vProj(p);
			const a = clamp(p.life / p.max, 0, 1);
			if (p.sparkle) {
				const tw = 0.5 + 0.5 * Math.sin(this.t * 20 + p.x);
				ctx.fillStyle = `rgba(255,250,235,${a * tw})`;
			} else {
				ctx.fillStyle = `rgba(255,255,255,${0.5 + a * 0.5})`;
			}
			ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
		}

		this.drawSkater(ctx, sk, vProj, this.colors);

		ctx.drawImage(w.fg, ox, oy, cw, ch, 0, 0, cw, ch);

		// snow
		for (const f of this.flakes) {
			const a = 0.35 + f.z * 0.6;
			ctx.fillStyle = `rgba(255,255,255,${a})`;
			const sz = f.z > 0.82 ? 2 : 1;
			ctx.fillRect(Math.round(f.x), Math.round(f.y), sz, sz);
		}

		// soft out-of-focus flakes drifting near the lens
		const fc = this.fxCtx;
		fc.clearRect(0, 0, this.fx.width, this.fx.height);
		const d = this.dpr;
		for (const b of this.bokeh) {
			fc.globalAlpha = b.a;
			const r = b.r * d;
			fc.drawImage(this.sprite, b.x * d - r, b.y * d - r, r * 2, r * 2);
		}
		fc.globalAlpha = 1;
	}
}
