<script lang="ts">
	import TokenizerComponent from '$lib/cpc/TokenizerComponent.svelte';
	import { Info, Book } from 'lucide-svelte';
	const post = {
		title: "Solving Cursor IDE's Character Prefix Conditioning problem",
		description:
			'Implementing an efficient algorithm based on pruned trie search to find possible generation paths for a user completion request',
		date: '2025-03-17',
		author: 'Anil Turaga'
	};
</script>

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

	<div class="collapse-arrow border-base-300 collapse mb-8 rounded-lg border">
		<input type="checkbox" />
		<div class="collapse-title text-xl font-semibold">Table of Contents</div>
		<div class="collapse-content">
			<ul class="space-y-2">
				<li><a href="#tokenization" class="link">Tokenization</a></li>
				<li><a href="#performance" class="link">Language Model Performance Considerations</a></li>
				<li>
					<a href="#dataset" class="link">Dataset Preparation</a>
					<ul class="mt-2 space-y-2 pl-4">
						<li><a href="#basic" class="link">Basic Word Completion</a></li>
						<li><a href="#healing" class="link">Token Healing</a></li>
						<li><a href="#multiple" class="link">Multiple Valid Completions</a></li>
						<li><a href="#hidden" class="link">Hidden Subword Patterns</a></li>
						<li><a href="#boundary" class="link">Token Boundary Misalignment</a></li>
						<li><a href="#complex" class="link">Complex Tokenization Patterns</a></li>
					</ul>
				</li>
				<li>
					<a href="#implementation" class="link">Implementation</a>
					<ul class="mt-2 space-y-2 pl-4">
						<li><a href="#approach" class="link">High-Level Approach</a></li>
						<li><a href="#trie" class="link">Trie Implementation</a></li>
						<li><a href="#matching" class="link">Token Matching Algorithm</a></li>
						<li><a href="#validation" class="link">Token Boundary Validation</a></li>
						<li><a href="#results" class="link">Example Results</a></li>
						<li><a href="#considerations" class="link">Performance Considerations</a></li>
						<li><a href="#conclusion" class="link">Conclusion</a></li>
					</ul>
				</li>
			</ul>
		</div>
	</div>

	<div class="text-md">
		I recently came across a problem published in cursor's blog named <a
			href="https://cursor.com/blog/cpc"
			target="_blank"
			class="link">Character Prefix Conditioning</a
		>. It opens with the following context:
		<br />
		<blockquote class="border-primary bg-base-200 my-4 border-l-4 p-4">
			When using a language model for code completion, we typically want the model to produce a
			completion that begins with what the user has typed. However, modern language models operate
			on sequences of tokens, not characters, so naively tokenizing the user's input and sending it
			to the model produces wrong results if the user's cursor doesn't happen to lie on a token
			boundary.
		</blockquote>

		To understand this, let's consider the following completion example:
		<div class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 text-sm font-medium">Autocomplete example</div>

			<code
				>The company hired an intermed<code class="text-base-content/50">iary to negotiate.</code
				></code
			>
		</div>
		Here, the user has typed "The company hired an intermed" and the model is supposed to suggest a completion
		"iary to negotiate." There's a problem here. Let's look at the token representation of the user's
		current state and the actual sentence to get a better understanding of the problem:
		<br />
		<br />
		User's current state:
		<TokenizerComponent tokens={['The', 'company', ' hired', ' an', ' inter', 'med']} />
		Actual sentence:
		<TokenizerComponent
			tokens={['The', ' company', ' hired', ' an', ' intermediary', ' to', ' negotiate']}
		/>

		If we were to naively tokenize the user's current state and send it to the model, we would have
		to sample the following tokens to reach the actual sentence:
		<TokenizerComponent tokens={['i', 'ary', ' to', ' negotiate']} />

		This would hurt the performance of the model as the sequence of these tokens does not match the
		actual sentence's token sequence.
		<br />
		<br />
		You can already tell that a simple approach won't solve it. Even
		<a
			href="https://medium.com/data-science/the-art-of-prompt-design-prompt-boundaries-and-token-healing-3b2448b0be38"
			target="_blank"
			class="link">token healing</a
		>
		won't fully help here as if we backtrack a token and generate from there, we would start sampling
		from <code class="border">The company hired an inter</code> which won't get us to the token
		sequence of the actual sentence which need us sampling from
		<code class="border">The company hired an</code>.
		<br />
		<br />
		<div id="tokenization" class="text-2xl font-bold">Tokenization</div>
		I am going to use the Byte-Pair Encoding (BPE) tokenization algorithm to solve this problem. Specifically
		the cl100k_base used for GPT-4 tokenizer.
		<br />
		<br />
		The Byte-Pair Encoding tokenizer works by starting with a vocabulary of individual characters and
		then iteratively merging the most frequent pair of adjacent tokens to form a new token. This process
		continues until a desired vocabulary size is reached or no frequent pairs remain.

		<div class="collapse-arrow bg-base-200 collapse my-4">
			<input type="checkbox" checked />
			<div class="collapse-title flex flex-col gap-2 text-xl font-medium">
				<div class="flex flex-col">
					BPE Training and Inference using a simple example
					<div class="text-base-content/70 text-sm">
						I highly recommend you read it if you are unfamiliar with BPE and skip it if you are
						already comfortable with it.
					</div>
				</div>
			</div>
			<div class="collapse-content">
				Let's look at a simple example of how BPE creates merge rules using the sentence "The
				programmer programs programming programs":
				<br />
				<br />
				First, we count all character frequencies in our corpus:
				<div class="border-base-300 rounded-lg border p-2">
					<code>
						'p': 5, 'r': 10, 'o': 5, 'g': 5, 'a': 5, 'm': 10, ' ': 4, 'T': 1, 'h': 1, 'e': 1, 's':
						2, 'i': 1, 'n': 1
					</code>
				</div>
				<br />
				We start with the vocabulary of individual characters:
				<TokenizerComponent
					tokens={[
						'T',
						'h',
						'e',
						' ',
						'p',
						'r',
						'o',
						'g',
						'r',
						'a',
						'm',
						'm',
						'e',
						'r',
						' ',
						'p',
						'r',
						'o',
						'g',
						'r',
						'a',
						'm',
						's',
						' ',
						'p',
						'r',
						'o',
						'g',
						'r',
						'a',
						'm',
						'm',
						'i',
						'n',
						'g',
						' ',
						'p',
						'r',
						'o',
						'g',
						'r',
						'a',
						'm',
						's'
					]}
				/>

				Now we look for the most frequent pair of adjacent tokens. We count all pairs:
				<div class="border-base-300 rounded-lg border p-2">
					<code>
						'r'+'o': 4, 'o'+'g': 4, 'g'+'r': 4, 'r'+'a': 4, 'a'+'m': 5, 'm'+'m': 2, others: 1 each
					</code>
				</div>
				<br />
				The most frequent pair is 'a'+'m', appearing 5 times, so we merge them:
				<TokenizerComponent
					tokens={[
						'T',
						'h',
						'e',
						' ',
						'p',
						'r',
						'o',
						'g',
						'r',
						'am',
						'm',
						'e',
						'r',
						' ',
						'p',
						'r',
						'o',
						'g',
						'r',
						'am',
						's',
						' ',
						'p',
						'r',
						'o',
						'g',
						'r',
						'am',
						'm',
						'i',
						'n',
						'g',
						' ',
						'p',
						'r',
						'o',
						'g',
						'r',
						'am',
						's'
					]}
				/>

				Now we recount pairs with our new token 'am'. The most frequent pairs are now:
				<div class="border-base-300 rounded-lg border p-2">
					<code> 'r'+'o': 4, 'o'+'g': 4, 'g'+'r': 4, 'r'+'am': 4, others: ≤2 each </code>
				</div>
				<br />
				We'll merge 'r'+'o' (we could choose any of the pairs with frequency 4):
				<TokenizerComponent
					tokens={[
						'T',
						'h',
						'e',
						' ',
						'p',
						'ro',
						'g',
						'r',
						'am',
						'm',
						'e',
						'r',
						' ',
						'p',
						'ro',
						'g',
						'r',
						'am',
						's',
						' ',
						'p',
						'ro',
						'g',
						'r',
						'am',
						'm',
						'i',
						'n',
						'g',
						' ',
						'p',
						'ro',
						'g',
						'r',
						'am',
						's'
					]}
				/>

				Recounting again, the most frequent pairs:
				<div class="border-base-300 rounded-lg border p-2">
					<code> 'p'+'ro': 4, 'o'+'g': 4, 'g'+'r': 4, 'r'+'am': 4, others: ≤2 each </code>
				</div>
				<br />
				We'll merge 'p'+'ro':
				<TokenizerComponent
					tokens={[
						'T',
						'h',
						'e',
						' ',
						'pro',
						'g',
						'r',
						'am',
						'm',
						'e',
						'r',
						' ',
						'pro',
						'g',
						'r',
						'am',
						's',
						' ',
						'pro',
						'g',
						'r',
						'am',
						'm',
						'i',
						'n',
						'g',
						' ',
						'pro',
						'g',
						'r',
						'am',
						's'
					]}
				/>

				And again:
				<div class="border-base-300 rounded-lg border p-2">
					<code> 'g'+'r': 4, 'r'+'am': 4, others: ≤2 each </code>
				</div>
				<br />
				We'll merge 'g'+'r':
				<TokenizerComponent
					tokens={[
						'T',
						'h',
						'e',
						' ',
						'pro',
						'gr',
						'am',
						'm',
						'e',
						'r',
						' ',
						'pro',
						'gr',
						'am',
						's',
						' ',
						'pro',
						'gr',
						'am',
						'm',
						'i',
						'n',
						'g',
						' ',
						'pro',
						'gr',
						'am',
						's'
					]}
				/>

				Next:
				<div class="border-base-300 rounded-lg border p-2">
					<code> 'gr'+'am': 4, others: ≤2 each </code>
				</div>
				<br />
				We merge 'gr'+'am' to form 'gram':
				<TokenizerComponent
					tokens={[
						'T',
						'h',
						'e',
						' ',
						'pro',
						'gram',
						'm',
						'e',
						'r',
						' ',
						'pro',
						'gram',
						's',
						' ',
						'pro',
						'gram',
						'm',
						'i',
						'n',
						'g',
						' ',
						'pro',
						'gram',
						's'
					]}
				/>

				If we were to continue, we might merge 'pro'+'gram' next, but I'll stop here to keep this
				example manageable. Here is how our vocabulary evolved from start to finish:
				<br />
				<br />

				Initial vocabulary (individual characters):
				<div class="border-base-300 rounded-lg border p-2">
					<code> ['T', 'h', 'e', ' ', 'p', 'r', 'o', 'g', 'a', 'm', 's', 'i', 'n'] </code>
				</div>
				<br />
				Final vocabulary (after merges):
				<div class="border-base-300 rounded-lg border p-2">
					<code>
						['T', 'h', 'e', ' ', 'p', 'r', 'o', 'g', 'a', 'm', 's', 'i', 'n', 'am', 'ro', 'pro',
						'gr', 'gram']
					</code>
				</div>

				Let's see how a string gets tokenized step by step using our vocabulary and merges. We'll
				use a smaller example: "programmer" Step 1: Initial character-by-character tokenization
				<TokenizerComponent tokens={['p', 'r', 'o', 'g', 'r', 'a', 'm', 'm', 'e', 'r']} />

				Step 2: Apply the 'a'+'m' merge rule
				<TokenizerComponent tokens={['p', 'r', 'o', 'g', 'r', 'am', 'm', 'e', 'r']} />

				Step 3: Apply the 'r'+'o' merge rule
				<TokenizerComponent tokens={['p', 'ro', 'g', 'r', 'am', 'm', 'e', 'r']} />

				Step 4: Apply the 'p'+'ro' merge rule
				<TokenizerComponent tokens={['pro', 'g', 'r', 'am', 'm', 'e', 'r']} />

				Step 5: Apply the 'g'+'r' merge rule
				<TokenizerComponent tokens={['pro', 'gr', 'am', 'm', 'e', 'r']} />

				Step 6: Final tokenization with 'gr'+'am' merge rule
				<TokenizerComponent tokens={['pro', 'gram', 'm', 'e', 'r']} />
			</div>
		</div>

		The important thing to understand here is that when tokenizing a new string, we apply our merge
		rules in the exact order they were learned during training. Unlike the training phase where we
		repeatedly count frequencies, during inference we simply apply the rules in sequence.
		<br />
		<br />

		This is a simplified example - in practice, the cl100k_base tokenizer used by GPT-4 has a much
		larger vocabulary (100,000+ tokens) and more sophisticated merge rules. The
		<a
			href="https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf"
			target="_blank"
			class="link">GPT-2 paper</a
		>
		highlights one of things done additionally to improve the performance of the tokenizer:

		<blockquote class="border-primary bg-base-200 my-4 border-l-4 p-4">
			We observed BPE including many versions of common words like dog since they occur in many
			variations such as dog. dog! dog? . This results in a sub-optimal allocation of limited
			vocabulary slots and model capacity. To avoid this, we prevent BPE from merging across
			character categories for any byte sequence.
		</blockquote>

		<br />
		They enforce this prevention of merging by using a regex pattern that identifies boundaries where
		merges shouldn't occur.
		<br />
		<br />
		<div class="border-base-300 rounded-lg border p-2">
			<code>
				{`
        r'(?i:[sdmt]|ll|ve|re)|[^\r\n\p{L}\p{N}]?+\p{L}++|\p{N}{1,3}+| ?[^\s\p{L}\p{N}]++[\r\n]*+|\s++$|\s*[\r\n]|\s+(?!\S)|\s
        `}
			</code>
		</div>
		<br />
		<br />
		I am going to use this regex to only search and validate over subset of the overall user input.
		<br />
		<br />

		<div role="alert" class="alert alert-soft w-full">
			<Info />
			<span
				>We can create the same type of regex for other types of tokenizers such as SentencePiece or
				WordPiece.</span
			>
		</div>

		<div id="performance" class="mt-8 text-2xl font-bold">
			Language Model Performance Considerations
		</div>

		When implementing CPC with self-hosted language models, there are two main approaches to
		handling multiple completion candidates, with significant performance implications:

		<ul class="my-4 list-disc pl-6">
			<li>Sequential autoregressive generation for each candidate path</li>
			<li>Batched processing of multiple candidates together</li>
		</ul>

		<div class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 font-semibold">Why Batching is More Efficient</div>
			<p>
				When running a language model, loading the model weights and KV cache setup for
				autoregressive generation has significant overhead. With sequential processing, this
				overhead is incurred for each candidate path.
			</p>

			<div class="mt-4 mb-2 font-semibold">Batching Advantage</div>
			<p>
				By batching multiple candidates together, we only need to load the model and set up
				autoregressive generation once. The GPU can then process all candidates in parallel,
				amortizing the initialization costs across the batch.
			</p>
		</div>

		<div id="dataset" class="mt-8 text-2xl font-bold">Dataset preparation</div>
		Most of the time spent on this problem went into preparing the dataset. I tried to think of and find
		as many different cases as possible.
		<br />
		<br />
		Here are some of the cases I considered, ordered by increasing complexity:
		<div id="basic" class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 font-semibold">Basic word completion</div>
			<p class="mb-4">
				When the user types a word that already is a valid token but larger tokens are possible:
			</p>
			<code>I bought some apple<code class="text-base-content/50">s</code></code>
			<TokenizerComponent tokens={['I', ' bought', ' some', ' apple']} />
			<TokenizerComponent tokens={['I', ' bought', ' some', ' apples']} />
		</div>

		<div id="healing" class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 font-semibold">Token Healing</div>
			<p class="mb-4">
				"Token Healing", which automatically backs up the generation process by one token before the
				end of the prompt, then constrains the first token generated to have a prefix that matches
				the last token in the prompt:
			</p>
			<code>https:<code class="text-base-content/50">//</code></code>
			<TokenizerComponent tokens={['https', ':']} />
			<TokenizerComponent tokens={['https', '://']} />
		</div>

		<div id="multiple" class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 font-semibold">Multiple valid completions</div>
			<p class="mb-4">When the same prefix could lead to different valid words:</p>

			<code>userNa<code class="text-base-content/50">me</code></code>
			<TokenizerComponent tokens={['user', 'Na']} />
			<TokenizerComponent tokens={['userName']} />
			<div class="mt-4">Or:</div>
			<code>userNa<code class="text-base-content/50">mes</code></code>
			<TokenizerComponent tokens={['user', 'Na']} />
			<TokenizerComponent tokens={['user', 'Names']} />
		</div>

		<div id="hidden" class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 font-semibold">Hidden subword patterns</div>
			<p class="mb-4">When the word itself is made up of multiple tokens:</p>
			<code>We found a hidden causali<code class="text-base-content/50">ty</code></code>
			<TokenizerComponent tokens={['We', ' found', ' a', ' hidden', ' caus', 'ali']} />
			<TokenizerComponent tokens={['We', ' found', ' a', ' hidden', ' caus', 'ality']} />
		</div>

		<div id="boundary" class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 font-semibold">Token boundary misalignment</div>
			<p class="mb-4">When the cursor falls in the middle of what should be a single token:</p>
			<code>He introduced an intermediar<code class="text-base-content/50">y</code></code>
			<TokenizerComponent tokens={['He', ' introduced', ' an', ' inter', 'media', 'r']} />
			<TokenizerComponent tokens={['He', ' introduced', ' an', ' intermediary']} />
		</div>

		<div id="complex" class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 font-semibold">Complex tokenization patterns</div>
			<p class="mb-4">
				When the partial word causes different tokenization patterns and the token boundary moves
				for the actual token:
			</p>
			<code>indivi<code class="text-base-content/50">sible</code></code>
			<TokenizerComponent tokens={['ind', 'ivi']} />
			<TokenizerComponent tokens={['ind', 'iv', 'isible']} />
			<div class="mt-4">Or:</div>
			<code>indivi<code class="text-base-content/50">dual</code></code>
			<TokenizerComponent tokens={['ind', 'ivi']} />
			<TokenizerComponent tokens={['individual']} />
		</div>
		<br />
		<div class="mb-2 font-medium">Key Observations we can make from the dataset:</div>
		<ul class="list-none space-y-2 pl-4">
			<li class="text-base-content/80">
				1. We have to implement search over the token space in some form to find possible generation
				paths
			</li>
			<li class="text-base-content/80">
				2. We cannot make the assumption of taking the longest matching token. The actual one would
				be very much dependent on the context of the user's input and may not be the longest one
			</li>
			<li class="text-base-content/80">
				3. The search might have to be initiated at multiple points in the user's input but we need
				to be efficient about it
			</li>
			<li class="text-base-content/80">
				4. We cannot base this search on the existing token boundaries constructed on the user's
				input as the token boundaries might be different for the final sentence
			</li>
			<li class="text-base-content/80">
				5. We need to prune the search space to make it manageable while still covering all the
				cases
			</li>
		</ul>

		<div id="implementation" class="mt-8 text-2xl font-bold">Implementation</div>

		If you've been able to follow along so far, the solution would seem obvious.

		<div id="approach" class="mt-4 text-xl font-semibold">High-Level Approach</div>
		<p class="mb-4">The strategy involves four main steps:</p>
		<ol class="mb-4 list-decimal space-y-2 pl-6">
			<li>
				Create a trie data structure from the tokenizer vocabulary with the ability to take a string
				and get all tokens that has the the string as the prefix
			</li>
			<li>
				For a given user input, search from the right to left of the last work determined by the
				regex pattern. Move character by character from left to right accumulating the prefix and
				for each prefix, find possible token completions that have the prefix
			</li>
			<li>Filter token candidates to ensure they maintain valid token boundaries</li>
			<li>Return a list of possible completion paths for the model to consider</li>
		</ol>

		<div id="trie" class="mt-4 text-xl font-semibold">Trie Implementation</div>
		At the core of our solution is a trie (prefix tree) data structure optimized for byte-level searching.

		<br />
		Each node in the trie represents a byte and the children of the node represent the next byte in the
		token.
		<br />
		The trie also stores the original token that ends at that node.
		<br />
		<br />

		<div class="border-base-300 mb-4 rounded-lg border p-4">
			<code class="text-sm whitespace-pre-wrap">
				{`Visualizing subtree for prefix 'user':

==================================================
TRIE VISUALIZATION (max_depth=4, max_children=3)
==================================================
Visualizing subtree for prefix: b'user'
* TOKENS: user
├── 'D'
│   └── 'a'
│       └── 't'
│           └── 'a'
│               * TOKENS: userData
├── 'I'
│   ├── 'D'
│   │   * TOKENS: userID
│   ├── 'd'
│   │   * TOKENS: userId
│   └── 'n'
│       └── 'f'
│           └── 'o'
│               * TOKENS: userInfo
└── 'M'
    └── 'a'
        └── 'n'
            └── 'a'
                └── 'g'
                    └── ... (more nodes, reached max depth)
└── ... (8 more children)
==================================================

        `}
			</code>
		</div>

		So given a prefix, we can traverse the trie and collect all the tokens that have the prefix.

		<div id="matching" class="mt-4 text-xl font-semibold">Token Matching Algorithm</div>
		We first take the user's input and split it into words using the <a
			href="https://github.com/openai/tiktoken/blob/4560a8896f5fb1d35c6f8fd6eee0399f9a1a27ca/tiktoken_ext/openai_public.py#L89"
			class="link"
			target="_blank">regex pattern</a
		>
		from the tokenizer library.
		<br />
		<br />
		For the dataset above, the last words would be:
		<div class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 text-sm font-medium">
				Last words for each item of the dataset based on the regex pattern
			</div>
			<code class="text-sm whitespace-pre-wrap">
				<br />
				_apple<br />
				:<br />
				userNa<br />
				_causali<br />
				_intermediar<br />
				_indivi</code
			>
		</div>

		Now, we search the trie for each of these prefixes. For example, if we consider the prefix "
		indivi", we would initiate search for the following prefixes:
		<div class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 text-sm font-medium">Search prefixes for "indivi"</div>
			<code class="text-sm whitespace-pre-wrap">
				<br />
				i<br />
				vi<br />
				ivi<br />
				divi<br />
				ndivi<br />
				indivi<br />
				_indivi<br />
			</code>
		</div>

		<div id="validation" class="mt-4 text-xl font-semibold">Token Boundary Validation</div>
		The above search yields many potential candidates, forming a superset of the combinations we want
		to explore. We need an effective pruning strategy to filter these combinations.

		<div class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 text-sm font-medium">Token Validation Strategy</div>
			<p class="mb-3">
				For each candidate token, we:
				<br />
				• Replace the last word's prefix with the candidate token
				<br />
				• Re-encode the resulting string
				<br />
				• Compare with expected token sequence
				<br />
				• Keep only if the sequences match exactly
			</p>
		</div>

		Let's walk through an example using the prefix "divi" from our search candidates above:

		<div class="border-base-300 my-4 rounded-lg border p-4">
			<div class="mb-2 text-sm font-medium">Example: Validating token "division"</div>

			<div class="mb-3">
				<div class="font-medium">Input Analysis:</div>
				• Last word: " indivi"
				<br />
				• Prefix: "divi"
				<br />
				• Candidate token: "division"
				<br />
				• Resulting word: " indivision"
			</div>

			<div class="space-y-2">
				<div class="font-medium">Token Comparison:</div>

				<div>Original tokens:</div>
				<TokenizerComponent tokens={['ind', 'ivi']} />

				<div>Expected tokens:</div>
				<TokenizerComponent tokens={['in', 'division']} />

				<div>Actual re-encoded tokens:</div>
				<TokenizerComponent tokens={['ind', 'iv', 'ision']} />
			</div>
		</div>

		Since the re-encoded tokens don't match our expected sequence, we discard "division" as a
		candidate. By applying this validation process across all candidate tokens, we can effectively
		filter out invalid completions while preserving the ones that maintain proper token boundaries.

		<div class="mt-4 text-xl font-semibold" id="results">Example Results</div>
		<p class="mb-4">Let's see the algorithm in action with some of our test cases:</p>

		<div class="border-base-300 mb-4 rounded-lg border p-4">
			<code class="text-sm whitespace-pre-wrap">
				{`Results for the dataset:
Testing: I bought some apple
last word  apple
Found 1424 matching tokens in 1.25 ms
Analysis completed in 19.13 ms
Combinations:
Pos 19: I bought some appl -> [b'en', b'ers', b'ere']... 474 possible tokens
Pos 18: I bought some app -> [b'led', b'lem', b'let']... 101 possible tokens
Pos 17: I bought some ap -> [b'pler']... 1 possible tokens
Pos 14: I bought some -> [b' apple', b' apples']... 2 possible tokens

Testing: https:
last word :
Found 324 matching tokens in 0.36 ms
Analysis completed in 2.42 ms
Combinations:
Pos 6: https -> [b':', b'::', b':\n']... 324 possible tokens

Testing: userNa
last word userNa
Found 2323 matching tokens in 1.90 ms
Analysis completed in 21.15 ms
Combinations:
Pos 6: userN -> [b'an', b'ar', b'al']... 2170 possible tokens
Pos 5: user -> [b'Na', b'Nam', b'Nav']... 34 possible tokens
Pos 1:  -> [b'userName']... 1 possible tokens

Testing: We found a hidden causali
last word  causali
Found 2106 matching tokens in 1.67 ms
Analysis completed in 21.13 ms
Combinations:
Pos 25: We found a hidden causal -> [b'it', b'io', b'id']... 1748 possible tokens
Pos 23: We found a hidden caus -> [b'ali', b'alin', b'alia']... 17 possible tokens

Testing: He introduced an intermediar
last word  intermediar
Found 922 matching tokens in 0.81 ms
Analysis completed in 11.40 ms
Combinations:
Pos 28: He introduced an intermedia -> [b'res', b'ress', b'resp']... 52 possible tokens
Pos 27: He introduced an intermedi -> [b'ar', b'art', b'are']... 215 possible tokens
Pos 17: He introduced an -> [b' intermediary']... 1 possible tokens

Testing: indivi
last word indivi
Found 2106 matching tokens in 1.37 ms
Analysis completed in 19.37 ms
Combinations:
Pos 6: indiv -> [b'in', b'it', b'is']... 1885 possible tokens
Pos 4: ind -> [b'ivi', b'ivil', b'ivid']... 16 possible tokens
Pos 1:  -> [b'individual']... 1 possible tokens
        `}
			</code>
		</div>
		<div class="mt-4 text-xl font-semibold" id="considerations">Performance Considerations</div>
		<p class="mb-4">The implementation includes several optimizations:</p>

		<ul class="mb-4 list-disc space-y-2 pl-6">
			<li>
				<span class="font-medium">Trie-based search</span>: O(k) lookup time instead of O(nk) for
				linear vocabulary search
			</li>
			<li>
				<span class="font-medium">Early pruning</span>: Using the regex pattern to focus search on
				relevant portion of text
			</li>
			<li>
				<span class="font-medium">Iterative DFS</span>: Using queue-based iteration to avoid stack
				overflow on deep trie traversals
			</li>
			<li>
				<span class="font-medium">Token validation</span>: Filtering out invalid candidates early to
				reduce downstream processing
			</li>
		</ul>

		<div class="mt-4 text-xl font-semibold" id="conclusion">Conclusion</div>
		<p class="mb-4">
			I am sure there are many other ways to solve this problem. If you have alternative approaches,
			optimizations, or spot any issues in my implementation, please feel free to open an issue or
			submit a pull request on GitHub. I welcome contributions and feedback from the community to
			make this solution even better.
			<br />
			<br />

			The code is available
			<a
				href="https://github.com/Anilturaga/Character-Prefix-Conditioning"
				class="link"
				target="_blank">here</a
			>.
		</p>

		<div class="min-h-72"></div>
	</div>
</div>
