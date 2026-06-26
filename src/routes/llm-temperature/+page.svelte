<script lang="ts">
	import { onMount } from 'svelte';

	let linkedin = false;

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const source = params.get('source');

		// We only handle the state change here
		if (source === 'linkedin') {
			linkedin = true;
		}
	});

	// This is the Svelte Action. It runs the exact moment the element mounts.
	function scrollToTarget(node: HTMLElement) {
		node.scrollIntoView({
			behavior: 'smooth',
			block: 'start'
		});
	}
	const post = {
		title: 'Understanding the deprecation of temperature parameter in LLMs',
		description:
			'Temperature, top_p and top_k went from being the main parameters for controlling the output of LLMs to being deprecated as a consequence of better training methods.',
		date: '2026-06-26',
		author: 'Anil Turaga'
	};
</script>

<div class="flex w-full flex-col items-center">
	<div class="mx-auto my-8 w-[90%] md:w-[60%]">
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

		<!-- adding markdown content here -->

		<div class="prose max-w-none">
			<p>
				Over the past year and a half, OpenAI, Anthropic, and Google have all stopped supporting
				temperature, top_p, and top_k on their latest flagship models. Used to be that every other
				interviewer asked about them and these parameters were usually the first ones to be tuned
				when an app didn't produce expected outputs. I will try to explain why these parameters were
				deprecated.

				<br />
				<br />
				Quick recap on these parameters and their interactions. Temperature rescales the model's output
				probabilities. Low values sharpen the distribution toward the top token, and high values flatten
				it so more tokens become candidates. Top_p (nucleus sampling) keeps only the most likely tokens
				whose probabilities sum to p, and discards the rest. Top_k keeps the top k tokens by probability.
				All three control how focused or random the output is, and they interact with each other. Temperature
				and top_p both operate on the same distribution. Raising temperature flattens it, which then
				enlarges top_p's nucleus. Setting both at non-default values gives unpredictable results, which
				is why all three providers have long recommended adjusting only one of them at a time.
				<br />
				<br />
				Two years ago I worked on a creative content pipeline for an apparel brand. The task was to get
				GPT4o to generate creative product descriptions in English and then translate them into several
				languages, all while retaining the brand's tone and voice. It was hard to get the content to
				read like human with just prompts and instructions. After a bunch of experiments with all the
				parameters, tuning top_p worked much better than raising temperature for creativity. On brand
				voice, completely removing instructions and adding few-shot examples did miracles since GPT-4o
				was bad at following long instructions. I tried logit bias too but it was too brittle.
				<br />
				<br />
				If one were to build this pipeline today, the approach would be different. The newer models follow
				detailed instructions far better which means we can prompt them with detailed and complex style
				guidance. However, there won't be an explicit parameter to control creativity. The reason is
				that these newer models go through an additional training phase called RLVR (reinforcement learning
				with verifiable rewards): the model is given a task with a verifiable answer (math problems with
				a ground-truth answer, code problems checked against unit tests), it generates a candidate solution,
				and the training loop updates the policy to make tokens that appeared in high-reward completions
				more likely under similar prompts.

				{#if linkedin}
					<br use:scrollToTarget id="linkedin-section" />
					<span class="divider">Continue reading</span>
				{:else}
					<br />
					<br />
				{/if}
				To see what this training does to the model, we can look at the entropy of its output distribution.
				Entropy is a measure of how spread out probability is across the vocabulary at each step. A high-entropy
				distribution gives many tokens a reasonable chance, while a low-entropy one concentrates probability
				on the top few. Over many iterations of RLVR, this entropy drops sharply, and most of the probability
				mass ends up on tokens that led to correct answers. Recent work frames this entropy collapse
				as the dominant phenomenon during RLVR and shows an empirical relationship between policy entropy
				and downstream task performance. By the end of training, most of the probability at each step
				sits on the top one or two tokens. The base model's diversity has been traded for sharper task
				performance.
				<br />
				<br />
				A good metric to study this is Pass@k which measures whether at least one of k independently
				sampled completions of the same prompt is correct. The trade-off shows up here. For RLVR-trained
				models, pass@1 improves substantially over the base model whereas pass@k at larger k drops below
				base model. In agentic coding or tool-calling workflows, pass@1 matters a lot. The alternative
				but correct solution paths the model used to have are no longer in the distribution. That cost
				shows up in creative writing more than in correctness-driven workloads. We can't compensate it
				by making large changes to temperature at inference as these reasoning models tend to loop at
				low temperature and become incoherent at high temperature.

				<br />
				<br />
				To conclude, older models had broad output distributions where sampling controls actually moved
				the model into useful paths. Post-RL models trade that breadth for sharper task performance,
				which leaves the sampling controls with no value or even negative impact. The replacements are
				softer, more semantic knobs such as reasoning effort for compute budget, and the model's improved
				instruction-following.
			</p>
			<div class="divider py-4 pb-12">Thanks for reading!</div>
		</div>
	</div>
</div>
