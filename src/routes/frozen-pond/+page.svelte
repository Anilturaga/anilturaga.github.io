<script lang="ts">
	import FrozenPond from '$lib/frozen-pond/FrozenPond.svelte';

	const post = {
		title: 'Frozen Pond Game',
		description:
			'A procedurally generated ice skating game inspired by a clip Thariq posted.',
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
				<a
					class="link"
					href="https://x.com/trq212/status/2125156290494353663"
					target="_blank"
					rel="noopener noreferrer">Thariq's post on X</a
				>
			</p>
		</div>
	</article>
</div>
