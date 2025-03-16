<script lang="ts">
	import '../app.css';
	import Header from '$lib/Header.svelte';
	let { children } = $props();
</script>

<div class="h-screen w-screen">
	<div class="h-[7%] border-0">
		<Header />
	</div>
	<div class="flex h-[93%] justify-center">
		{@render children()}
	</div>
</div>
