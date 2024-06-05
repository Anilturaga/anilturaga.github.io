---
title: "Stuck in the 90s, Still Serving Billions: The missing search feature"
date: 2024-06-05
draft: false
ShowToc: false
---
<!-- ### Context -->
Nearly 35 years has passed from the advent of search engines. 

Google search experience has been relatively stable for a [long time](https://www.youtube.com/watch?v=3KtWfp0UopM) barring changes in speed and quality of the results.

With Generative AI blowing up, search offerings have broadly bifurcated into two types:
1. Wall of blue links
2. Chat interface that reads sites and answers
![Image showing Google search and Perplexity AI results for the query `How to build a search engine`](/images/current_search.png)

> Personal preference: I would rather be presented with a list of curated excerpts from different sites based on my query. That way search engines can show ads between excerpts, the sites can get visitors other than the [GPTBot](https://platform.openai.com/docs/gptbot) and I can get my answer from multiple sources without jumping between tabs.

### Problem
Let's break down how search is used by the masses.
1. Short impromptu queries such as `what is the biggest sea mammal`
2. Long research sessions such as `designing a lesson plan` or `coding a feature using a new library`

All search offerings handle the first use case perfectly. However, search experience is still limited to short one-off sessions with no continuity between searches.

Search over longer sessions should evolve the results and recommended searches aligned with how the user is progressing through their task.


Let's consider an example task: `coding a feature using a new library`
| User journey  | Potential Search recommendations | 
|---|---|
| Choosing a library | Comparisons  |  
| Library documentation  | Tutorial & Guides  |  
| Implementing the feature  | Github projects  |  
| Bugs based on the library | StackOverflow or GitHub Issues |
| Deploying the feature | Forums |
| Documenting the use of a new library | Writing tools |

### Opportunity
When Google's generative search was being announced, I expected the new service to handle longer sessions that understands the underlying goal I am working towards.

I expected tighter, two-way integration with other Google services such as docs, sheets so that search is personolized not just for ads but for the task I am working on.

I believe there is a good amount of untapped potential in improving the search experience.


### Implementation Challenges
In addition to competing against an alleged monopoly, building a search index is technically complex and financially expensive endeavour.

However, user journey's does not require building a new search index. We can simply rank, read, select relevant excerpts based on not just the user query but also considering the objective the user is working towards.