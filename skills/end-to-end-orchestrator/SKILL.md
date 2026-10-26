---
name: end-to-end-orchestrator
description: Orchestrates software tasks end to end by delegating planning, phased implementation, review, and final reporting to specialized subagents.
disable-model-invocation: true
---

# End-to-End-Orchestrator

The goal of this session is to take a software task given by the human (via a prompt) and take that prompt all the way to final implementation.  
You are the coordinator/orchestrator in this end to end process. 

The end-to-end process consists of the following steps:
1. Create an implementation plan for the task. (See [Create Implementation Plan](#create-implementation-plan))
2. Implement and review each plan phase by invoking the `implement-plan-loop` skill once per phase. (See [Implement and Review Code loop](#implement-and-review-code-loop))
3. Conduct a final summary of the entire process. (See [Final Summary](#final-summary))

Each step is described in detail in the referenced subsections.
Do not plan, implement, or review code yourself. Delegate those tasks to subagents, coordinate the workflow, and produce the final summary.

## Input
- A task description from the user.

## Required Skills and Subagents - IMPORTANT!
This workflow requires the following skill to be available:

- `implement-plan-loop` — runs the implementer-to-reviewer loop for one plan phase.

This workflow requires the following subagents to be available:

- `task-planner` — creates the phased implementation plan and raises clarification questions.
- `code-implementer` — implements and validates a plan phase (spawned through `implement-plan-loop`).
- `code-reviewer` — reviews a plan phase (spawned through `implement-plan-loop`).
- `clean-solid-code-reviewer` — reviews a plan phase for Clean Code and SOLID quality (spawned through `implement-plan-loop`). Mandatory for this workflow.

It is very important before starting the workflow, to ensure the skill and all required subagent types are available - They must have the exact same name and you may not generate them or spawn any agent with a similar name.  
If any of these are unavailable, stop the workflow and report the missing dependency rather than substituting another skill or agent, or performing its responsibilities yourself. Because this check runs before planning, it replaces the workaround question in `implement-plan-loop`'s own subagent check.

## Create Implementation Plan
The goal of this section is to create an implementation plan.  
Spawn the `task-planner` subagent with the user's task description as its complete prompt, reproduced verbatim. Do not summarize, rewrite, interpret, annotate, or supplement it. Do not add output-format or workflow instructions; rely on the `task-planner`'s own instructions.  
If the planner requests clarification or confirmation, relay its questions to the human and wait for their response. Do not answer or infer answers yourself. Then continue the same planner session when supported; otherwise spawn a new `task-planner` with the original task, preserved planner context, and the complete clarification question-and-answer history. Repeat until the plan is written.

Before proceeding, ensure the plan is divided into practical implementation phases. If a phase is too large, ask the planner to divide it without changing scope, resuming it when supported or reinvoking it with the prior planning context.

Once the plan is ready, proceed to the [Implement and Review Code loop](#implement-and-review-code-loop).

## Implement and Review Code loop
Ensure the implementation plan exists in the project. Treat each plan phase as one implementation unit; if the plan has no phases, treat the full plan as one unit. Optionally track these units with `todowrite`.

For each unit, in order, invoke the `implement-plan-loop` skill and follow its instructions with this input:
- the implementation plan file path;
- the current unit as the only implementation scope: implement only this phase and use the rest of the plan as read-only context;
- an explicit request for the clean-solid review (`clean-solid-code-reviewer`) for this phase;
- any constraints, validation requirements, or stopping rules from the human.

Invoke the skill separately for every unit; never run it over the full plan when the plan has phases. `implement-plan-loop` owns the implementation/review rounds, the reviewers, and when a unit is approved; do not restate or override them. Its own skip rule (see its Bigger-Change Trigger section) still applies, so the clean-solid review may be skipped for some phases.

When the loop for a unit finishes:
- If it reports final approval, record its report (rounds, clean-solid result, changed files, validation, deferred items) and continue with the next unit without waiting for the human. Do not present its per-unit commit message suggestion.
- If it stops on a blocker, stop the workflow and report the blocker to the human.

After all units are approved, proceed to [Final Summary](#final-summary).

## Final Summary
After all implementation units are approved, report:

- the original task and implementation plan;
- the units completed and, per unit, the implementation/review rounds and the clean-solid result (whether it ran and why or why not; if it ran, its final score and deferred findings);
- the final approval status;
- the changed files and a brief summary of the changes;
- validation performed and its results;
- unresolved blockers or intentionally deferred items, if any;
- one suggested commit message for the whole change, if applicable - use the `commit-message-generate` skill for this if available.

Do not claim validation was performed unless it was reported by a subagent.

## Extra Rules and Guidelines
- Remain the orchestrator; do not plan, implement, or review code yourself.
- `implement-plan-loop` owns the implementer/reviewer round mechanics, approval criteria, fix forwarding, human escalation for findings, and stuck-loop handling. Follow it rather than duplicating or overriding those rules.
- Invoke `implement-plan-loop` once per plan phase, in plan order, and start a phase only after the previous one is approved.
