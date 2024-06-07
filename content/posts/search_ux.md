---
title: "Why search isn't a solved problem yet"
date: 2024-06-07
draft: false
ShowToc: false
---
<!-- ### Context -->
Nearly 35 years has passed from the advent of search engines.

With 90% of the market share, Google search's user experience has been relatively stagnant for a [long time](https://www.youtube.com/watch?v=3KtWfp0UopM) barring the recent AI Overviews feature.
Most of the [alternatives](https://kagi.com/) till a couple of years ago were still mimicking Google search experience but with more privacy guarantees and better control over ranking.

With the recent breakthrough in Generative AI and some new solutions gaining traction, Search offerings now can be broadly bifurcated into two types:
1. A wall of blue links
2. Chat interface that reads the sites for you
![Image showing Google search and Perplexity AI results for the query `How to build a search engine`](/images/current_search.png)

> Personal preference: I would rather be presented with a list of curated excerpts from different sites based on my query. AI can be used to select appropriate sections of each site based on my query and present them in a list of iframes. That way search engines can show ads between excerpts, the sites can get visitors other than [GPTBot](https://platform.openai.com/docs/gptbot) and I can get my answer from multiple sources without jumping between tabs or inferring answers from a generated summary. However, I accept that it might not work at scale.

Moving on...
### Challenge
Let's break down how search is used by the masses
1. Short impromptu queries such as `what is the biggest sea mammal`
2. Long research sessions for tasks like `designing a lesson plan` or `coding a feature using a new library`

All search offerings handle the first use case perfectly. However, search experience is still limited to short one-off sessions with no continuity between searches.

Generally, you are handling multiple tasks(personal or professionally, one-off or recurrent) and you utilize search while going through the process of completing these tasks. Current search engine's neither captures nor respect these attributes about the user.

From a high level view, one might think that a chatbot might solve this. However, using summarized answers might restrict the process of exploration and discovery. Not to mention the issue of goal drift where the LLM might forget the underlying objective and can hinder the progress of the user.

### Opportunity
When Google's generative search was announced, I expected the "new" search to handle longer sessions that understands the underlying goal I am working towards.

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

This is ofcourse easier said than done, but how do we implement something like this.
### Implementation
In addition to competing against an alleged monopoly, building a search index is technically complex and financially expensive endeavour. However, user journeys does not require building a new search index, not for the whole internet atleast. 

It involves the following:
1. identifying and understanding the nuances of multiple user objectives
2. indexing their personal sources on-device 
3. on the fly mixed ranking of personal and internet results
4. tracking the progress/evolution of objectives and providing appropriate recommendations and results

As a mental exercise, think of how [Arc browser](https://arc.net/) lets you organise your work into spaces and breakout each space into folders. We need something like that but for search.

A ~~search engine~~ copilot that understands and estimates for what you need, when you need it and how you need it.