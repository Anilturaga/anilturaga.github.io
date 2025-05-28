<script lang="ts">
	import CognitiveOverload from '$lib/cointerviewer/CognitiveOverload.svelte';
	import TaProcess from '$lib/cointerviewer/TAProcess.svelte';
	import LazyImage from '$lib/LazyImage.svelte';
	import { Info, LucideInfo } from 'lucide-svelte';
	import interviewScreen from '$lib/assets/cointerviewer/interview-screen.png';
	import codeEditor from '$lib/assets/cointerviewer/code-editor.png';
	import createInterview from '$lib/assets/cointerviewer/create-interview.png';
	import endInterview from '$lib/assets/cointerviewer/evaluation.png';
	import dashboard from '$lib/assets/cointerviewer/dashboard.png';
	const post = {
		title: 'CoInterviewer: A hackathon product',
		description:
			'A walkthrough of the features our team of five developed over the course of two weekends for an AI-powered interview tool.',
		date: '2025-05-29',
		author: 'Anil Turaga'
	};
</script>

<div class="mx-auto my-8 w-[90%] md:w-[60%] ">
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

	Recently, some of my colleagues and I participated in a hackathon. The problem statement was simple: build an MVP for a tool that leverages AI for taking interviews.

	<h2 class="mt-8 mb-4 text-2xl font-semibold">Why</h2>
	Apart from the obvious reason of hackathon participation, almost all of us has recently been taking
	a lot of interviews. This product was our attempt to alleviate some of the pain points we were facing.
	Let me give you a quick rundown of the process of filling an open position from the pov of an org.

	<TaProcess />

	You can already see that apart from the interview step, all other steps are handled by dedicated
	resources such as HR, recruiters, etc. The interview step being one of the most important steps in
	the process, is handled by engineers as an <u>additional responsibility</u>.
	<br />
	The implications of conducting interviews as an additional responsibility have lasting effects on the
	engineer's productivity.

	<CognitiveOverload />

	Worst case is that half of an engineer's day could be drained away because of a strong technical  interview.
	This becomes a big problem if your company is going through sudden growth.

	<div role="alert" class="alert my-4">
		<LucideInfo class="h-6 w-6" />
		<span
			>You want the engineers to focus on their core responsibilities to retain the growth but also
			scale up the team to sustain it.</span
		>
	</div>

    And so, we have decided to build a tool that would help the interviewers to conduct interviews with reduced cognitive load.

	<h2 class="mt-8 mb-4 text-2xl font-semibold">What</h2>
    We had a relatively short discussion on automation vs augmentation when it comes to the role of AI in interviews.
    We decided to go with augmentation because it's hard to get candidates to agree to be questioned and judged solely by an AI.

    <h2 class="mt-8 mb-4 text-2xl font-semibold">How</h2>
    I am quickly going to walkthrough the features we have built.
    
	I will first cover the screen interviewers are meant to use while taking interviews.

	This screen is meant to be very information dense to keep the interviewer fully informed with no input. This is the screen that also took the most amount of time to build.

	<LazyImage src={interviewScreen} alt="Interview Screen" class="w-full my-2 rounded-lg" />

	<p>There are 4 sections in this screen:</p>
	<ol class="list-decimal list-inside pl-4">
		<li>The top left section is for candidate's video stream</li>
		<li>The top right section is for live transcript of both the interviewer and the candidate</li>
		<li>The bottom left section covers all the information necessary such as the candidate's CV, job description, etc.</li>
		<li>The bottom right section is where GenAI comes in heavily. It has a stack of constantly updated suggested questions based on the candidate's CV, job description and live transcript.</li>
	</ol>
	Let me breakdown each section in detail.
	<h3 class="mt-8 mb-4 text-xl font-semibold">Candidate stream(Left top section)</h3>
	We needed a way to display the candidate's video stream embedded in the screen. We explored with some webRTC libraries but they were not performing well in unstable network conditions and the scalability aspect was also not very clear. 
	<br /><br />
	We didn't want to reinvent the video conferencing wheel and so we decided to support usage of existing tools like Google Meet, Zoom, etc. We also wanted to support all those tools without any additional effort. We ended up using a nice trick for this.
	<br /><br />

	We requested screen sharing permission from the interviewer and they are supposed to share the tab which has the video conferencing tool open.
	We then capture the output of the screen sharing tab and also seperately capture the input of the microphone of the interviewer.
	<br /><br />

	This way, we capture two streams. One stream corresponds to the video and audio stream of the candidate and the other stream corresponds to the audio stream of the interviewer which makes turn based transcription possible.

	<h3 class="mt-8 mb-4 text-xl font-semibold">Transcript(Right top section)</h3>
	Since we have seperate audio streams for the candidate and the interviewer, it was a matter of finding the right transcription service that is both performant with acceptable transcription quality. 
	<br /><br />

	We tried OpenAI Whisper first but it didn't work well for Indian accented English. We ended up with GCP's Chirp model service offering.
	<h3 class="mt-8 mb-4 text-xl font-semibold">CV & JD(Left bottom section)</h3>
	One personal pain point was working with the never ending formats of CVs and JDs. We wanted to create a common format for both of them so that reading it would be more about absorbing relavent information than hunting for it.
	<br /><br />
	We used tool calling of LLMs to extract structured information from the CV and JD. We use this extracted information to generate suggested questions and also as options for the structured input field(More on that later).

	<h3 class="mt-8 mb-4 text-xl font-semibold">Suggestions(Right bottom section)</h3>
	This is by far the more important section. Interviewers spend a good amount of time before and during the interview to come up with appropriate questions. The more senior level you are interviewing, the more time you spend on this as you cannot simply use questions from a question bank. The questions need to be tailored to the candidate and the job description in addition to being appropriate in the flow of the interview.
	<br /><br />

	Our approach was to use GenAI to generate suggestions based on the CV, JD and the live transcript. We want to present suggested questions every couple of seconds on what the interviewer can ask. These questions could be about a new topic or a follow up to the previous question.
	<br /><br />

	We use a stack and keep adding new suggestions to the top of the stack. The interviewer can choose to ask any of the questions in the stack. They also have the option to drag any of the questions to any position in the stack. They also can pin any of the questions to the top of the stack that they'd like to ask later in the interview.
	<br /><br />

	We also wanted to give the interviewer a way to request for suggested questions that are not in the stack. 

	For that, we added a structured input field where we have some placeholders in a predefined query. We suggest options for each placeholder based on the parsed information from the CV and JD. This way, the interviewer can use any number of combinations of the extracted information to generate questions. As an escape hatch, we also added a free text input field.


	<h3 class="mt-8 mb-4 text-xl font-semibold">Code Editor</h3>
	<LazyImage src={codeEditor} alt="Code Editor" class="w-full my-2 rounded-lg" />
	I generally used to use tools like rustpad for coding tasks. We wanted to extend this functionality to executing the code and also some anti cheat measures. 
	<br /><br />

	We started off with supporting python and javascript both executing in the candidate's browser.
	<br /><br />

	We also added monitoring for tab switching and pasting code into the editor. While this may not be the best implementation, it was a good enough solution for our use case.

	<h3 class="mt-8 mb-4 text-2xl font-semibold">Other screens</h3>
	I have covered the middle part of the interview process in detail. Let me now quickly cover how the creation of an interview and also the ending of an interview is handled.

	<h3 class="mt-8 mb-4 text-xl font-semibold">Managing & creating interviews</h3>
	<LazyImage src={dashboard} alt="Dashboard" class="w-full my-2 rounded-lg" />

	<h3 class="mt-8 mb-4 text-xl font-semibold">Creating an interview</h3>
	<LazyImage src={createInterview} alt="Create Interview" class="w-full my-2 rounded-lg" />

	<h3 class="mt-8 mb-4 text-xl font-semibold">Evaluating an interview</h3>
	<LazyImage src={endInterview} alt="End Interview" class="w-full my-2 rounded-lg" />

	<h3 class="mt-8 mb-4 text-2xl font-semibold">Conclusion</h3>
	We have been quite pleased with the final product. We even went as far as using the application in real interviews and has seen a glimpse of the potential of the application.
	<br /><br />

	However, we are not entirely sure if we will continue developing this product due to bandwidth constraints of all the developers involved.
	<br /><br />

	
	<div role="alert" class="alert alert-soft w-full">
		<Info />
		<span
			>Full disclosure: We didn't win the hackathon. We were however, part of the top 6 teams.</span
		>
	</div>
	<br /><br />

	Team members:
	<ul class="list-disc list-inside pl-4">
		<li>Gaurav Gupta</li>
		<li>Prasanth Kumhar</li>
		<li>Prahastha Shankesi</li>
		<li>Mohit Singh</li>
		<li>Anil Turaga</li>
	</ul>
	<div class="min-h-72"></div>

</div>
