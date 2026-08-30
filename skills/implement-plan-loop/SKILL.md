---
name: implement-plan-loop
description: Starts a delegated implementation loop from an implementation plan or freeform task prompt.
disable-model-invocation: true
---

# Implement Plan Loop

Use this as the entrypoint for looped implementation. The orchestrator owns the loop mechanics.

## Input
- A plan file path, pasted implementation plan, or freeform implementation request.

## Process
1. If the user provides a plan file path, read the full plan.
2. If the user provides a freeform prompt, treat it as the implementation scope.
3. Ask clarification questions only when the scope is too ambiguous or risky to start.
4. Invoke the `code-implementation-loop-orchestrator` skill with:
   - the full original scope;
   - relevant user constraints;
   - expected validation, if known;
   - any max-round or stopping preference from the user.

## Loop Contract
- The orchestrator runs implementer -> reviewer rounds.
- Implementers write code; reviewers review code; neither controls the loop.
- Reviews produce approval or actionable required fixes, not new plans.
- The loop ends when the reviewer approves or the orchestrator hits a blocker that needs the user.

## Output
When the orchestrator finishes, relay its final summary: approval status, changed files, validation, and any unresolved items.
