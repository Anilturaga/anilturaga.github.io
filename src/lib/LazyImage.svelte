<script lang="ts">
	import { onMount } from 'svelte';

	let { src, alt, class: className = '', objectFit = 'object-cover', ...restProps } = $props();
	
	let imgElement: HTMLDivElement;
	let isLoaded = $state(false);
	let isInView = $state(false);
	let observer: IntersectionObserver;

	onMount(() => {
		// Create intersection observer to detect when image comes into view
		observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						isInView = true;
						observer.unobserve(entry.target);
					}
				});
			},
			{
				rootMargin: '50px' // Start loading 50px before the image comes into view
			}
		);

		if (imgElement) {
			observer.observe(imgElement);
		}

		return () => {
			if (observer) {
				observer.disconnect();
			}
		};
	});

	function handleLoad() {
		isLoaded = true;
	}

	function handleError() {
		console.error(`Failed to load image: ${src}`);
	}
</script>

<!-- Placeholder div that maintains aspect ratio -->
<div 
	bind:this={imgElement}
	class="relative overflow-hidden bg-base-200 {className}"
	{...restProps}
>
	{#if isInView}
		<img
			{src}
			{alt}
			class="w-full h-full {objectFit} transition-opacity duration-300 {isLoaded ? 'opacity-100' : 'opacity-0'}"
			onload={handleLoad}
			onerror={handleError}
			loading="lazy"
		/>
		
		{#if !isLoaded}
			<!-- Loading skeleton -->
			<div class="absolute inset-0 bg-base-200 animate-pulse flex items-center justify-center">
				<div class="text-base-content/50 text-sm">Loading...</div>
			</div>
		{/if}
	{:else}
		<!-- Placeholder before image comes into view -->
		<div class="w-full h-full bg-base-200 animate-pulse flex items-center justify-center">
			<div class="text-base-content/30 text-sm">📷</div>
		</div>
	{/if}
</div> 