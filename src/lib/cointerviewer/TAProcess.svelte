<script lang="ts">
	import { FileText, Handshake, ListFilterPlus, Rss, Users } from 'lucide-svelte';

</script>
<div class="my-4 flex flex-col gap-4 justify-center w-full rounded-md p-4">
    Talent acquisition
    
    <ul class="timeline timeline-vertical sm:timeline-horizontal w-full justify-center items-center">
        <li>
            <div class="timeline-start timeline-box bg-base-200 px-4 py-3 shadow-md">Job posting</div>
            <div class="timeline-middle">
                <div
                    class="bg-primary text-primary-content flex h-8 w-8 items-center justify-center rounded-full"
                >
                    <Rss class="h-4 w-4" />
                </div>
            </div>
            <hr class="bg-primary" />
        </li>
        <li>
            <hr class="bg-primary" />
            <div class="timeline-middle">
                <div
                    class="bg-primary text-primary-content flex h-8 w-8 items-center justify-center rounded-full"
                >
                    <ListFilterPlus class="h-4 w-4" />
                </div>
            </div>
            <div class="timeline-end timeline-box bg-base-200 px-4 py-3 shadow-md">
                Filtering applicants
            </div>
            <hr class="bg-primary" />
        </li>
        <li>
            <hr class="bg-primary" />
            <div class="timeline-start timeline-box bg-base-200 px-4 py-3 shadow-md">Candidate interview</div>
            <div class="timeline-middle">
                <div
                    class="border-2 border-primary flex h-8 w-8 items-center justify-center rounded-full border-dashed"
                >
                    <Users class="h-4 w-4" />
                </div>
            </div>
            <hr class="" />
        </li>
        <li>
            <hr class="" />
            <div class="timeline-middle rounded-full border-1 border-dotted">
                <div class="flex h-8 w-8 items-center justify-center rounded-full">
                    <Handshake class="h-4 w-4" />
                </div>
            </div>
            <div class="timeline-end timeline-box bg-base-200 px-4 py-3 shadow-md">Salary negotiation</div>
            <hr class="" />
        </li>
        <li>
            <hr class="" />
            <div class="timeline-start timeline-box bg-base-200 px-4 py-3 shadow-md">Offer letter</div>
            <div class="timeline-middle">
                <div class="flex h-8 w-8 items-center justify-center  border-1  border-dotted rounded-full">
                    <FileText class="h-4 w-4" />
                </div>
            </div>
        </li>
    </ul>
</div>
