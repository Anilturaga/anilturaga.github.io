<script lang="ts">
	import FrozenPond from '$lib/frozen-pond/FrozenPond.svelte';

	const post = {
		title: 'Frozen Pond Game',
		description:
			'Thariq shared a little clip of a skater gliding across a frozen pond at dusk, with long tree shadows on the ice and snow drifting down. I wanted to play it, so I built one where every pond, tree and note of music is generated fresh.',
		date: '2026-11-24',
		author: 'Anil Turaga'
	};
</script>

<svelte:head>
	<title>{post.title}</title>
	<meta name="description" content={post.description} />
</svelte:head>

<div class="flex w-full flex-col items-center">
	<article class="mx-auto my-8 w-[90%] md:w-[60%]">
		<h1 class="mb-4 text-4xl font-bold">{post.title}</h1>
		<div class="text-base-content/70 mb-6 flex items-center gap-4">
			<span>{post.author}</span>
			<span>•</span>
			<span
				>{new Date(post.date).toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})}</span
			>
		</div>
		<p class="text-base-content/80 mb-8 text-lg leading-relaxed">
			{post.description}
		</p>
		<div class="divider"></div>

		<div class="text-md space-y-5 leading-relaxed">
			<FrozenPond />

			<p>
				Inspired by <a
					class="link"
					href="https://x.com/trq212/status/2125156290494353663"
					target="_blank"
					rel="noopener noreferrer">Thariq's post on X</a
				>. Hit play, put your headphones on and skate around for a bit.
			</p>

			<h2 class="pt-4 text-2xl font-bold">Controls</h2>
			<ul class="list-inside list-disc space-y-2">
				<li>
					<b>Desktop:</b> hold the mouse where you want to go, or use the arrow keys / WASD. Space does
					a spin. Esc leaves.
				</li>
				<li><b>Phone:</b> hold and drag toward where you want to go. Double-tap to spin.</li>
				<li>Let go to glide. The shuffle button gives you a new pond.</li>
				<li>
					Skates don't forgive everything. Yank a hard turn at full speed or slam into the bank and
					you'll end up on the ice for a moment.
				</li>
			</ul>

			<h2 class="pt-4 text-2xl font-bold">How it's made</h2>
			<p>
				There are no image or audio files. Each pond starts from a random seed, and everything is
				derived from it:
			</p>
			<ul class="list-inside list-disc space-y-2">
				<li>
					<b>The pond</b> is an ellipse bent by a handful of sine harmonics, which gives a signed distance
					to the shore. That one function shades the ice, drifts snow against the bank and keeps the skater
					on the ice.
				</li>
				<li>
					<b>The ice and snow</b> are layers of value noise. Streaks are stretched along the wind direction,
					with cracks, frozen bubbles and old scratches drawn on top. The whole layer then gets ordered dithering
					for a soft printed-pixel texture.
				</li>
				<li>
					<b>Trees</b> are grown as 3D branch skeletons: broadleaf trees with fractal twig crowns, spruces
					built from drooping whorls of needled branches, and thin shrubs. The same branches are drawn twice:
					once through a slightly tilted camera, and once projected along a low sun for the long shadows across
					the ice.
				</li>
				<li>
					<b>The skater</b> is a 3D stick skeleton posed procedurally. Pushing strides, gliding, banking into
					turns, spinning and falling are blended together. The blades only grip sideways, so gentle turns carve
					and keep your speed, while sharp ones skid, throw up spray and can take you off your feet.
				</li>
				<li>
					<b>The music</b> is synthesised live with the Web Audio API: a slow I–vi–IV–V pad, sparse FM bells
					wandering a pentatonic scale, wind, and blade hiss that follows your speed. The bells get more frequent
					the faster you skate, and each pond picks its own key.
				</li>
			</ul>
			<p>
				There are four lighting moods (dusk, morning, mist and moonlight). Shuffle a few times to find
				one you like.
			</p>
		</div>
	</article>
</div>
