<script lang="ts">
	import DialectSwitcher from '$lib/tool-calling/DialectSwitcher.svelte';

	let { data } = $props();

	const post = {
		title: 'Tool call round trip from the eyes of a model',
		description:
			'A rendering of the same conversation through the chat templates of GPT-OSS and Qwen3, with every special token annotated.',
		date: '2026-07-11',
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

		<div class="prose max-w-none">
			<p>
				We know so little about how the current SoTA large language models process what they receive, and providers
				are only getting cagier about the internals. We're also losing the explicit knobs that used
				to control behavior. Parameters like temperature are being replaced by more semantic ones
				like reasoning effort, which I covered in my
				<a href="/llm-temperature">Understanding the deprecation of temperature parameter in LLMs</a
				>
				post. Here's a non-exhaustive list of what we don't know or don't have access to:
			</p>
			<ul>
				<li>Access to raw reasoning tokens [1]</li>
				<li>How tools and tool results are parsed by the model [2]</li>
				<li>Internals of reasoning effort parameter [3]</li>
				<li>What does verbosity parameter do [4]</li>
			</ul>
			<p>
				It's tempting to think this doesn't matter if you're just using the model as a product or
				building on top of it. But the lack of documentation costs you in two ways: directly in
				money, and in quality.
			</p>
			<p>
				Prompt caching [5] is offered by every major provider and can cut time-to-first-token
				latency by up to 80% and input token costs by up to 90%. It works by caching the key and
				value tensors of a prompt across all layers and heads. The catch: the new request's prefix
				has to exactly match what's cached.
			</p>
			<p>Several things silently break the cache even when the prefix and model stay the same that I found to be not very well documented:</p>
			<ul>
				<li>Reasoning effort parameter</li>
				<li>Changing any tool schema but it won't break the cache if you are adding a new tool via tool search</li>
				<li>Changing the verbosity parameter</li>
				<li>Caching thinking tokens is treated differently by different providers</li>
			</ul>
			<p>
				It's hard to debug issues like the above without understanding how the prompt is processed by the model. Since we don't have access to closed-source chat templates, I'm using GPT-OSS and Qwen3 to render the same conversation through the chat templates of the models.
				GPT-OSS is trained on the Harmony response format [6], designed to mimic the OpenAI
				Responses API. Qwen3 is the most popular open-weight model, so it's a useful baseline.
			</p>

			<p>Take one weather request, tool call, and the round trip back:</p>

			<div class="code-block">{@html data.pyFull}</div>

			<p>
				The tabs below render that same conversation through the unmodified chat templates of
				<a
					href="https://huggingface.co/openai/gpt-oss-20b/blob/main/chat_template.jinja"
					target="_blank"
					class="link">gpt-oss-20b</a
				>
				and
				<a
					href="https://huggingface.co/Qwen/Qwen3-8B/blob/main/tokenizer_config.json"
					target="_blank"
					class="link">Qwen3-8B</a
				>. Filled pills are special tokens. Dashed pills are vocabulary tokens not marked special.
			</p>

			<DialectSwitcher />

			<p>For comparison, the other families I looked at while researching this:</p>

			<div class="overflow-x-auto">
				<table>
					<thead>
						<tr>
							<th>Family</th>
							<th>Call boundary</th>
							<th>Dedicated token?</th>
							<th>Response marker</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Harmony</td>
							<td><code>&lt;|channel|&gt;commentary json&lt;|message|&gt;</code></td>
							<td>Yes, special</td>
							<td><code>to=assistant&lt;|channel|&gt;commentary</code></td>
						</tr>
						<tr>
							<td>Mistral (Nemo)</td>
							<td><code>[TOOL_CALLS]</code></td>
							<td>Yes, special</td>
							<td><code>[TOOL_RESULTS]</code>, also special</td>
						</tr>
						<tr>
							<td>Qwen3</td>
							<td><code>&lt;tool_call&gt;</code></td>
							<td>Yes, not marked special</td>
							<td
								>reuses the <code>user</code> role, wrapped in
								<code>&lt;tool_response&gt;</code></td
							>
						</tr>
						<tr>
							<td>Llama (custom fn)</td>
							<td>none, bare JSON in content</td>
							<td>No</td>
							<td>no standard convention</td>
						</tr>
					</tbody>
				</table>
			</div>

			<p>
				Providers differ in more than tool-call syntax. Reasoning traces and multi-modal input get
				handled differently too.
			</p>
			<p>
				Historically, Anthropic has used a variant of XML called ANTML for tool calls and tool
				results, with a different hierarchy of roles. OpenAI orders <code>System</code> ->
				<code>Developer</code> -> <code>Tools</code> -> <code>Messages</code>, while Anthropic
				orders <code>Tools</code> -> <code>System</code> -> <code>Messages</code>. That ordering
				changes how you'd compose system instructions around tool use.
			</p>
			<p>
				Worth having a mental model of this before assuming prompt caching, cost, or output quality
				will behave the same way across providers.
			</p>
			<div class="divider mt-8"></div>

			<div class="text-base-content/60 space-y-1 text-sm">
				<p>
					[1] <a
						href="https://developers.openai.com/api/docs/guides/reasoning#reasoning-summaries"
						target="_blank"
						class="link">developers.openai.com/api/docs/guides/reasoning#reasoning-summaries</a
					>
				</p>
				<p>
					[2] <a
						href="https://developers.openai.com/api/docs/guides/function-calling"
						target="_blank"
						class="link">developers.openai.com/api/docs/guides/function-calling</a
					>
				</p>
				<p>
					[3] <a
						href="https://developers.openai.com/api/docs/guides/reasoning#reasoning-effort"
						target="_blank"
						class="link">developers.openai.com/api/docs/guides/reasoning#reasoning-effort</a
					>
				</p>
				<p>
					[4] <a
						href="https://developers.openai.com/api/docs/guides/deployment-checklist#set-up-textverbosity"
						target="_blank"
						class="link"
						>developers.openai.com/api/docs/guides/deployment-checklist#set-up-textverbosity</a
					>
				</p>
				<p>
					[5] <a
						href="https://developers.openai.com/api/docs/guides/prompt-caching"
						target="_blank"
						class="link">developers.openai.com/api/docs/guides/prompt-caching</a
					>
				</p>
				<p>
					[6] <a
						href="https://developers.openai.com/cookbook/articles/openai-harmony"
						target="_blank"
						class="link">developers.openai.com/cookbook/articles/openai-harmony</a
					>
				</p>
			</div>

			<div class="divider py-4 pb-12">Thanks for reading!</div>
		</div>
	</div>
</div>

<style>
	.code-block :global(pre) {
		padding: 1rem;
		border-radius: 0.5rem;
		font-size: 12px;
		line-height: 1.6;
		overflow-x: auto;
	}
</style>
