---
name: implement-plan
description: Explicitly invoked workflow for implementing an existing plan file in the repository.
disable-model-invocation: true
---

# Implement Plan

Implement the referenced plan.

## Input
- A plan file path or reference from the user.

## Process
1. Read the full plan before making changes.
2. Inspect relevant repository files.
3. Implement the plan as written.
4. If the plan is ambiguous or blocked, ask for clarification before proceeding on that point.
5. Run appropriate checks or tests when practical.

## Output
- Changes through code or tool calls that follow the given implementation plan.
- A concise final summary with changed files and validation performed.
