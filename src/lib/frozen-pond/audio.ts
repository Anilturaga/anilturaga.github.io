/**
 * All sound is synthesised live with Web Audio: a slow pad, sparse bell
 * melodies on a pentatonic scale, wind, and blade noise driven by the skater.
 */

const PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
// I – vi – IV – V voiced softly (semitones from root)
const CHORDS = [
	[0, 7, 11, 16],
	[-3, 4, 7, 12],
	[-7, 0, 4, 11],
	[-5, 2, 9, 14]
];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export class PondAudio {
	private ctx: AudioContext | null = null;
	private master!: GainNode;
	private music!: GainNode;
	private send!: GainNode;
	private sfx!: GainNode;
	private padFilter!: BiquadFilterNode;
	private bladeGain!: GainNode;
	private bladeFilter!: BiquadFilterNode;
	private skidGain!: GainNode;
	private windGain!: GainNode;
	private windFilter!: BiquadFilterNode;
	private noise!: AudioBuffer;
	private timer: ReturnType<typeof setInterval> | null = null;
	private nextChord = 0;
	private nextBell = 0;
	private chordIdx = 0;
	private bellIdx = 4;
	private speed = 0;
	root = 50;
	muted = false;

	get started() {
		return this.ctx !== null;
	}

	start() {
		if (this.ctx) {
			this.ctx.resume();
			return;
		}
		const AC =
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AC) return;
		const ctx = new AC();
		this.ctx = ctx;

		const comp = ctx.createDynamicsCompressor();
		comp.threshold.value = -18;
		comp.ratio.value = 3;
		comp.connect(ctx.destination);
		this.master = ctx.createGain();
		this.master.gain.value = this.muted ? 0 : 0.9;
		this.master.connect(comp);

		const reverb = ctx.createConvolver();
		reverb.buffer = this.impulse(2.8);
		const wet = ctx.createGain();
		wet.gain.value = 0.9;
		reverb.connect(wet).connect(this.master);
		this.send = ctx.createGain();
		this.send.gain.value = 1;
		this.send.connect(reverb);

		this.music = ctx.createGain();
		this.music.gain.value = 0.85;
		this.music.connect(this.master);
		this.sfx = ctx.createGain();
		this.sfx.gain.value = 1;
		this.sfx.connect(this.master);

		this.padFilter = ctx.createBiquadFilter();
		this.padFilter.type = 'lowpass';
		this.padFilter.frequency.value = 900;
		this.padFilter.Q.value = 0.4;
		this.padFilter.connect(this.music);
		const padSend = ctx.createGain();
		padSend.gain.value = 0.5;
		this.padFilter.connect(padSend).connect(this.send);

		this.noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
		const nd = this.noise.getChannelData(0);
		for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
		const brown = ctx.createBuffer(1, ctx.sampleRate * 6, ctx.sampleRate);
		const bd = brown.getChannelData(0);
		let last = 0;
		for (let i = 0; i < bd.length; i++) {
			last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
			bd[i] = last * 3.5;
		}

		// wind
		const wind = ctx.createBufferSource();
		wind.buffer = brown;
		wind.loop = true;
		this.windFilter = ctx.createBiquadFilter();
		this.windFilter.type = 'bandpass';
		this.windFilter.frequency.value = 450;
		this.windFilter.Q.value = 0.6;
		this.windGain = ctx.createGain();
		this.windGain.gain.value = 0;
		this.windGain.gain.setTargetAtTime(0.18, ctx.currentTime, 2);
		wind.connect(this.windFilter).connect(this.windGain).connect(this.sfx);
		wind.start();

		// blades gliding over ice
		const blade = ctx.createBufferSource();
		blade.buffer = this.noise;
		blade.loop = true;
		this.bladeFilter = ctx.createBiquadFilter();
		this.bladeFilter.type = 'bandpass';
		this.bladeFilter.frequency.value = 3000;
		this.bladeFilter.Q.value = 1.1;
		this.bladeGain = ctx.createGain();
		this.bladeGain.gain.value = 0;
		blade.connect(this.bladeFilter).connect(this.bladeGain).connect(this.sfx);
		blade.start();

		// skids and stops
		const skid = ctx.createBufferSource();
		skid.buffer = this.noise;
		skid.loop = true;
		skid.loopStart = 1.3;
		const skidFilter = ctx.createBiquadFilter();
		skidFilter.type = 'bandpass';
		skidFilter.frequency.value = 1700;
		skidFilter.Q.value = 0.7;
		this.skidGain = ctx.createGain();
		this.skidGain.gain.value = 0;
		skid.connect(skidFilter).connect(this.skidGain).connect(this.sfx);
		skid.start(0, 1.3);

		this.nextChord = ctx.currentTime + 0.2;
		this.nextBell = ctx.currentTime + 2.5;
		this.timer = setInterval(() => this.schedule(), 200);
	}

	private impulse(seconds: number) {
		const ctx = this.ctx!;
		const len = Math.floor(ctx.sampleRate * seconds);
		const buf = ctx.createBuffer(2, len, ctx.sampleRate);
		for (let c = 0; c < 2; c++) {
			const d = buf.getChannelData(c);
			for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
		}
		return buf;
	}

	private schedule() {
		const ctx = this.ctx;
		if (!ctx || ctx.state !== 'running') return;
		const now = ctx.currentTime;
		// after a suspend, don't try to catch up on everything we missed
		if (this.nextChord < now - 0.5) this.nextChord = now + 0.1;
		if (this.nextBell < now - 0.5) this.nextBell = now + 1;
		while (this.nextChord < now + 1) {
			this.chord(this.nextChord, CHORDS[this.chordIdx % CHORDS.length], 9);
			this.chordIdx++;
			this.nextChord += 9;
		}
		while (this.nextBell < now + 0.5) {
			const step = Math.floor(Math.random() * 5) - 2;
			this.bellIdx = Math.max(0, Math.min(PENTA.length - 1, this.bellIdx + step));
			const vel = 0.5 + Math.random() * 0.5;
			this.bell(this.nextBell, this.root + 24 + PENTA[this.bellIdx], vel);
			if (Math.random() < 0.25) {
				const j = Math.max(0, Math.min(PENTA.length - 1, this.bellIdx + (Math.random() < 0.5 ? 1 : -1)));
				this.bell(this.nextBell + 0.28, this.root + 24 + PENTA[j], vel * 0.6);
			}
			const gap = (3.4 - this.speed * 2.2) * (0.6 + Math.random() * 0.9);
			this.nextBell += Math.max(0.5, gap);
		}
		if (Math.random() < 0.06) {
			this.windFilter.frequency.setTargetAtTime(280 + Math.random() * 500, now, 2.5);
			this.windGain.gain.setTargetAtTime(0.1 + Math.random() * 0.16, now, 2.5);
		}
		this.padFilter.frequency.setTargetAtTime(700 + this.speed * 900, now, 1.5);
	}

	private chord(t: number, notes: number[], dur: number) {
		const ctx = this.ctx!;
		const all = [...notes.map((n) => this.root + n), this.root + notes[0] - 12];
		all.forEach((m, i) => {
			const bass = i === all.length - 1;
			const vol = bass ? 0.05 : 0.026;
			const g = ctx.createGain();
			g.gain.setValueAtTime(0, t);
			g.gain.linearRampToValueAtTime(vol, t + 3);
			g.gain.setValueAtTime(vol, t + dur - 1);
			g.gain.linearRampToValueAtTime(0, t + dur + 3.5);
			g.connect(this.padFilter);
			const types: OscillatorType[] = bass ? ['sine'] : ['sine', 'triangle'];
			types.forEach((type, k) => {
				const o = ctx.createOscillator();
				o.type = type;
				o.frequency.value = mtof(m);
				o.detune.value = k === 0 ? -5 : 5;
				o.connect(g);
				o.start(t);
				o.stop(t + dur + 4);
			});
		});
	}

	private bell(t: number, m: number, vel: number) {
		const ctx = this.ctx!;
		const f = mtof(m);
		const out = ctx.createGain();
		out.gain.setValueAtTime(0, t);
		out.gain.linearRampToValueAtTime(0.055 * vel, t + 0.006);
		out.gain.exponentialRampToValueAtTime(0.0001, t + 4);
		out.connect(this.music);
		const s = ctx.createGain();
		s.gain.value = 0.8;
		out.connect(s).connect(this.send);

		const car = ctx.createOscillator();
		car.frequency.value = f;
		const mod = ctx.createOscillator();
		mod.frequency.value = f * 3.5;
		const mg = ctx.createGain();
		mg.gain.setValueAtTime(f * 1.4 * vel, t);
		mg.gain.exponentialRampToValueAtTime(1, t + 1.4);
		mod.connect(mg).connect(car.frequency);
		car.connect(out);
		const shimmer = ctx.createOscillator();
		shimmer.frequency.value = f * 2.01;
		const sg = ctx.createGain();
		sg.gain.setValueAtTime(0.25, t);
		sg.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
		shimmer.connect(sg).connect(out);
		for (const o of [car, mod, shimmer]) {
			o.start(t);
			o.stop(t + 4.1);
		}
	}

	private burst(dur: number, freq: number, type: BiquadFilterType, vol: number) {
		const ctx = this.ctx;
		if (!ctx) return;
		const t = ctx.currentTime;
		const src = ctx.createBufferSource();
		src.buffer = this.noise;
		const f = ctx.createBiquadFilter();
		f.type = type;
		f.frequency.value = freq;
		const g = ctx.createGain();
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		src.connect(f).connect(g).connect(this.sfx);
		src.start(t, Math.random() * 3);
		src.stop(t + dur + 0.05);
	}

	private lastSpeed = -1;
	private lastSkid = -1;

	/** Called every frame. speed and skid are 0..1 */
	update(speed: number, skid: number) {
		const ctx = this.ctx;
		if (!ctx) return;
		this.speed = speed;
		// only touch the audio graph when something audible changed
		if (Math.abs(speed - this.lastSpeed) < 0.01 && Math.abs(skid - this.lastSkid) < 0.02) return;
		this.lastSpeed = speed;
		this.lastSkid = skid;
		const now = ctx.currentTime;
		this.bladeGain.gain.setTargetAtTime(0.07 * Math.pow(speed, 1.2), now, 0.08);
		this.bladeFilter.frequency.setTargetAtTime(2400 + 2200 * speed, now, 0.1);
		this.skidGain.gain.setTargetAtTime(0.32 * skid, now, 0.04);
	}

	/** A soft gust for a change of climate. */
	whoosh() {
		const ctx = this.ctx;
		if (!ctx || ctx.state !== 'running') return;
		const t = ctx.currentTime;
		const src = ctx.createBufferSource();
		src.buffer = this.noise;
		const f = ctx.createBiquadFilter();
		f.type = 'bandpass';
		f.Q.value = 0.8;
		f.frequency.setValueAtTime(350, t);
		f.frequency.exponentialRampToValueAtTime(1800, t + 0.55);
		f.frequency.exponentialRampToValueAtTime(600, t + 1.1);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(0.09, t + 0.35);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
		src.connect(f).connect(g).connect(this.sfx);
		const wet = ctx.createGain();
		wet.gain.value = 0.4;
		g.connect(wet).connect(this.send);
		src.start(t, Math.random() * 2);
		src.stop(t + 1.25);
	}

	stroke() {
		this.burst(0.14, 4200, 'highpass', 0.035);
	}

	bump(strength: number) {
		const ctx = this.ctx;
		if (!ctx) return;
		this.burst(0.35, 500, 'lowpass', 0.25 * strength);
		const t = ctx.currentTime;
		const o = ctx.createOscillator();
		o.frequency.setValueAtTime(110, t);
		o.frequency.exponentialRampToValueAtTime(50, t + 0.25);
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.18 * strength, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
		o.connect(g).connect(this.sfx);
		o.start(t);
		o.stop(t + 0.35);
	}

	fall() {
		this.bump(1);
		this.burst(0.9, 1400, 'bandpass', 0.35);
	}

	spin() {
		const ctx = this.ctx;
		if (!ctx) return;
		const t = ctx.currentTime;
		const startIdx = Math.max(0, Math.min(PENTA.length - 5, this.bellIdx - 1));
		for (let i = 0; i < 5; i++) {
			this.bell(t + i * 0.09, this.root + 24 + PENTA[startIdx + i], 0.55 - i * 0.05);
		}
	}

	setMuted(m: boolean) {
		this.muted = m;
		if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.15);
	}

	suspend() {
		this.ctx?.suspend();
	}

	resume() {
		this.ctx?.resume();
	}

	dispose() {
		if (this.timer) clearInterval(this.timer);
		this.ctx?.close();
		this.ctx = null;
	}
}
