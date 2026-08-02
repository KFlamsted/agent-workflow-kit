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
2. Before planning, perform a requirements and ambiguity audit. Consider:
   - the desired outcome and how success will be evaluated;
   - scope, non-goals, and boundaries;
   - user-visible behavior and workflows;
   - edge cases, failure behavior, and validation;
   - compatibility, migration, API, and data implications;
   - operational, security, performance, and rollout constraints;
   - testing and acceptance criteria.
3. Identify every unresolved decision that could change the plan, implementation, public behavior, or acceptance criteria. Do not infer the user's preference merely because one option seems conventional. Repository evidence may answer factual questions, but it must not substitute for product or scope decisions. Avoid questions already answered by repository conventions or concerning inconsequential implementation details.
4. Ask focused clarification questions before writing the plan. Explain briefly why each question matters and provide concrete options with a recommended default when practical. Use open-ended questions when predefined options would be limiting or misleading.
5. After each response, update your understanding and look for newly exposed ambiguities. Continue asking follow-up questions until:
   - the intended outcome and boundaries are explicit;
   - materially different interpretations have been resolved;
   - acceptance criteria are testable; and
   - the resulting plan can be implemented without product or scope decisions being made by the implementer.
6. Summarize the agreed requirements, decisions, non-goals, and remaining assumptions. Ask the user to confirm or correct this summary. Do not create the plan until it is confirmed.
7. Create a concrete implementation plan that is detailed enough so a low- to mid level engineer, without any prior repository context, can implement consistently with high quality.

For questions and clarifications, use the `question` tool if available (sometimes called `AskUserQuestions` or a variant); otherwise, ask in plain text.

## Output
- Write the plan to `<TASK_NAME>_PLAN.md` unless project rules determine something else. Then go by project rules.
- Make sure the chosen plan name does not overwrite an existing plan.
- Include relevant files, implementation steps, tests, risks, and assumptions.
- Make sure the plan is detailed enough so a low- to mid level engineer, without any prior repository context, can implement it consistently, with high quality, without further questions.
