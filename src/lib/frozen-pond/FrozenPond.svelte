<script lang="ts">
	import { onMount } from 'svelte';
	import { Shuffle, Volume2, VolumeX, Maximize, Minimize } from 'lucide-svelte';
	import type { Game, InputKey } from './game';

	let container: HTMLDivElement;
	let canvas: HTMLCanvasElement;
	let fx: HTMLCanvasElement;
	let game: Game | null = null;

	let started = $state(false);
	let muted = $state(false);
	let fullscreen = $state(false);
	let showHint = $state(false);
	let info = $state({ palette: '', seed: 0 });
	let isTouch = $state(false);

	let lastTap = { t: 0, x: 0, y: 0 };
	let activePointer: number | null = null;

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

	onMount(() => {
		isTouch = matchMedia('(pointer: coarse)').matches;
		let disposed = false;
		let ro: ResizeObserver | undefined;
		let io: IntersectionObserver | undefined;
		const onVis = () => {
			if (!game) return;
			if (document.hidden) {
				game.stop();
				game.audio.suspend();
			} else if (inView) {
				game.start();
				if (started) game.audio.resume();
			}
		};
		let inView = true;

		import('./game').then(({ Game }) => {
			if (disposed) return;
			game = new Game(canvas, fx);
			game.onInfo = (i) => (info = i);
			game.regenerate();
			const r = container.getBoundingClientRect();
			game.resize(r.width, r.height);
			game.start();

			ro = new ResizeObserver(() => {
				const r = container.getBoundingClientRect();
				game?.resize(r.width, r.height);
			});
			ro.observe(container);

			io = new IntersectionObserver(
				([e]) => {
					inView = e.isIntersecting;
					if (!game) return;
					if (inView && !document.hidden) {
						game.start();
						if (started) game.audio.resume();
					} else {
						game.stop();
						game.audio.suspend();
					}
				},
				{ threshold: 0.05 }
			);
			io.observe(container);
		});
		document.addEventListener('visibilitychange', onVis);
		const onFs = () => (fullscreen = document.fullscreenElement === container);
		document.addEventListener('fullscreenchange', onFs);

		return () => {
			disposed = true;
			ro?.disconnect();
			io?.disconnect();
			document.removeEventListener('visibilitychange', onVis);
			document.removeEventListener('fullscreenchange', onFs);
			game?.dispose();
			game = null;
		};
	});

	function begin() {
		if (!game) return;
		started = true;
		game.audio.start();
		game.audio.setMuted(muted);
		container.focus({ preventScroll: true });
		showHint = true;
		setTimeout(() => (showHint = false), 6000);
	}

	function local(e: PointerEvent) {
		const r = canvas.getBoundingClientRect();
		return { x: e.clientX - r.left, y: e.clientY - r.top };
	}

	function onPointerDown(e: PointerEvent) {
		if (!started || !game) return;
		if (activePointer !== null) return;
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
		container.focus({ preventScroll: true });
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
		if (!started || !game) return;
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
		const r = container.getBoundingClientRect();
		game?.resize(r.width, r.height);
		container.focus({ preventScroll: true });
	}

	function toggleMute() {
		muted = !muted;
		game?.audio.setMuted(muted);
	}

	async function toggleFullscreen() {
		try {
			if (document.fullscreenElement) await document.exitFullscreen();
			else await container.requestFullscreen();
		} catch {
			// fullscreen isn't available everywhere (e.g. iPhone Safari); the game still works inline
		}
		container.focus({ preventScroll: true });
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<div
	bind:this={container}
	class="pond relative w-full overflow-hidden rounded-xl bg-[#1b1f33] outline-none select-none"
	class:fs={fullscreen}
	tabindex="0"
	role="application"
	aria-label="Frozen pond skating game"
	onkeydown={(e) => onKey(e, true)}
	onkeyup={(e) => onKey(e, false)}
	onblur={() => game && ['left', 'right', 'up', 'down'].forEach((k) => game?.setKey(k as InputKey, false))}
>
	<canvas
		bind:this={canvas}
		class="pixel absolute inset-0 h-full w-full"
		style:touch-action={started ? 'none' : 'auto'}
		onpointerdown={onPointerDown}
		onpointermove={onPointerMove}
		onpointerup={onPointerUp}
		onpointercancel={onPointerUp}
		oncontextmenu={(e) => e.preventDefault()}
	></canvas>
	<canvas bind:this={fx} class="pointer-events-none absolute inset-0 h-full w-full"></canvas>
	<div class="vignette pointer-events-none absolute inset-0"></div>

	{#if started}
		<div class="absolute top-3 right-3 flex gap-2">
			<button class="ctrl" onclick={newPond} aria-label="New pond" title="New pond"><Shuffle size={18} /></button>
			<button class="ctrl" onclick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>
				{#if muted}<VolumeX size={18} />{:else}<Volume2 size={18} />{/if}
			</button>
			<button class="ctrl" onclick={toggleFullscreen} aria-label="Fullscreen" title="Fullscreen">
				{#if fullscreen}<Minimize size={18} />{:else}<Maximize size={18} />{/if}
			</button>
		</div>
		<div class="pointer-events-none absolute bottom-3 left-3 font-mono text-[11px] tracking-wide text-white/70">
			{info.palette} · #{info.seed.toString(36)}
		</div>
		<div
			class="hint pointer-events-none absolute bottom-10 left-1/2 -translate-x-1/2 rounded-full px-4 py-2 text-center text-xs text-white sm:text-sm"
			class:show={showHint}
		>
			{#if isTouch}
				Hold &amp; drag to skate · double-tap to spin
			{:else}
				Hold the mouse or use arrows/WASD to skate · Space or double-click to spin
			{/if}
		</div>
	{:else}
		<button
			class="intro absolute inset-0 flex flex-col items-center justify-center gap-3 text-white"
			onclick={begin}
		>
			<span class="text-3xl font-light tracking-[0.2em] sm:text-4xl">FROZEN POND</span>
			<span class="text-sm text-white/80">a quiet little skate · sound on</span>
			<span class="mt-3 rounded-full border border-white/60 px-5 py-2 text-sm tracking-wider backdrop-blur-sm"
				>{isTouch ? 'Tap' : 'Click'} to start</span
			>
		</button>
	{/if}
</div>

<style>
	.pond {
		aspect-ratio: 4 / 5;
	}
	@media (min-width: 640px) {
		.pond {
			aspect-ratio: 16 / 10;
		}
	}
	.pond.fs {
		aspect-ratio: auto;
		width: 100vw;
		height: 100vh;
		border-radius: 0;
	}
	.pixel {
		image-rendering: pixelated;
		image-rendering: crisp-edges;
		cursor: crosshair;
	}
	.vignette {
		background: radial-gradient(ellipse at center, transparent 55%, rgba(10, 12, 30, 0.35) 100%);
	}
	.ctrl {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
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
	.intro {
		background: linear-gradient(to bottom, rgba(20, 24, 50, 0.15), rgba(20, 24, 50, 0.55));
		text-shadow: 0 1px 12px rgba(0, 0, 0, 0.35);
		cursor: pointer;
	}
	.hint {
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
</style>
