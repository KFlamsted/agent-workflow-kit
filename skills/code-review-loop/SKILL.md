---
name: code-review-loop
description: Runs a reviewer-first code review/fix loop by delegating review and implementation to dedicated subagents.
disable-model-invocation: true
---

# Code Review Loop

Orchestrate a `code-reviewer` -> `code-implementer` loop. Do not review or edit code yourself.

## Required subagents

- `code-reviewer`
- `code-implementer`

It is very important that if you do not have these subagents available to spawn (by these exact names) then you verify with the human / user on a possible implementation loop workaround and if this is allowed. Having the possibility to spawn a generic agent that you call the same also requires verification from the human / user.

## Process

1. Preserve the user's original task prompt exactly as received (verbatim).
2. Spawn `code-reviewer` first. Include the original prompt verbatim and ask it to review the current code against that prompt.
3. If the reviewer returns `APPROVED`, stop.
4. If it returns `CHANGES_REQUESTED`, send the original prompt and only the required findings to one `code-implementer`.
5. After implementation, spawn a fresh `code-reviewer` with the original prompt verbatim plus the implementation summary and current diff or changed files.
6. Repeat steps 3-5 until approval or a stopping condition applies.

## Rules

- Every reviewer invocation must contain the original user prompt verbatim: do not paraphrase, truncate, correct, or reformat it. Add round-specific context separately after it.
- Use one implementer at a time against the active worktree.
- Do not forward optional suggestions as required work.
- Ask the user when a fix requires a product, scope, or architecture decision absent from the original prompt.
- Stop and report the blocker if the same issue repeats or the loop stalls.
- Treat follow-up user changes after completion as a new loop with a new verbatim prompt.

## Final report

Report the round count, approval status, changed files, validation, and unresolved or deferred items.
