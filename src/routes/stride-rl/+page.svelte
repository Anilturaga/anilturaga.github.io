<script lang="ts">
	import StrideDemo from '$lib/stride-rl/StrideDemo.svelte';

	const post = {
		title: 'Adaptive action repetition for long-running agents',
		description:
			'A minimal experiment connecting credit assignment, inference cost, and decision stride.',
		date: '2026-05-31',
		author: 'Anil Turaga'
	};
</script>

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
			<p>Training long-running agents is an optimization problem across at least three axes:</p>

			<ul class="list-inside list-disc space-y-2">
				<li>
					Credit assignment: distributing a task's reward across hundreds of decisions is hard — the
					longer the horizon, the more diluted the signal
				</li>
				<li>
					Inference cost: agents that re-evaluate at every micro-step accumulate unnecessary
					calls/context; the ones that commit briefly then immediately second-guess are also not
					good
				</li>
				<li>
					Decision stride: models need to learn not just what action to take but how long that
					action stays valid before reassessing
				</li>
			</ul>

			<p>
				(Memory and long-context are their own rabbit hole and I'm not covering them in this post.)
			</p>

			<p>
				I built a minimal experiment to demonstrate how these three connect using adaptive action
				repetition.
			</p>

			<p>
				At each decision point, the model jointly predicts an action and a duration. The duration is
				how many steps to hold that action before deciding again.
			</p>

			<StrideDemo />

			<p>
				Fewer decisions means rewards map back to actions more cleanly. Held actions mean no wasted
				inference mid-commitment. And the model has to learn the right stride: commit too long and
				miss the window to correct; too short and back to re-evaluating everything.
			</p>

			<p>
				The left frames show the model trained with AAR and the right ones are the baseline/vanilla
				ones.
			</p>
		</div>

		<figure class="bg-base-200 my-8 rounded-2xl p-3">
			<video
				class="w-full rounded-xl"
				controls
				muted
				playsinline
				preload="metadata"
				aria-label="Sleep and no-sleep trained models running side by side on LunarLander and MountainCar"
			>
				<source src="/assets/stride-rl/demo.mp4" type="video/mp4" />
				Your browser does not support the video tag.
			</video>
			<figcaption class="text-base-content/60 mt-2 text-sm">
				Actual test run from the repo: sleep/AAR on the left, no-sleep baseline on the right.
			</figcaption>
		</figure>

		<p class="text-md mb-16 leading-relaxed">
			GitHub repo(the models can be trained in a couple of minutes): <a
				href="https://github.com/Anilturaga/stride-rl"
				target="_blank"
				rel="noreferrer"
				class="link link-primary">https://github.com/Anilturaga/stride-rl</a
			>
		</p>
	</article>
</div>
