<script lang="ts">
	import { onMount } from 'svelte';
	import { Shuffle, Volume2, VolumeX, X, Play } from 'lucide-svelte';
	import type { Game, InputKey } from './game';

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let fx: HTMLCanvasElement;
	let game: Game | null = null;

	let playing = $state(false);
	let muted = $state(false);
	let showHint = $state(false);
	let info = $state({ palette: '', seed: 0 });
	let isTouch = $state(false);

	let lastTap = { t: 0, x: 0, y: 0 };
	let activePointer: number | null = null;
	let hintTimer: ReturnType<typeof setTimeout> | undefined;

	const KEYMAP: Record<string, InputKey> = {
		ArrowLeft: 'left',
		KeyA: 'left',
		ArrowRight: 'right',
		KeyD: 'right',
		ArrowUp: 'up',
		KeyW: 'up',
		ArrowDown: 'down',
		KeyS: 'down'
	};

	function fit() {
		if (!game) return;
		const r = container.getBoundingClientRect();
		game.resize(r.width, r.height);
	}

	onMount(() => {
		isTouch = matchMedia('(pointer: coarse)').matches;
		let disposed = false;
		let ro: ResizeObserver | undefined;
		let io: IntersectionObserver | undefined;
		let inView = true;

		const wake = () => {
			if (!game) return;
			if (document.hidden || (!inView && !playing)) {
				game.stop();
				game.audio.suspend();
			} else {
				game.start();
				if (playing) game.audio.resume();
			}
		};

		import('./game').then(({ Game }) => {
			if (disposed) return;
			game = new Game(canvas, fx);
			game.onInfo = (i) => (info = i);
			game.regenerate();
			fit();
			game.start();
			ro = new ResizeObserver(fit);
			ro.observe(container);
			io = new IntersectionObserver(
				([e]) => {
					inView = e.isIntersecting;
					wake();
				},
				{ threshold: 0.05 }
			);
			io.observe(container);
		});

		const onFs = () => {
			// leaving real fullscreen (Esc, system gesture) also leaves the game
			if (!document.fullscreenElement && playing) exit();
		};
		document.addEventListener('visibilitychange', wake);
		document.addEventListener('fullscreenchange', onFs);

		return () => {
			disposed = true;
			ro?.disconnect();
			io?.disconnect();
			document.removeEventListener('visibilitychange', wake);
			document.removeEventListener('fullscreenchange', onFs);
			document.documentElement.style.overflow = '';
			clearTimeout(hintTimer);
			game?.dispose();
			game = null;
		};
	});

	async function play() {
		if (!game || playing) return;
		playing = true;
		document.documentElement.style.overflow = 'hidden';
		try {
			if (container.requestFullscreen) await container.requestFullscreen({ navigationUI: 'hide' });
		} catch {
			// no fullscreen API here (e.g. iPhone Safari): the fixed overlay covers the page instead
		}
		game.audio.start();
		game.audio.setMuted(muted);
		game.start();
		container.focus({ preventScroll: true });
		requestAnimationFrame(fit);
		showHint = true;
		clearTimeout(hintTimer);
		hintTimer = setTimeout(() => (showHint = false), 6000);
	}

	function exit() {
		if (!playing) return;
		playing = false;
		showHint = false;
		activePointer = null;
		document.documentElement.style.overflow = '';
		if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
		if (game) {
			for (const k of ['left', 'right', 'up', 'down'] as InputKey[]) game.setKey(k, false);
			game.setPointer(0, 0, false);
			game.audio.suspend();
		}
		requestAnimationFrame(fit);
	}

	function local(e: PointerEvent) {
		const r = canvas.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	}

	function onPointerDown(e: PointerEvent) {
		if (!playing || !game || activePointer !== null) return;
		activePointer = e.pointerId;
		canvas.setPointerCapture(e.pointerId);
		const p = local(e);
		const now = performance.now();
		if (now - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 40) {
			game.spin();
			lastTap.t = 0;
		} else {
			lastTap = { t: now, x: p.x, y: p.y };
		}
		game.setPointer(p.x, p.y, true);
	}

	function onPointerMove(e: PointerEvent) {
		if (!game || e.pointerId !== activePointer) return;
		const p = local(e);
		game.setPointer(p.x, p.y, true);
	}

	function onPointerUp(e: PointerEvent) {
		if (!game || e.pointerId !== activePointer) return;
		activePointer = null;
		const p = local(e);
		game.setPointer(p.x, p.y, false);
	}

	function onKey(e: KeyboardEvent, down: boolean) {
		if (!playing || !game) return;
		if (e.code === 'Escape') {
			if (down) exit();
			return;
		}
		if (e.code === 'Space') {
			if (down && !e.repeat) game.spin();
			e.preventDefault();
			return;
		}
		const k = KEYMAP[e.code];
		if (k) {
			game.setKey(k, down);
			e.preventDefault();
		}
	}

	function newPond() {
		game?.regenerate();
		fit();
		container.focus({ preventScroll: true });
	}

	function toggleMute() {
		muted = !muted;
		game?.audio.setMuted(muted);
		container.focus({ preventScroll: true });
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	bind:this={container}
	class="pond relative w-full overflow-hidden bg-[#1b1f33] outline-none select-none"
	class:playing
	tabindex="0"
	role="application"
	aria-label="Frozen pond skating game"
	onkeydown={(e) => onKey(e, true)}
	onkeyup={(e) => onKey(e, false)}
	onblur={() => game && (['left', 'right', 'up', 'down'] as InputKey[]).forEach((k) => game?.setKey(k, false))}
>
	<canvas
		bind:this={canvas}
		class="pixel absolute inset-0 h-full w-full"
		style:touch-action={playing ? 'none' : 'auto'}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		oncontextmenu={(e) => e.preventDefault()}
	></canvas>
	<canvas bind:this={fx} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
	<div class="vignette pointer-events-none absolute inset-0"></div>

	{#if playing}
		<button class="ctrl corner-l absolute" onclick={exit} aria-label="Close game" title="Close (Esc)"><X size={20} /></button>
		<div class="corner-r absolute flex gap-2">
			<button class="ctrl" onclick={newPond} aria-label="New pond" title="New pond"><Shuffle size={18} /></button>
			<button class="ctrl" onclick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>
				{#if muted}<VolumeX size={18} />{:else}<Volume2 size={18} />{/if}
			</button>
		</div>
		<div class="seed pointer-events-none absolute font-mono text-[11px] tracking-wide text-white/70">
			{info.palette} · #{info.seed.toString(36)}
		</div>
		<div
			class="hint pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-center text-xs text-white sm:text-sm"
			class:show={showHint}
		>
			{#if isTouch}
				Hold &amp; drag to skate · double-tap to spin
			{:else}
				Hold the mouse or use arrows/WASD · Space to spin · Esc to leave
			{/if}
		</div>
	{:else}
		<button class="thumb absolute inset-0 flex flex-col items-center justify-center gap-4 text-white" onclick={play} aria-label="Play Frozen Pond">
			<span class="playbtn grid place-items-center rounded-full"><Play size={34} fill="currentColor" /></span>
			<span class="text-sm tracking-[0.25em] text-white/90">PLAY · SOUND ON</span>
		</button>
	{/if}
</div>

<style>
	.pond {
		aspect-ratio: 16 / 10;
		border-radius: 0.75rem;
	}
	@media (max-width: 639px) {
		.pond {
			aspect-ratio: 4 / 3;
		}
	}
	.pond.playing {
		position: fixed;
		inset: 0;
		z-index: 9999;
		width: 100vw;
		height: 100vh;
		height: 100dvh;
		aspect-ratio: auto;
		border-radius: 0;
	}
	.pixel {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}
	.playing .pixel {
		cursor: crosshair;
	}
	.vignette {
		background: radial-gradient(ellipse at center, transparent 55%, rgba(10, 12, 30, 0.35) 100%);
	}
	.thumb {
		background: radial-gradient(ellipse at center, rgba(20, 24, 50, 0.1), rgba(20, 24, 50, 0.45));
		text-shadow: 0 1px 12px rgba(0, 0, 0, 0.35);
		cursor: pointer;
	}
	.playbtn {
		width: 76px;
		height: 76px;
		padding-left: 5px;
		background: rgba(255, 255, 255, 0.18);
		border: 1.5px solid rgba(255, 255, 255, 0.75);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		transition:
			transform 0.25s,
			background 0.25s;
	}
	.thumb:hover .playbtn,
	.thumb:focus-visible .playbtn {
		transform: scale(1.07);
		background: rgba(255, 255, 255, 0.28);
	}
	.corner-l {
		top: calc(12px + env(safe-area-inset-top, 0px));
		left: calc(12px + env(safe-area-inset-left, 0px));
	}
	.corner-r {
		top: calc(12px + env(safe-area-inset-top, 0px));
		right: calc(12px + env(safe-area-inset-right, 0px));
	}
	.seed {
		bottom: calc(12px + env(safe-area-inset-bottom, 0px));
		left: calc(12px + env(safe-area-inset-left, 0px));
	}
	.hint {
		bottom: calc(40px + env(safe-area-inset-bottom, 0px));
		background: rgba(20, 24, 44, 0.45);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		opacity: 0;
		transition: opacity 0.8s;
		white-space: nowrap;
	}
	.hint.show {
		opacity: 1;
	}
	.ctrl {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border-radius: 999px;
		color: white;
		background: rgba(20, 24, 44, 0.35);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		transition: background 0.2s;
	}
	.ctrl:hover {
		background: rgba(20, 24, 44, 0.6);
	}
</style>
