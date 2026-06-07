<script lang="ts">
	const post = {
		title: 'On measuring productivity gains through AI',
		description:
			'What the AI productivity measurement problem means for companies that don\'t own their AI layer.',
		date: '2026-06-08',
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
			<p>
				Cognition (the company behind Devin) recently announced the <a
					href="https://cognition.ai/blog/ai-guarantee"
					target="_blank"
					class="link">AI Productivity Guarantee</a
				> [1], a commitment to cover Devin's costs in credits if they can't prove it saved you the
				equivalent in engineering hours. To back it, an agent retroactively evaluates each completed
				session using the execution trace, the resulting PR and codebase context to estimate how many
				hours a human would have needed. That estimate converts to salary-based dollars, and the guarantee is backed
				up to $10M.
			</p>

			<p>
				For any company measuring AI ROI, this is the first automated methodology validated in
				production [2]. Across 258 sessions from 126 enterprise users, Cognition's estimator hit
				r²_log of 0.74. Anthropic ran the same exercise on a thousand Jira tickets and got 0.46,
				working only from ticket titles and descriptions.
			</p>

			<div class="border-base-300 rounded-lg border p-4">
				<div class="mb-4 text-sm font-semibold">
					Estimator accuracy across measurement approaches
				</div>
				<div class="space-y-3">
					<div>
						<div class="mb-1 flex justify-between text-sm">
							<span
								>METR <span class="text-base-content/50">(34 sessions, technical staff)</span></span
							>
							<span class="font-mono">0.83</span>
						</div>
						<progress class="progress progress-success w-full" value="83" max="100"></progress>
					</div>
					<div>
						<div class="mb-1 flex justify-between text-sm">
							<span
								>Cognition <span class="text-base-content/50"
									>(233 held-out sessions, enterprise)</span
								></span
							>
							<span class="font-mono">0.74</span>
						</div>
						<progress class="progress progress-primary w-full" value="74" max="100"></progress>
					</div>
					<div>
						<div class="mb-1 flex justify-between text-sm">
							<span
								>Anthropic <span class="text-base-content/50"
									>(1,000 Jira tickets, titles only)</span
								></span
							>
							<span class="font-mono">0.46</span>
						</div>
						<progress class="progress progress-warning w-full" value="46" max="100"></progress>
					</div>
				</div>
				<div class="text-base-content/50 mt-3 text-xs">
					Numbers from Cognition's published comparison — richer session data correlates with better
					accuracy
				</div>
			</div>

			<p>
				For software, this is relatively easy. Claude Code, Codex and similar tools store full
				session transcripts locally and those link to PRs with relatively little effort. Most other
				business functions don't have this setup.
			</p>

			<p>
				Sales, finance and legal mostly run AI through platforms like Microsoft Copilot that don't
				have a straightforward way to surface session transcripts and associated artifacts. Enterprise platforms like SAP have
				also been tightening API access for third-party AI integrations [3].
			</p>

			<p>Without session data there's no measurement, and without measurement there's no ROI case to make.</p>

			<div class="bg-base-200 rounded-lg p-4">
				<div class="flex flex-col gap-2 text-sm">
					<div class="flex items-center gap-3">
						<span class="text-base-content/40 w-4 shrink-0">↓</span>
						<span>No session data outside engineering</span>
					</div>
					<div class="flex items-center gap-3">
						<span class="text-base-content/40 w-4 shrink-0">↓</span>
						<span>No measurement</span>
					</div>
					<div class="flex items-center gap-3">
						<span class="text-base-content/40 w-4 shrink-0">↓</span>
						<span>No ROI case for further investment</span>
					</div>
					<div class="flex items-center gap-3">
						<span class="text-base-content/40 w-4 shrink-0">↓</span>
						<span>AI investment stays concentrated in engineering</span>
					</div>
					<div class="flex items-center gap-3">
						<span class="text-base-content/40 w-4 shrink-0">↺</span>
						<span class="text-base-content/50 italic">repeats</span>
					</div>
				</div>
			</div>

			<p>
				The exit is owning your own AI layer. You control session data, can instrument any workflow,
				and aren't relying on a vendor to tell you what's working. Kirkland & Ellis, the world's
				highest-grossing law firm, already made this bet and are building their own platform with Palantir
				and Scale AI as partners [4]. Most organizations won't have that runway, but the direction is
				the same regardless of scale. A technology partner covers the data collection, measurement
				layer and ongoing evaluation.
			</p>

			<p>
				IT services companies face this more directly than most. As measurement methodologies like
				Cognition's spread, clients will start asking about the productivity gains of all their
				developers using AI. For service firms, building this capability internally is also a
				competitive investment. You get to accelerate your own developers with internal platforms based on real data, and the experience of running it on your own teams feeds directly into how you
				build these platforms for clients.
			</p>

			<div class="divider mt-8"></div>

			<div class="space-y-1 text-sm text-base-content/60">
				<p>
					[1] <a href="https://cognition.ai/blog/ai-guarantee" target="_blank" class="link"
						>cognition.ai/blog/ai-guarantee</a
					>
				</p>
				<p>
					[2] <a href="https://cognition.ai/blog/ai-productivity" target="_blank" class="link"
						>cognition.ai/blog/ai-productivity</a
					>
				</p>
				<p>
					[3] <a
						href="https://www.theregister.com/software/2026/04/29/ai-clause-in-new-sap-api-policy-provokes-lock-in-concern/5225767"
						target="_blank"
						class="link">theregister.com - AI clause in new SAP API policy</a
					>
				</p>
				<p>
					[4] <a
						href="https://www.ft.com/content/1825bb59-7b28-460d-b009-ee3cea5dbac3"
						target="_blank"
						class="link">ft.com - Kirkland & Ellis AI platform</a
					>
				</p>
			</div>
		</div>

		<div class="min-h-72"></div>
	</article>
</div>
