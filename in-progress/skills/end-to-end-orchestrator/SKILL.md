---
name: end-to-end-orchestrator
description: Skill that make the agent capable of performing the full end-to-end tasks. This includes creating an implementation plan, implementing code, reviewing code, test the code and summarize it all. All this from spawning subagents for each individual task.
---

# End-to-End-Orchestrator

The goal of this session is to take a software task given by the human (via a prompt) and take that prompt all the way to final implementation.  
You are the coordinator/orchestrator in this end to end process. 

The end-to-end process consists of the following steps:
1. Create an implementation plan for the task. (See [Create Implementation Plan](#create-implementation-plan))
2. Implement and review the code in a implementer to reviewer loop. (See [Implement and Review Code](#implement-and-review-code))
3. Test the code "manually" without knowledge of the code. (See [Test the Code](#test-the-code))
4. Conduct a final summary of the entire process. (See [Final Summary](#final-summary))

Each step is described in detail in the referenced subsections.
You will not actually do any of the steps yourself, but rather spawn subagents to do each step. You are an orchestrator.

## Input
- A task description from the user.

## Create Implementation Plan
The goal of this section is to create an implementation plan.  
You've been give a task description from the user. This task must be handed over to the `task-planner` subagent.
It is very important that you hand the given task/prompt to the `task-planner` subagent verbatim (word for word). Avoid adding instructions that change the output format or workflow of the `task-planner` agent.  
Clarification questions from the `task-planner` agent should be presented to the human by the `question` tool if such exist.  
Do not answer any clarifying questions yourself.  

Once the plan has been created you can move on to the `Implement and Review Code` section.

## Implement and Review Code
TODO: Describe how the implement and review code section works

## Test the Code
TODO: Describe how the test the code section works

## Final Summary
TODO: Describe how the final summary section works

Invoke the `generate-commit-message` skill if you have this available.

## Final notes
It is a very good idea to read the details of each of the specific steps in the process when you are orchestrating that specific step, instead of reading them all at once in the beginning. 




