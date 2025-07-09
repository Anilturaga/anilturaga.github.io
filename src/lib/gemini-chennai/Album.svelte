<script lang="ts">
    import LazyImage from "$lib/LazyImage.svelte";
    import drink from "$lib/assets/gemini-chennai/drink.jpeg";
    import food from "$lib/assets/gemini-chennai/food.jpeg";
    import fort from "$lib/assets/gemini-chennai/fort.jpeg";
    import garden from "$lib/assets/gemini-chennai/garden.jpg";
    import hell from "$lib/assets/gemini-chennai/hell.jpg";
    import mall from "$lib/assets/gemini-chennai/mall.jpeg";
    import painting from "$lib/assets/gemini-chennai/painting.jpg";
    import statues from "$lib/assets/gemini-chennai/statues.jpeg";
    import whale from "$lib/assets/gemini-chennai/whale.jpeg";
    import thali from "$lib/assets/gemini-chennai/thali.jpeg";
    let images = [food,drink, fort,painting, whale, statues, hell, garden, thali, mall];
    let currentIndex = $state(0);
    const total = images.length;

    function prevSlide() {
        currentIndex = (currentIndex - 1 + total) % total;
    }

    function nextSlide() {
        currentIndex = (currentIndex + 1) % total;
    }
</script>
<span class="text-lg font-bold">Album</span>
<!-- Carousel Wrapper with navigation buttons -->
<div class="relative w-full mx-auto my-4">
    <!-- Left Arrow -->
    <button
        class="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-lg font-bold transition-colors duration-200"
        onclick={prevSlide}
        aria-label="Previous slide"
    >❮</button>

    <!-- Slides Container with landscape aspect ratio -->
    <div class="overflow-hidden w-full bg-black rounded-lg" style="aspect-ratio: 16/9;">
        <div
            class="flex transition-transform duration-500 h-full"
            style="transform: translateX(-{currentIndex * 100}%);"
        >
            {#each images as image (image)}
                <div class="flex-shrink-0 w-full h-full flex items-center justify-center bg-black">
                    <LazyImage
                        src={image}
                        alt="Photo"
                        objectFit="object-contain"
                        class="w-full h-full"
                    />
                </div>
            {/each}
        </div>
    </div>

    <!-- Right Arrow -->
    <button
        class="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center text-lg font-bold transition-colors duration-200"
        onclick={nextSlide}
        aria-label="Next slide"
    >❯</button>

    <!-- Pagination Numbers -->
    <div class="flex justify-center gap-2 mt-4">
        {#each Array(total) as _, idx}
            <button
                class="px-3 py-1 rounded text-sm font-medium transition-colors duration-200 {currentIndex === idx ? 'bg-primary text-primary-content' : 'bg-base-200 hover:bg-base-300'}"
                onclick={() => (currentIndex = idx)}
                aria-label={`Go to slide ${idx + 1}`}
            >
                {idx + 1}
            </button>
        {/each}
    </div>
</div>
    
