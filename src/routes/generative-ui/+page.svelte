<script lang="ts">
	const post = {
		title: 'What happens if we replace the app backend with an LLM?',
		description: 'Letting an LLM generate the screen and decide the response to an event.',
		date: '2025-10-25',
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

		What happens if we replace the app backend with an LLM?
		<br />
		<br />
		LLM would generate a screen, any user action would call it back and the LLM can then
		generate the next screen on the fly.
		<br />
		<br />
		A couple of months back, Anthropic released an experiment called
		<a
			href="https://www.anthropic.com/news/imagine-with-claude"
			target="_blank"
			class="link">Imagine with Claude</a
		>
		which does exactly this.
		<br />
		<br />
		I recreated it but also went beyond with features like:

		<ol class="mt-4 mb-6 list-inside list-decimal space-y-2">
			<li>Support for OpenAI, Anthropic and Gemini models.</li>
			<li>Runs entirely in the browser. Both LLM calls and the apps generated.</li>
			<li>LLM decides to write code to call itself based on user actions through JS.</li>
		</ol>

		<div class="card bg-base-200 my-8">
			<div class="card-body">
				<h2 class="card-title">Try it</h2>
				<p>
					I really liked using this to play games with the LLM like tic tac toe. You can play too
					if you have a key :)
				</p>
				<div class="card-actions mt-4">
					<a href="https://genaiui.web.app/" target="_blank" class="btn btn-primary">Open app</a>
					<a
						href="https://github.com/Anilturaga/Generative-UI"
						target="_blank"
						class="btn btn-outline">View source</a
					>
				</div>
			</div>
		</div>

		<h2 class="mt-8 mb-4 text-2xl font-semibold">Imagine with Claude limitations</h2>

		<ul class="mb-6 list-inside list-disc space-y-2">
			<li>JavaScript disabled which means apps won't be as interactive.</li>
			<li>Only for Claude Max subscribers.</li>
			<li>LLM retrigger is limited to user clicks only.</li>
		</ul>
	</div>
</div>
