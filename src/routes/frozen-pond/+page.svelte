<script lang="ts">
	import FrozenPond from '$lib/frozen-pond/FrozenPond.svelte';

	const post = {
		title: 'Frozen Pond',
		description:
			'A small skating game where every pond, tree, shadow and note of music is generated from a seed.',
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
			<p>
				I came across <a
					class="link"
					href="https://x.com/trq212/status/2125156290494353663"
					target="_blank"
					rel="noopener noreferrer">a short clip</a
				> of someone skating across a frozen pond, with long winter shadows, falling snow and their blade
				marks building up on the ice. I wanted to skate on it, so I built my own version. Put your
				headphones on.
			</p>

			<FrozenPond />

			<p class="text-base-content/70 text-sm">
				Hold the mouse (or your finger) where you want to go and the skater pushes off toward it. Let
				go to glide. Arrow keys or WASD work too. Space, a double-click or a double-tap does a spin.
				The shuffle button gives you a new pond.
			</p>

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
					with cracks, frozen bubbles and old scratches drawn on top. The whole layer then gets ordered dithering,
					which gives it that soft printed-pixel texture.
				</li>
				<li>
					<b>Trees</b> grow as small recursive 3D branch structures. The same branches are drawn twice:
					once seen from a slightly tilted camera, and once projected along a low sun to make the long shadows
					across the ice. Pines, bushes, reeds, the fence, the bench and the lamps work the same way.
				</li>
				<li>
					<b>The skater</b> is a 3D stick skeleton posed procedurally. Pushing strides, gliding, banking into
					turns and spinning are blended together. The blades only grip sideways, so gentle turns carve and
					keep your speed, while sharp ones skid and throw up spray. Each blade leaves a mark that slowly
					fades under fresh snow.
				</li>
				<li>
					<b>The music</b> is synthesised live with the Web Audio API: a slow I–vi–IV–V pad, sparse FM bells
					wandering a pentatonic scale, wind, and blade hiss that follows your speed. The bells get more
					frequent the faster you skate, and each pond picks its own key.
				</li>
			</ul>
			<p>
				There are four lighting moods (dusk, morning, mist and moonlight). Shuffle a few times to find
				one you like.
			</p>
		</div>
	</article>
</div>
