<script lang="ts">
	import { onMount } from 'svelte';

	const sleepDecisions = [3, 1, 4, 2, 2];
	let activeStep = 0;

	$: totalSteps = sleepDecisions.reduce((total, duration) => total + duration, 0);
	$: ranges = sleepDecisions.map((duration, index) => {
		const start = sleepDecisions.slice(0, index).reduce((total, value) => total + value, 0);
		return { duration, start, end: start + duration - 1 };
	});
	$: activeSleepIndex = ranges.findIndex(
		(range) => activeStep >= range.start && activeStep <= range.end
	);
	$: sleepCallsNow = ranges[activeSleepIndex]?.start === activeStep;

	onMount(() => {
		const interval = window.setInterval(() => {
			activeStep = (activeStep + 1) % totalSteps;
		}, 900);

		return () => window.clearInterval(interval);
	});
</script>

<section class="border-base-300 bg-base-100 my-10 rounded-2xl border p-4 shadow-sm md:p-6">
	<p class="text-primary text-sm font-semibold tracking-wide uppercase">Interactive sketch</p>
	<h2 class="text-2xl font-bold">Sleep/AAR decides only when the stride ends</h2>
	<p class="text-base-content/70 mt-2 max-w-2xl">
		The sleep/AAR model predicts a fresh duration at each decision point. The normal model decides at
		every time step.
	</p>

	<div class="mt-6 flex items-center gap-3">
		<div class="badge badge-primary badge-lg">Step {activeStep + 1}/{totalSteps}</div>
		<progress class="progress progress-primary h-2 flex-1" value={activeStep + 1} max={totalSteps}
		></progress>
	</div>

	<div class="bg-base-200 mt-6 overflow-x-auto rounded-2xl p-4">
		<div class="min-w-[42rem] space-y-4">
			<div>
				<div class="mb-3 flex items-center justify-between gap-3">
					<div class="font-semibold">Sleep / AAR</div>
					<div class="text-base-content/60 text-sm">
						{sleepDecisions.length} model calls for {totalSteps} steps
					</div>
				</div>

				<div class="grid grid-cols-12 gap-2" aria-label="Sleep model decisions">
					{#each ranges as range, index}
						<div
							class="rounded-lg px-3 py-2 text-center text-sm transition {activeSleepIndex === index
								? 'bg-primary text-primary-content shadow-md'
								: 'bg-base-100'}"
							style={`grid-column: span ${range.duration} / span ${range.duration}`}
						>
							<span class="opacity-70">call</span>
							<span class="mx-1 opacity-50">/</span>
							<span class="font-bold">hold {range.duration}</span>
						</div>
					{/each}
				</div>
			</div>

			<div>
				<div class="mb-3 flex items-center justify-between gap-3">
					<div class="font-semibold">Normal model</div>
					<div class="text-base-content/60 text-sm">{totalSteps} model calls for {totalSteps} steps</div>
				</div>

				<div class="grid grid-cols-12 gap-2" aria-label="Normal model decisions">
					{#each Array.from({ length: totalSteps }, (_, index) => index) as step}
						<div
							class="rounded-lg px-2 py-2 text-center text-xs font-bold transition {activeStep === step
								? 'bg-secondary text-secondary-content shadow-md'
								: 'bg-base-100'}"
						>
							call
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>

	<p class="text-base-content/70 bg-base-200 mt-5 rounded-xl p-4 text-sm">
		{#if sleepCallsNow}
			Sleep calls the model here and predicts the next hold duration. The normal model also calls
			the model.
		{:else}
			Sleep is still executing the previous decision. The normal model calls the model again.
		{/if}
	</p>
</section>
