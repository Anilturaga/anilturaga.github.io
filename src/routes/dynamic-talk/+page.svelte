<script lang="ts">
	import TokenizerComponent from '$lib/cpc/TokenizerComponent.svelte';
	import { Info, Book } from 'lucide-svelte';
	const post = {
		title: "Fine-tuning and Distillation of Large Language Models",
		description:
			'Video and reference links for a one hour talk I gave as part of the Dynamic Talk series at Grid Dynamics',
		date: '2025-06-05',
		author: 'Anil Turaga'
	};
</script>

<!-- Page Wrapper to stack content vertically -->
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

	<div class="relative w-full mb-8" style="aspect-ratio: 16 / 9;">
		<iframe
			class="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
			src="https://www.youtube.com/embed/rf8__1kUDaU"
			title="Fine-tuning and Distillation of Large Language Models"
			frameborder="0"
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
			allowfullscreen
		></iframe>
	</div>
</div>

<!-- Resources Section -->
<div class="mx-auto my-16 w-[90%] md:w-[60%]" id="resources">
	<h2 class="mb-4 flex items-center gap-2 text-xl font-bold">
		<Book class="h-7 w-7" />
		<span>Resources for fine-tuning&nbsp;LLMs</span>
	</h2>

	<p class="mb-4 text-base-content/80">
		Author:
		<a
			href="https://www.linkedin.com/in/anil-turaga/"
			target="_blank"
			class="link link-primary"
			>Anil&nbsp;Turaga's LinkedIn</a
		>
	</p>

	<p class="mb-8 text-base-content/80">
		Slides:
		<a
			href="https://drive.google.com/file/d/1UkMlRgZVOlV1Vmd1KG0HL31eEvdIl0vQ/view?usp=sharing"
			target="_blank"
			class="link link-secondary"
			>Dynamic Talk on Fine-tuning&nbsp;LLMs – PDF</a
		>
	</p>

	<!-- Libraries for finetuning -->
	<div class="collapse collapse-arrow bg-base-200 mb-4">
		<input type="checkbox" checked class="checkbox" />
		<div class="collapse-title text-lg font-medium">Libraries for finetuning</div>
		<div class="collapse-content prose max-w-none">
			<ul class="list-disc pl-4">
				<li>
					<strong>Unsloth</strong> –
					<a href="https://docs.unsloth.ai/" target="_blank" class="link link-primary">Docs</a>
				</li>
				<li>
					<strong>Torchtune</strong> –
					<a href="https://docs.pytorch.org/torchtune/stable/overview.html" target="_blank" class="link link-primary">Docs</a>
				</li>
				<li>
					<strong>Axolotl</strong> –
					<a href="https://docs.axolotl.ai/" target="_blank" class="link link-primary">Docs</a>
				</li>
			</ul>
		</div>
	</div>

	<!-- Infrastructure -->
	<div class="collapse collapse-arrow bg-base-200 mb-4">
        <input type="checkbox" checked class="checkbox" />
		<div class="collapse-title text-lg font-medium">Infrastructure</div>
		<div class="collapse-content prose max-w-none">
			<ol class="list-decimal pl-4">
				<li>
					<strong>Colab by Google</strong> – Free T4 for up to 4&nbsp;hours/day.
					<a href="https://colab.research.google.com" target="_blank" class="link link-primary">colab.research.google.com</a>
				</li>
				<li>
					<strong>RunPod</strong> – Wide array of GPU options.
					<a href="https://runpod.io/" target="_blank" class="link link-primary">runpod.io</a>
				</li>
				<li>
					<strong>Hyperscalers</strong> – GPU-enabled ML services on major clouds.
				</li>
				<li>
					<strong>Local</strong> – Nvidia GPU equipped machines.
					<a href="https://github.com/modelscope/ms-swift" target="_blank" class="link link-primary">macOS support</a>
				</li>
			</ol>
		</div>
	</div>

	<!-- Example use cases -->
	<div class="collapse collapse-arrow bg-base-200 mb-4">
		<input type="checkbox" checked class="checkbox" />
		<div class="collapse-title text-lg font-medium">Example use cases covered in the talk</div>
		<div class="collapse-content prose max-w-none">
			<ol class="list-decimal pl-4">
				<li>
					Continued pre-training for another language –
					<a href="https://colab.research.google.com/github/unslothai/notebooks/blob/main/nb/Mistral_v0.3_(7B)-CPT.ipynb" target="_blank" class="link link-primary">Notebook</a>,
					Datasets:
					<a href="https://huggingface.co/datasets/wikimedia/wikipedia" target="_blank" class="link link-primary">Wikipedia</a>,
					<a href="https://huggingface.co/datasets/FreedomIntelligence/alpaca-gpt4-korean" target="_blank" class="link link-primary">Alpaca Korean chat</a>
				</li>
				<li>
					Supervised fine-tuning for code edit prediction –
					<a href="https://colab.research.google.com/#fileId=https%3A//huggingface.co/datasets/zed-industries/zeta/blob/main/script/sft.ipynb" target="_blank" class="link link-primary">SFT Notebook</a>,
					<a href="https://colab.research.google.com/#fileId=https%3A//huggingface.co/datasets/zed-industries/zeta/blob/main/script/dpo.ipynb" target="_blank" class="link link-primary">DPO Notebook</a>,
					Dataset:
					<a href="https://huggingface.co/datasets/zed-industries/zeta/viewer" target="_blank" class="link link-primary">Zeta</a>
				</li>
				<li>
					Reinforcement learning with GRPO for writing style –
					<a href="https://github.com/dleemiller/PennyLM/blob/main/main.py" target="_blank" class="link link-primary">Training Script</a>,
					Datasets:
					<a href="https://huggingface.co/datasets/dleemiller/irish_penny_journal/viewer/default/train" target="_blank" class="link link-primary">Style Classification</a>,
					<a href="https://huggingface.co/datasets/WizardLMTeam/WizardLM_evol_instruct_V2_196k/viewer/default/train?row=0&views%5B%5D=train" target="_blank" class="link link-primary">Chat Questions</a>
				</li>
			</ol>
		</div>
	</div>

	<!-- OpenAI fine-tuning -->
	<div class="collapse collapse-arrow bg-base-200 mb-4">
		<input type="checkbox" checked class="checkbox" />
		<div class="collapse-title text-lg font-medium">OpenAI fine-tuning as a service</div>
		<div class="collapse-content prose max-w-none">
			<ul class="list-disc pl-4">
				<li>
					<a href="https://platform.openai.com/docs/guides/supervised-fine-tuning?formatting=jsonl" target="_blank" class="link link-primary">Supervised fine-tuning guide</a>
				</li>
				<li>
					<a href="https://platform.openai.com/docs/guides/direct-preference-optimization" target="_blank" class="link link-primary">Direct preference optimization</a>
				</li>
				<li>
					<a href="https://platform.openai.com/docs/guides/reinforcement-fine-tuning" target="_blank" class="link link-primary">Reinforcement fine-tuning</a>
				</li>
			</ul>
		</div>
	</div>

	<!-- Open source models -->
	<div class="collapse collapse-arrow bg-base-200 mb-4">
		<input type="checkbox" checked class="checkbox" />
		<div class="collapse-title text-lg font-medium">Open source models</div>
		<div class="collapse-content prose max-w-none">
			<ol class="list-decimal pl-4">
				<li>
					<strong>Vision:</strong>
					<a href="https://huggingface.co/collections/unsloth/qwen25-vl-all-versions-679ca6c784fad5bd976a05a1" target="_blank" class="link link-primary">Qwen-VL</a>
				</li>
				<li>
					<strong>Reasoning:</strong>
					<a href="https://huggingface.co/collections/unsloth/qwen3-680edabfb790c8c34a242f95" target="_blank" class="link link-primary">Qwen-3</a>
				</li>
				<li>
					<strong>Coding:</strong>
					<a href="https://huggingface.co/collections/unsloth/qwen-25-coder-6732bc833ed65dd1964994d4" target="_blank" class="link link-primary">Qwen-Coder</a>
				</li>
			</ol>
		</div>
	</div>

	<!-- Miscellaneous -->
	<div class="collapse collapse-arrow bg-base-200">
		<input type="checkbox" checked class="checkbox" />
		<div class="collapse-title text-lg font-medium">Miscellaneous</div>
		<div class="collapse-content prose max-w-none">
			<ul class="list-disc pl-4">
				<li>
					<a href="https://arxiv.org/html/2409.17146v2" target="_blank" class="link link-primary">Olmo & Molmo technical paper</a>
				</li>
				<li>
					<a href="https://www.youtube.com/watch?v=pRM_P6UfdIc#" target="_blank" class="link link-primary">Talk by Unsloth founder</a>
				</li>
				<li>
					<a href="https://youtu.be/JIsgyk0Paic?si=IKqAMOegx1fIxnqx" target="_blank" class="link link-primary">RL for agents</a>
				</li>
				<li>
					<a href="https://huggingface.co/docs/evaluate/transformers_integrations" target="_blank" class="link link-primary">Custom loss functions when fine-tuning</a>
				</li>
				<li>
					<a href="https://anilturaga.github.io/cpc" target="_blank" class="link link-primary">Character Prefix Conditioning problem</a>
				</li>
				<li>
					<a href="https://www.yurts.ai/blog/navigating-the-challenges-of-fine-tuning-and-catastrophic-forgetting" target="_blank" class="link link-primary">Catastrophic forgetting article</a>
				</li>
			</ul>
		</div>
	</div>
</div>
</div>
<!-- End Page Wrapper -->