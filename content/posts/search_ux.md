---
title: "Search Engine's Blind Spot: Continuity and Context"
date: 2024-06-05
draft: false
ShowToc: false
---
<!-- ### Context -->
Nearly 35 years has passed from the advent of search engines. 

Google search experience has been relatively stagnant for a [long time](https://www.youtube.com/watch?v=3KtWfp0UopM) barring the recent AI Overviews feature.

Search offerings can be broadly bifurcated into two types:
1. Wall of blue links
2. Chat interface that reads sites for you
![Image showing Google search and Perplexity AI results for the query `How to build a search engine`](/images/current_search.png)

> Personal preference: I would rather be presented with a list of curated excerpts from different sites based on my query. AI can be used to select appropriate sections of each site and present them as is in a list of iframes. That way search engines can show ads between excerpts, the sites can get visitors other than [GPTBot](https://platform.openai.com/docs/gptbot) and I can get my answer from multiple sources without jumping between tabs. However, I accept that it might not work at scale.

Moving on...
### Challenge
Let's break down how search is used by the masses
1. Short impromptu queries such as `what is the biggest sea mammal`
2. Long research sessions for tasks like `designing a lesson plan` or `coding a feature using a new library`

All search offerings handle the first use case perfectly. However, search experience is still limited to short one-off sessions with no continuity between searches.

Generally, you are handling multiple tasks(personal or professionally, one-off or recurrent) and you utilize search while going through the process of completing these tasks. Current search engine's neither captures nor respect these attributes about the user.

From a high level view, one might think that a chatbot might solve this. However, using summarized answers might restrict the process of exploration and discovery. Not to mention the issue of goal drift where the LLM might forget the underlying objective and can hinder the progress of the user.


### Opportunity
When Google's generative search was being announced, I expected the new service to handle longer sessions that understands the underlying goal I am working towards.

I expected tighter, two-way integration with other Google services such as docs, sheets so that search is personolized not just for ads but for the task I am working on.

I believe there is a good amount of untapped potential in improving the search experience.

Let's consider an example task of how context aware search might look like: `coding a feature using a new library`
| User journey  | Potential Search recommendations | 
|---|---|
| Choosing a library | Comparisons that are relevant to user's codebase |  
| Library documentation  | Tutorial & Guides based on user's skillset |  
| Implementing the feature  | Code templates or Quick starters |  
| Bugs based on the library | StackOverflow or GitHub Issues that are contextually ranked |
| Deploying the feature | Search and summarize on user's documents |
| Documenting the feature | Writing tools |
### Implementation
In addition to competing against an alleged monopoly, building a search index is technically complex and financially expensive endeavour.

However, user journey's does not require building a new search index, not for the whole internet atleast. It has much more to do with understanding the nuances of user's objectives, indexing their personal sources on-device, tracking the progress/evolution of objectives and providing appropriate recommendations and results.

Think of [Arc browser](https://arc.net/)'s spaces and link them with search.  You will have a search engine that knows on what you are working and where you are in that journey for multiple projects and can provide you with answers accordingly.