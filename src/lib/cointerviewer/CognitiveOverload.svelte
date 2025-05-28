<script lang="ts">
	// Svelte 5 Runes

	type HourlySegment = {
		hourLabel: string; // e.g., "10am", "1pm"
		activity: string;  // Description for tooltip
		colorProfile: 'green' | 'pink' | 'blue_interview' | 'orange' | 'neutral' | 'red';
        // Optional: You can still include original load/depressurizing data for tooltips if needed
        // cognitiveLoad?: number;
        // depressurizing?: number;
	};

	// Define the 9 hourly segments and their visual profiles
	const workdaySchedule = $state<HourlySegment[]>([
		{ hourLabel: "10am", activity: "Morning Focus", colorProfile: 'green' },
		{ hourLabel: "11am", activity: "Productive Work", colorProfile: 'green' },
		{ hourLabel: "12pm", activity: "Lunch Break & Light Tasks", colorProfile: 'green' },
		{ hourLabel: "1pm", activity: "Interview Preparation (starts 1:30pm)", colorProfile: 'pink' },
		{ hourLabel: "2pm", activity: "INTERVIEW (1 hour)", colorProfile: 'red' },
		{ hourLabel: "3pm", activity: "Decompression & Feedback Submission", colorProfile: 'pink' },
		{ hourLabel: "4pm", activity: "Afternoon Tasks", colorProfile: 'orange' },
		{ hourLabel: "5pm", activity: "Wrapping Up Projects", colorProfile: 'orange' },
        { hourLabel: "6pm", activity: "End of Workday", colorProfile: 'green' } // Matches the 9 blocks in the image
	]);

	// Function to get Tailwind CSS classes for fill and border based on colorProfile
	function getBlockClasses(profile: HourlySegment['colorProfile']): string {
		switch (profile) {
			case 'green':
				return 'bg-green-100 border-green-400';
			case 'pink': // Pinkish-red in the image
				return 'bg-pink-100 border-pink-400';
			case 'blue_interview': // Distinct blue border, very light fill
				return 'bg-blue-50 border-blue-500'; // bg-blue-50 is very light
			case 'orange':
				return 'bg-orange-100 border-orange-400';
            case 'red':
                return 'bg-red-100 border-red-400';
			default:
				return 'bg-slate-100 border-slate-400'; // Fallback
		}
	}
</script>


    <div class="my-4 flex flex-col gap-4 justify-center w-full rounded-md p-4">
        Cognitive overload on a workday with a senior-level interview
    

    <div class="px-1 sm:px-2">
        <div class="flex flex-row gap-2 sm:gap-3 justify-center items-start overflow-x-auto pb-4 no-scrollbar">
            {#each workdaySchedule as segment (segment.hourLabel)}
                <div class="flex flex-col items-center flex-shrink-0">
                    <div
                        class="tooltip tooltip-top"
                        data-tip={segment.activity}
                    >
                        <div
                            class="w-10 h-10 sm:w-[35px] sm:h-[35px] md:w-10 md:h-10 rounded-md border-2 transition-all duration-150 {getBlockClasses(segment.colorProfile)}"
                            aria-label={`{segment.hourLabel}: {segment.activity}`}
                        >
                            &nbsp; </div>
                    </div>
                    <span class="mt-2 text-xs sm:text-sm text-base-content/80">
                        {segment.hourLabel}
                    </span>
                </div>
            {/each}
        </div>
    </div>

	<div class="text-center text-xs text-base-content/70 px-2">
        <div class="mt-2 inline-flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5">
            <span class="flex items-center"><div class="w-3 h-3 rounded-sm border-2 bg-green-100 border-green-400 mr-1"></div>Work</span>
            <span class="flex items-center"><div class="w-3 h-3 rounded-sm border-2 bg-pink-100 border-pink-400 mr-1"></div>Prep/Decompress</span>
            <span class="flex items-center"><div class="w-3 h-3 rounded-sm border-2 bg-red-50 border-red-500 mr-1"></div>Interview</span>
            <span class="flex items-center"><div class="w-3 h-3 rounded-sm border-2 bg-orange-100 border-orange-400 mr-1"></div>Post-Interview</span>
        </div>
	</div>
</div>

<style>
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;  /* IE and Edge */
        scrollbar-width: none;  /* Firefox */
    }
    /* Ensure DaisyUI tooltips are styled as expected */
</style>