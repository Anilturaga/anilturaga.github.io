<script lang="ts">
	let { tokens } = $props();
	// Generate pastel colors with sufficient spacing between hues
	function generateSpacedPastelColors(count: number) {
		const hueStep = 360 / count;
		return Array.from({ length: count }, (_, i) => {
			const hue = (i * hueStep + Math.random() * (hueStep * 0.5)) % 360;
			return `hsl(${hue}, 70%, 80%)`;
		});
	}

	let colors = $state(generateSpacedPastelColors(tokens.length));
	let activeIndex = $state(-1);
	let hoveredIndex = $state(-1);

	function getBackgroundColor(index: number) {
		if (hoveredIndex === -1 && activeIndex === -1) {
			return colors[index];
		}
		if (hoveredIndex === index || activeIndex === index) {
			return colors[index];
		}
		return 'transparent';
	}
</script>

<div class="my-4 border border-base-300 rounded-lg p-4">
	<div class="text-sm font-medium mb-2">Token View</div>
	<div class="flex flex-row flex-wrap gap-0 items-center">
		<pre data-prefix=">" class="!pr-0"></pre>
		{#each tokens as token, i}
			<button
				class="cursor-pointer whitespace-pre transition-colors duration-200"
				class:text-black={getBackgroundColor(i) !== 'transparent'}
				class:text-base-content={getBackgroundColor(i) === 'transparent'}
				style:background-color={getBackgroundColor(i)}
				style:opacity={(hoveredIndex === -1 || hoveredIndex === i) ? "1" : "0.5"}
				onclick={() => (activeIndex = activeIndex === i ? -1 : i)}
				onmouseenter={() => (hoveredIndex = i)}
				onmouseleave={() => (hoveredIndex = -1)}
			>
				<code>{token}</code>
    </button>
		{/each}
	</div>
	<div class="text-sm text-base-content/70 pt-2 text-right">Click or hover to highlight the tokens</div>
</div>
