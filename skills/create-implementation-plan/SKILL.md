---
name: create-implementation-plan
description: Explicitly invoked workflow for creating a concrete implementation plan file from a requested task.
---

# Create Implementation Plan

Create a detailed implementation plan only. Do not change code.

## Input
- A task description from the user.

## Process
1. Inspect the repository enough (through code exploration, tool calls, documentation and/or existing plans) to understand the task.
2. Ask all clarifying questions before writing the plan. Be thorough and specific to ensure the plan is actionable without further context.
3. Wait for the user's answers.
4. Create a concrete implementation plan that is detailed enough so a low- to mid level engineer, without any prior repository context, can implement consistently with high quality.

## Output
- Write the plan to `<TASK_NAME>_PLAN.md` unless project rules determine something else. Then go by project rules.
- Make sure the chosen plan name does not overwrite an existing plan.
- Include relevant files, implementation steps, tests, risks, and assumptions.
- Make sure the plan is detailed enough so a low- to mid level engineer, without any prior repository context, can implement it consistently, with high quality, without further questions.
