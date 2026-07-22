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
2. After inspecting the repository, identify any underspecified decisions with multiple reasonable interpretations. Ask the user about those that could materially affect the implementation or expected outcome; do not silently choose between them. Avoid questions already answered by repository conventions or concerning inconsequential implementation details. Prefer multiple-choice questions with a recommended option when practical, but use open-ended questions when necessary.
3. Wait for the user's answers. If an answer reveals another material ambiguity, ask a follow-up and wait again.
4. Create a concrete implementation plan that is detailed enough so a low- to mid level engineer, without any prior repository context, can implement consistently with high quality.

For questions and clarifications, use the `question` tool if available (sometimes called `AskUserQuestions` or a variant); otherwise, ask in plain text.

## Output
- Write the plan to `<TASK_NAME>_PLAN.md` unless project rules determine something else. Then go by project rules.
- Make sure the chosen plan name does not overwrite an existing plan.
- Include relevant files, implementation steps, tests, risks, and assumptions.
- Make sure the plan is detailed enough so a low- to mid level engineer, without any prior repository context, can implement it consistently, with high quality, without further questions.
