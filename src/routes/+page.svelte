<script lang="ts">
    import { Info } from 'lucide-svelte';
    import About from '$lib/About.svelte';
	import List from '$lib/List.svelte';
</script>

<div class="flex flex-col items-center w-[90%] md:w-[70%] gap-8">
	<About />
    <div role="alert" class="alert alert-info w-full alert-soft">
        <Info/>
        <span>I am planning & frequently failing to write about one project per week. Check back soon for more!</span>
      </div>
	<List />
</div>