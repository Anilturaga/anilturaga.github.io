<script lang="ts">
	import { onMount } from 'svelte';
	import { Shuffle, Volume2, VolumeX, X, Play, CircleHelp } from 'lucide-svelte';
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
	let hintShownAt = 0;

	function showGuide() {
		showHint = true;
		hintShownAt = performance.now();
		clearTimeout(hintTimer);
		hintTimer = setTimeout(() => (showHint = false), 9000);
	}

	// the guide gets out of the way as soon as you start skating
	function dismissGuide() {
		if (showHint && performance.now() - hintShownAt > 500) {
			showHint = false;
			clearTimeout(hintTimer);
		}
	}

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
		showGuide();
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
		dismissGuide();
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
		if (down) dismissGuide();
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

	function changeClimate() {
		dismissGuide();
		game?.nextClimate();
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
			<button class="ctrl" onclick={showGuide} aria-label="Show controls" title="Controls"><CircleHelp size={18} /></button>
			<button class="ctrl" onclick={changeClimate} aria-label="Change climate" title="Change climate"><Shuffle size={18} /></button>
			<button class="ctrl" onclick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} title={muted ? 'Unmute' : 'Mute'}>
				{#if muted}<VolumeX size={18} />{:else}<Volume2 size={18} />{/if}
			</button>
		</div>
		<div class="seed pointer-events-none absolute font-mono text-[11px] tracking-wide text-white/70">
			{info.palette}
		</div>
		<div class="guide pointer-events-none absolute inset-x-0 flex justify-center text-white" class:show={showHint} aria-hidden="true">
			{#if isTouch}
				<div class="flex items-end gap-12">
					<figure class="g">
						<div class="stage">
							<svg class="path" viewBox="0 0 120 64" width="120" height="64">
								<path d="M10 46 C 40 4, 80 4, 110 40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 5" stroke-linecap="round" />
							</svg>
							<span class="finger drag"></span>
						</div>
						<figcaption>skate</figcaption>
					</figure>
					<figure class="g">
						<div class="stage tap">
							<span class="ripple"></span>
							<span class="ripple r2"></span>
							<span class="finger"></span>
						</div>
						<figcaption>spin</figcaption>
					</figure>
				</div>
			{:else}
				<div class="flex items-end gap-7 sm:gap-10">
					<figure class="g">
						<div class="mouse"><span class="btn"></span></div>
						<figcaption>steer</figcaption>
					</figure>
					<figure class="g">
						<div class="arrows">
							<kbd class="k up">↑</kbd>
							<kbd class="k">←</kbd><kbd class="k">↓</kbd><kbd class="k">→</kbd>
						</div>
						<figcaption>skate</figcaption>
					</figure>
					<figure class="g">
						<kbd class="k space">space</kbd>
						<figcaption>spin</figcaption>
					</figure>
					<figure class="g">
						<kbd class="k wide">esc</kbd>
						<figcaption>leave</figcaption>
					</figure>
				</div>
			{/if}
		</div>
	{:else}
		<button class="thumb absolute inset-0 grid place-items-center text-white" onclick={play} aria-label="Play Frozen Pond">
			<span class="playbtn grid place-items-center rounded-full"><Play size={34} fill="currentColor" /></span>
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
	.guide {
		bottom: calc(56px + env(safe-area-inset-bottom, 0px));
		opacity: 0;
		transform: translateY(8px);
		transition:
			opacity 0.6s,
			transform 0.6s;
		filter: drop-shadow(0 2px 10px rgba(10, 12, 30, 0.45));
	}
	.guide.show {
		opacity: 1;
		transform: none;
	}
	.g {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		margin: 0;
	}
	figcaption {
		font-size: 11px;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.85);
	}
	.k {
		display: grid;
		place-items: center;
		min-width: 30px;
		height: 30px;
		padding: 0 6px;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.7);
		border-bottom-width: 3px;
		background: rgba(20, 24, 44, 0.4);
		backdrop-filter: blur(6px);
		-webkit-backdrop-filter: blur(6px);
		font: 600 12px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
	}
	.k.wide {
		min-width: 44px;
	}
	.k.space {
		min-width: 96px;
	}
	.arrows {
		display: grid;
		grid-template-columns: repeat(3, 30px);
		gap: 4px;
	}
	.arrows .up {
		grid-column: 2;
	}
	.arrows .up + .k {
		grid-column: 1;
	}
	.arrows .up {
		animation: press 1.6s ease-in-out infinite;
	}
	.mouse {
		position: relative;
		width: 28px;
		height: 42px;
		border-radius: 14px;
		border: 1.5px solid rgba(255, 255, 255, 0.8);
		background: rgba(20, 24, 44, 0.4);
		overflow: hidden;
	}
	.mouse .btn {
		position: absolute;
		left: 0;
		top: 0;
		width: 50%;
		height: 42%;
		border-right: 1px solid rgba(255, 255, 255, 0.6);
		border-bottom: 1px solid rgba(255, 255, 255, 0.6);
		animation: hold 1.6s ease-in-out infinite;
	}
	.stage {
		position: relative;
		width: 120px;
		height: 64px;
	}
	.stage.tap {
		width: 64px;
	}
	.path {
		position: absolute;
		inset: 0;
		opacity: 0.7;
	}
	.finger {
		position: absolute;
		width: 26px;
		height: 26px;
		margin: -13px 0 0 -13px;
		left: 50%;
		top: 50%;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.35);
		border: 1.5px solid rgba(255, 255, 255, 0.9);
	}
	.finger.drag {
		animation: drag 2.2s ease-in-out infinite;
	}
	.ripple {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 26px;
		height: 26px;
		margin: -13px 0 0 -13px;
		border-radius: 999px;
		border: 1.5px solid rgba(255, 255, 255, 0.9);
		animation: ripple 1.6s ease-out infinite;
	}
	.ripple.r2 {
		animation-delay: 0.22s;
	}
	@keyframes drag {
		0% {
			left: 8%;
			top: 72%;
			transform: scale(1.25);
			opacity: 0;
		}
		12% {
			transform: scale(1);
			opacity: 1;
		}
		50% {
			left: 50%;
			top: 22%;
		}
		85% {
			left: 92%;
			top: 62%;
			opacity: 1;
		}
		100% {
			left: 92%;
			top: 62%;
			opacity: 0;
		}
	}
	@keyframes ripple {
		0% {
			transform: scale(1);
			opacity: 0.9;
		}
		70%,
		100% {
			transform: scale(2.4);
			opacity: 0;
		}
	}
	@keyframes hold {
		0%,
		15% {
			background: transparent;
		}
		25%,
		80% {
			background: rgba(255, 255, 255, 0.75);
		}
		90%,
		100% {
			background: transparent;
		}
	}
	@keyframes press {
		0%,
		15%,
		85%,
		100% {
			background: rgba(20, 24, 44, 0.4);
			border-bottom-width: 3px;
		}
		25%,
		75% {
			background: rgba(255, 255, 255, 0.35);
			border-bottom-width: 1px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.finger,
		.ripple,
		.mouse .btn,
		.arrows .up {
			animation: none !important;
		}
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
