<script lang="ts">
	import LazyImage from '$lib/LazyImage.svelte';
	import Chat from '$lib/gemini-chennai/Chat.svelte';
	import Album from '$lib/gemini-chennai/Album.svelte';
	const post = {
		title: 'Gemini and me through the streets of Chennai',
		description:
			'Productively killing 10 hours in Chennai using Google Gemini',
		date: '2025-06-22',
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
		I recently was in a weird situation. I was in Chennai and I had to check out my room at 8AM in the morning from the outskirts of the city. My return train is at 6:30PM. I had to kill 10 hours without knowing a word of Tamil or anything about Chennai apart from the beach.
		<br />
		<br />

		This wasn't particularly new to me. I was in a similar situation a couple of months ago in Pune.
		That time, my girlfriend looked up a bunch of articles on noteworthy places to visit,
		shortlisted some, mapped them all on Google maps to create a timeline factoring in the travel
		time, time spent at a place but still being around the final destination (which was the airport).
		<br />
		<br />
		This time however, she isn't available and I am too lazy to put all that effort. I want a peaceful itinerary
		that considers all the above factors without considerable effort from my side.
		<br />
		<br />
		I thought I'd just use AI for the whole process. With web search, any chatbot must be able to automate this process. Right?
		<br />
		<br />
		With nothing to lose but time which is what I wanted, I'd chosen Google Gemini to be my partner.
		Mostly because it's free and 2.5 pro has been pretty nice.
		<br />
		<br />
		Here is the chat transcript and some pictures of my day in Chennai.
        <Chat />
        <Album />
		
	</div>
</div>
