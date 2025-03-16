<script lang="ts">
	import { Sun, Moon } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let isDark = true;

	onMount(() => {
		// Initialize theme from localStorage or default to dark
		const savedTheme = localStorage.getItem('theme') || 'light';
		isDark = savedTheme === 'dark';
		document.documentElement.setAttribute('data-theme', savedTheme);
	});

	function toggleTheme() {
		isDark = !isDark;
		const theme = isDark ? 'dark' : 'light';
		document.documentElement.setAttribute('data-theme', theme);
		localStorage.setItem('theme', theme);
	}
</script>

<div class="navbar bg-base-100 shadow-sm">
	<div class="flex-1">
		<a class="btn btn-ghost text-xl" href="/">Anil Turaga</a>
	</div>
	<div class="flex-none">
		<ul class="menu menu-horizontal px-1">
			<li>
				<label class="swap swap-rotate">
					<input type="checkbox" checked={isDark} on:change={toggleTheme} />
					<Sun class="swap-on w-7" />
					<Moon class="swap-off w-7" />
				</label>
			</li>
			<!-- <li>
		  <details>
			<summary>Blog</summary>
			<ul class="bg-base-100 rounded-t-none p-2">
			  <li><a href="/blog/cpc">CPC</a></li>
			</ul>
		  </details>
		</li> -->
		</ul>
	</div>
</div>
