<script lang="ts">
	import { dialects } from './dialects';
	import AnnotatedCode from './AnnotatedCode.svelte';

	let active = $state(0);
	let current = $derived(dialects[active]);
</script>

<div class="not-prose my-8">
	<div class="border-base-300 flex items-baseline justify-between gap-4 border-b">
		<div role="tablist" class="flex gap-5">
			{#each dialects as d, i (d.key)}
				<button
					role="tab"
					aria-selected={active === i}
					class="-mb-px border-b-2 pb-2 text-sm font-medium transition-colors {active === i
						? 'border-base-content text-base-content'
						: 'text-base-content/45 hover:text-base-content/75 border-transparent'}"
					onclick={() => (active = i)}
				>
					{d.label}
				</button>
			{/each}
		</div>
		<span class="text-base-content/40 pb-2 text-[11px] tracking-wide uppercase"
			>{current.models}</span
		>
	</div>

	<AnnotatedCode dialect={current} />

	<p class="text-base-content/75 mt-3 text-sm leading-relaxed">{current.blurb}</p>
</div>
