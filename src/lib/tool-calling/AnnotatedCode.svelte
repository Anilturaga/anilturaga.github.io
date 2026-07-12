<script lang="ts">
	import { SECTION_META, type Dialect, type Block } from './dialects';

	let { dialect }: { dialect: Dialect } = $props();

	const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	let allTokens = $derived(
		[...dialect.specialTokens, ...(dialect.vocabTokens ?? [])].sort((a, b) => b.length - a.length)
	);
	let tokenRe = $derived(new RegExp('(' + allTokens.map(escapeRe).join('|') + ')'));
	let softSet = $derived(new Set(dialect.vocabTokens ?? []));

	function runs(text: string) {
		return text
			.split(tokenRe)
			.filter((s) => s !== '')
			.map((s) => ({ text: s, tok: allTokens.includes(s), soft: softSet.has(s) }));
	}

	// Segments carrying a tip, in order, so the inline superscript and the
	// footnote list below the block agree on numbering.
	function tips(block: Block) {
		return block.segments.map((s, si) => ({ si, tip: s.tip })).filter((s) => s.tip);
	}
</script>

<!-- prettier-ignore: body must stay whitespace-free — any markup whitespace
     here renders as stray spaces inside the pre-wrap transcript -->
{#snippet tokenized(t: string)}{#each runs(t) as r, i (i)}{#if r.tok}<span
				class="tok"
				class:soft={r.soft}>{r.text}</span
			>{:else}{r.text}{/if}{/each}{/snippet}

<div class="border-base-300 bg-base-100 mt-4 overflow-hidden rounded-xl border">
	<!-- pre-wrap lives on .sect-text, not here: markup whitespace between the
	     label span and the content would otherwise render as stray indents -->
	<div class="font-mono text-[12.5px] leading-[1.75]">
		{#each dialect.blocks as block, bi (bi)}
			{@const blockTips = tips(block)}
			<div class="section" data-kind={block.kind}>
				<span class="section-label">{SECTION_META[block.kind].label}</span>
				<!-- label comes AFTER the content: Chromium emits a zero-width line
				     placeholder for abspos inlines, which would keep the markup space
				     before .sect-text alive as a stray leading indent -->
				<span class="sect-text"
					>{#each block.segments as seg, si (si)}{#if seg.tip}{@const num =
							blockTips.findIndex((t) => t.si === si) + 1}<span class="tip-target"
							>{@render tokenized(seg.text)}<sup class="tip-num">{num}</sup></span
						>{:else}{@render tokenized(seg.text)}{/if}{/each}</span
				>
				{#if blockTips.length}
					<details class="footnote-toggle">
						<summary>{blockTips.length} annotation{blockTips.length > 1 ? 's' : ''}</summary>
						<ol class="footnotes">
							{#each blockTips as t, i (t.si)}
								<li><span class="fn-num">{i + 1}</span><span>{t.tip}</span></li>
							{/each}
						</ol>
					</details>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	[data-kind='system'] {
		--accent: var(--color-secondary);
	}
	[data-kind='schema'] {
		--accent: var(--color-info);
	}
	[data-kind='user'] {
		--accent: var(--color-success);
	}
	[data-kind='reasoning'] {
		--accent: var(--color-error);
	}
	[data-kind='call'] {
		--accent: var(--color-primary);
	}
	[data-kind='response'] {
		--accent: var(--color-warning);
	}

	/* ---- sections: full-bleed to the card edge, no wasted border gap;
	       the outer card's overflow-hidden + rounded-xl clips the first
	       and last section into the card's own corners ---- */
	.section {
		position: relative;
		margin: 0.35rem 0;
		padding: 0.5rem 1.15rem;
		background: color-mix(in srgb, var(--accent) 8%, transparent);
	}
	.section:first-child {
		margin-top: 0;
	}
	.section:last-child {
		margin-bottom: 0;
	}

	.section-label {
		display: inline-block;
		margin: -0.05rem 0 0.35rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.625rem;
		font-weight: 600;
		letter-spacing: 0.07em;
		text-transform: uppercase;
		padding: 0.08rem 0.45rem;
		border-radius: 0.3rem;
		background: var(--color-base-100);
		border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
		color: color-mix(in srgb, var(--accent) 65%, var(--color-base-content));
	}

	.sect-text {
		display: block;
		white-space: pre-wrap;
	}

	/* ---- special-token pills: both variants reserve the same 1px border
	       box, so switching between them never shifts the line's alignment ---- */
	.tok {
		display: inline-block;
		box-sizing: border-box;
		padding: 0 0.22em;
		border: 1px solid transparent;
		border-radius: 0.3em;
		background: color-mix(in srgb, var(--accent) 20%, transparent);
		color: color-mix(in srgb, var(--accent) 45%, var(--color-base-content));
		font-weight: 600;
	}
	/* opaque against the card background — punches through any ambient
	   tip-target/section wash so it reads as unfilled even mid-annotation */
	.tok.soft {
		background: var(--color-base-100);
		border-color: color-mix(in srgb, var(--accent) 55%, transparent);
		border-style: dashed;
	}

	/* ---- annotated spans: a light wash plus a footnote marker, nothing
	       overlapping the transcript itself. No padding/negative-margin here
	       (that was a hover-era hit-target expander) — it painted a sliver
	       of background on blank lines inside multi-line tipped text. ---- */
	.tip-target {
		display: inline;
		border-radius: 0.3em;
		box-decoration-break: clone;
		-webkit-box-decoration-break: clone;
		background: color-mix(in srgb, var(--accent) 16%, transparent);
	}
	.tip-num {
		font-size: 0.65em;
		font-weight: 700;
		color: color-mix(in srgb, var(--accent) 75%, var(--color-base-content));
	}

	/* ---- footnotes: collapsed by default so the annotations don't break
	       reading flow; expand on demand via the summary toggle ---- */
	.footnote-toggle {
		margin: 0.5rem 0 0.1rem;
	}
	.footnote-toggle summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px dashed color-mix(in srgb, var(--accent) 25%, transparent);
		cursor: pointer;
		list-style: none;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.68rem;
		font-weight: 600;
		letter-spacing: 0.02em;
		color: color-mix(in srgb, var(--accent) 60%, var(--color-base-content));
	}
	.footnote-toggle summary::-webkit-details-marker {
		display: none;
	}
	.footnote-toggle summary::marker {
		content: '';
	}
	.footnote-toggle summary::after {
		content: '▾';
		display: inline-block;
		font-size: 1.15em;
		line-height: 1;
		color: color-mix(in srgb, var(--accent) 75%, var(--color-base-content));
		transition: transform 120ms ease;
	}
	.footnote-toggle[open] summary::after {
		transform: rotate(180deg);
	}
	.footnotes {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin: 0.4rem 0 0.15rem;
	}
	.footnotes li {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
		font-size: 0.72rem;
		line-height: 1.5;
		white-space: normal;
		color: color-mix(in srgb, var(--color-base-content) 68%, transparent);
	}
	.fn-num {
		flex: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.15em;
		height: 1.15em;
		border-radius: 9999px;
		background: color-mix(in srgb, var(--accent) 18%, transparent);
		color: color-mix(in srgb, var(--accent) 70%, var(--color-base-content));
		font-weight: 700;
		font-size: 0.65rem;
	}
</style>
