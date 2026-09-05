---
name: clean-solid-review-loop
description: Runs a Clean/SOLID quality review/fix loop until a 10/10 score, with a required behavior code-reviewer after each implementer. Scope may be a diff/change or the full repository. Human-stopped or stall also ends the loop.
disable-model-invocation: true
---

# Clean Solid Review Loop

Orchestrate a `clean-solid-code-reviewer` → `code-implementer` → `code-reviewer` → `code-implementer` loop. Do not review or edit code yourself. `code-reviewer` always runs after an implementer; it is not optional. The review scope may be a diff/change or the full repository.

## Required subagents

- `clean-solid-code-reviewer`
- `code-reviewer`
- `code-implementer`

It is very important that if you do not have these subagents available to spawn (by these exact names) then you verify with the human / user on a possible implementation loop workaround and if this is allowed. Having the possibility to spawn a generic agent that you call the same also requires verification from the human / user.

## Process

1. Preserve the user's original task prompt exactly as received (verbatim). Use it for `clean-solid-code-reviewer` and for implementers that apply clean-solid findings. Do **not** give it to `code-reviewer`.
2. Spawn a fresh `clean-solid-code-reviewer`. Include the original prompt verbatim, plus the assigned review scope (branch diff, changed files, or the full repository), and any latest implementer summary.
3. If `Score` is not `10/10` or `Status` is `CHANGES_REQUESTED`, spawn one `code-implementer` with the original prompt and **all** listed findings (HIGH through TRIVIAL). There are no optional clean-solid findings.
4. After that implementer, spawn a fresh `code-reviewer`. Do **not** include the original user prompt. Give it only:
   - the implementer's summary of what it just changed;
   - the current diff or changed files from that implementation phase.

   Instruct it to review **only** whether that implementation changed logic or observable behavior. Return `APPROVED` if logic and behavior are unchanged. Do not review product intent, pre-existing bugs, missing features, coverage, style, or CLEAN/SOLID quality.
5. If that `code-reviewer` returns `CHANGES_REQUESTED`, spawn one `code-implementer` with only those required (blocking) findings, then spawn `code-reviewer` again the same way (implementation summary + that phase's diff, no original prompt). Repeat until `code-reviewer` is `APPROVED` or a stopping condition applies.
6. After behavior is `APPROVED`, start a new round at step 2 with a fresh `clean-solid-code-reviewer`.
7. **Stop** when `clean-solid-code-reviewer` returns `Score: 10/10` / `APPROVED` with no implementer in that round. Also stop if the human asks to stop, or if the same issue repeats / the loop stalls.

If the first clean-solid review is already 10/10, there was no implementer phase: do not spawn `code-reviewer`; stop.

## Rules

- Every `clean-solid-code-reviewer` spawn and every implementer that applies clean-solid findings must include the original user prompt verbatim. Add round-specific context after it.
- Every `code-reviewer` spawn must omit the original user prompt. It only judges whether the last implementer phase changed logic or behavior.
- Use one implementer at a time against the active worktree.
- Forward every clean-solid finding of every rank. Do not drop LOW or TRIVIAL.
- For `code-reviewer` follow-up, forward only required/blocking findings.
- Ask the user when a fix needs a product, scope, or architecture decision absent from the original prompt.
- Stop and report the blocker if the same issue repeats or the loop stalls.
- Treat follow-up user changes after completion as a new loop with a new verbatim prompt.

## Final report

Report: round count; final clean-solid `Score` and `Status`; final `code-reviewer` status (or that it was not run because there was no implementer phase); changed files; validation; unresolved or deferred items; whether the human stopped or a stall ended the loop.
