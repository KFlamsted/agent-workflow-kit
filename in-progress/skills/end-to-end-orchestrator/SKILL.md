---
name: end-to-end-orchestrator
description: Orchestrates software tasks end to end by delegating planning, phased implementation, review, and final reporting to specialized subagents.
---

# End-to-End-Orchestrator

The goal of this session is to take a software task given by the human (via a prompt) and take that prompt all the way to final implementation.  
You are the coordinator/orchestrator in this end to end process. 

The end-to-end process consists of the following steps:
1. Create an implementation plan for the task. (See [Create Implementation Plan](#create-implementation-plan))
2. Implement and review the code in a implementer to reviewer loop. (See [Implement and Review Code loop](#implement-and-review-code-loop))
3. Conduct a final summary of the entire process. (See [Final Summary](#final-summary))

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

Before proceeding, ensure the plan is divided into practical implementation phases. If a phase is too large, resume the `task-planner` and ask it to divide the phase without changing the plan's scope.

Once the plan is ready, proceed to the [Implement and Review Code loop](#implement-and-review-code-loop).

## Implement and Review Code loop
Ensure the implementation plan exists in the project. Treat each plan phase as one implementation unit; if the plan has no phases, treat the full plan as one unit. Optionally track these units with `todowrite`.

For each unit, in order:

1. Spawn a new `code-implementer` to implement it.
2. Spawn a new `code-reviewer` to review the result.
3. If the result is `CHANGES_REQUESTED`, resume the same implementer with only the required fixes, then resume the same reviewer to review the changes.
4. Repeat until the reviewer returns `APPROVED`, then continue to the next unit.

Use new implementer and reviewer sessions for each unit. After all units are approved, proceed to [Final Summary](#final-summary).

## Final Summary
After all implementation units are approved, report:

- the original task and implementation plan;
- the units completed and implementation/review rounds for each;
- the final approval status;
- the changed files and a brief summary of the changes;
- validation performed and its results;
- unresolved blockers or intentionally deferred items, if any;
- a suggested commit message, if applicable - use the `commit-message-generate` skill for this if available.

Do not claim validation was performed unless it was reported by a subagent.

## Extra Rules and Guidelines
- Remain the orchestrator; do not implement or review code yourself.
- Use only one writing implementer at a time against the active worktree.
- Do not ask implementers or reviewers to create a new implementation plan.
- Forward only changes required for approval, not optional reviewer suggestions.
- Ask the human if a finding requires a product, scope, or architecture decision not covered by the plan.
- If an issue repeats or the loop becomes stuck, stop and report the blocker instead of continuing indefinitely.