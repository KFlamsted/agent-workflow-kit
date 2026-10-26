# Plan: End-to-end orchestrators delegate to `implement-plan-loop`

## Goal
`skills/end-to-end-orchestrator/SKILL.md` and `skills/end-to-end-orchestrator-detailed/SKILL.md` currently describe their own implementer -> reviewer loop. That copy drifts every time `skills/implement-plan-loop/SKILL.md` changes (for example, the recent clean-solid review was never picked up).

After this change both orchestrators:
- invoke the `implement-plan-loop` skill **once per plan phase** (never once over the full plan when phases exist);
- always explicitly request the clean-solid review for each phase, and list `clean-solid-code-reviewer` as a mandatory subagent;
- no longer describe round mechanics, approval criteria, fix forwarding, or stuck-loop handling themselves.

## Agreed decisions
1. **Clean-solid is mandatory but the loop's skip rule still applies.** Both orchestrators list `clean-solid-code-reviewer` as required and explicitly request the clean-solid review in every phase invocation. `implement-plan-loop`'s own skip rule (its "Bigger-Change Trigger" section) still decides whether it runs, so it may be skipped for docs/config-only phases.
2. **`skills/implement-plan-loop/SKILL.md` is not modified.** All phase-scoping wording lives in the two orchestrator skills.
3. **Subagents stay listed explicitly.** Both orchestrators keep listing `code-implementer` and `code-reviewer`, add `clean-solid-code-reviewer`, and additionally require the `implement-plan-loop` skill. The upfront availability check (before planning) covers the skill and all agents.
4. Round mechanics come from `implement-plan-loop` from now on. This is an accepted behaviour change: the loop spawns a **new** `code-implementer` per fix round, whereas the orchestrators previously resumed the same implementer/reviewer sessions.
5. Per-phase loop reports are collected without pausing for the human; the workflow continues to the next phase automatically. A loop that stops on a blocker stops the whole workflow.
6. The final summary includes, per phase, the rounds and the clean-solid result (ran or skipped and why, final score, deferred findings). The simple orchestrator gives one overall commit message suggestion, not one per phase.
7. In the detailed skill, ticking the Progress box and the per-phase `git-committer` commit stay in the orchestrator and happen after each phase's loop reports final approval.

## Non-goals
- No edits to `skills/implement-plan-loop/SKILL.md`, any agent prompt (`agents/**`), scripts, tests, `README.md`, `.legacy-skills/`, or `in-progress/`.
- No changes to the planning sections, task-folder, or start/resume logic of either orchestrator.
- Do not adopt `future-improvements/end-to-end-orchestrator/FINAL_INTEGRATION_REVIEW.md`.
- No frontmatter changes (`name`, `description`, `disable-model-invocation`) in either orchestrator.

## Assumptions
- `implement-plan-loop`'s skip rule, as currently written, covers docs/config-only changes **and** localized bug fixes or renames. Because that skill is untouched, the full rule applies. The orchestrators must refer to the rule by section name rather than enumerating its cases, so they follow future changes automatically.
- "Invoke the skill" uses the same wording as `skills/union-merge-loop/SKILL.md` ("invoke the `implement-plan-loop` skill"). `implement-plan-loop` already has `disable-model-invocation: false`, so agents may invoke it.
- If the `implement-plan-loop` skill cannot be invoked, the orchestrator treats it like a missing subagent: stop before planning and report the missing dependency.

## Writing guidelines (apply to both phases)
- Follow the existing tone and structure of each file (headings, bullet style, the "IMPORTANT!" marker, em dash vs hyphen usage already present in that file).
- **Do not restate `implement-plan-loop` content** (reviewer list per round, approval thresholds, HIGH/MEDIUM vs LOW/TRIVIAL, skip-rule cases, session reuse). Refer to the skill and its section names instead. The only loop-related facts the orchestrators may name are the agent names (for the availability check) and "final approval" / "blocker" as loop outcomes.
- Keep anchors in the in-file links valid. If a heading is renamed, update every link that targets it.

---

## Phase 1: `skills/end-to-end-orchestrator/SKILL.md`

### Steps
1. **Process overview list** (the numbered list under the intro). Replace step 2 with:
   `2. Implement and review each plan phase by invoking the \`implement-plan-loop\` skill once per phase. (See [Implement and Review Code loop](#implement-and-review-code-loop))`
   Keep the intro sentence "Do not plan, implement, or review code yourself..." unchanged.

2. **Required subagents section.** Rename the heading `## Required Subagents - IMPORTANT!` to `## Required Skills and Subagents - IMPORTANT!` (no in-file links target it; verify with grep). Replace the section body with this content (adjust only punctuation to match the file):

   ```md
   This workflow requires the following skill to be available:

   - `implement-plan-loop` — runs the implementer-to-reviewer loop for one plan phase.

   This workflow requires the following subagents to be available:

   - `task-planner` — creates the phased implementation plan and raises clarification questions.
   - `code-implementer` — implements and validates a plan phase (spawned through `implement-plan-loop`).
   - `code-reviewer` — reviews a plan phase (spawned through `implement-plan-loop`).
   - `clean-solid-code-reviewer` — reviews a plan phase for Clean Code and SOLID quality (spawned through `implement-plan-loop`). Mandatory for this workflow.

   It is very important before starting the workflow, to ensure the skill and all required subagent types are available - They must have the exact same name and you may not generate them or spawn any agent with a similar name.
   If any of these are unavailable, stop the workflow and report the missing dependency rather than substituting another skill or agent, or performing its responsibilities yourself. Because this check runs before planning, it replaces the workaround question in `implement-plan-loop`'s own subagent check.
   ```

3. **Implement and Review Code loop section.** Keep the heading `## Implement and Review Code loop` (it is a link target). Replace its whole body with:

   ```md
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
   ```

   The removed content (spawn implementer, spawn reviewer, resume on `CHANGES_REQUESTED`, "Use new implementer and reviewer sessions for each unit") must not appear anywhere else in the file.

4. **Final Summary section.** Replace the bullet list with:

   ```md
   - the original task and implementation plan;
   - the units completed and, per unit, the implementation/review rounds and the clean-solid result (whether it ran and why or why not; if it ran, its final score and deferred findings);
   - the final approval status;
   - the changed files and a brief summary of the changes;
   - validation performed and its results;
   - unresolved blockers or intentionally deferred items, if any;
   - one suggested commit message for the whole change, if applicable - use the `commit-message-generate` skill for this if available.
   ```
   Keep "Do not claim validation was performed unless it was reported by a subagent."

5. **Extra Rules and Guidelines section.** Replace the list with:

   ```md
   - Remain the orchestrator; do not plan, implement, or review code yourself.
   - `implement-plan-loop` owns the implementer/reviewer round mechanics, approval criteria, fix forwarding, human escalation for findings, and stuck-loop handling. Follow it rather than duplicating or overriding those rules.
   - Invoke `implement-plan-loop` once per plan phase, in plan order, and start a phase only after the previous one is approved.
   ```
   Removed rules (now owned by `implement-plan-loop`): one writing implementer at a time; do not ask for new plans; forward only required changes; ask the human about product/scope/architecture findings; stop when an issue repeats.

### Validation
- `grep -n "resume the same\|CHANGES_REQUESTED\|Use new implementer" skills/end-to-end-orchestrator/SKILL.md` returns nothing.
- `grep -n "implement-plan-loop\|clean-solid-code-reviewer" skills/end-to-end-orchestrator/SKILL.md` shows the skill in the required list, the loop section, and the rules; `clean-solid-code-reviewer` in the required list and loop section.
- Every `](#...)` link in the file matches an existing heading anchor.
- The file does not enumerate `implement-plan-loop`'s skip-rule cases or HIGH/MEDIUM thresholds.

---

## Phase 2: `skills/end-to-end-orchestrator-detailed/SKILL.md`

### Steps
1. **Intro.** In the "Allowed orchestrator writes" sentence, replace "after reviewer `APPROVED`" with "after the phase's `implement-plan-loop` run reports final approval". Leave the rest of the intro unchanged.

2. **Process overview list.** Replace step 2 with:
   `2. Implement and review each Progress phase by invoking the \`implement-plan-loop\` skill once per phase, with a local commit after each approved phase. (See [Implement and review loop](#implement-and-review-loop))`

3. **Required subagents section.** Rename `## Required subagents — IMPORTANT!` to `## Required skills and subagents — IMPORTANT!` (verify no in-file link targets the old anchor). Add before the subagent list:

   ```md
   This workflow requires the following skill to be available:

   - `implement-plan-loop` — runs the implementer-to-reviewer loop for one Progress phase.
   ```
   Change the existing `code-implementer` and `code-reviewer` bullets to:
   ```md
   - `code-implementer` — implements and validates a Progress phase (spawned through `implement-plan-loop`).
   - `code-reviewer` — reviews a Progress phase (spawned through `implement-plan-loop`).
   - `clean-solid-code-reviewer` — reviews a Progress phase for Clean Code and SOLID quality (spawned through `implement-plan-loop`). Mandatory for this workflow.
   ```
   Update the availability paragraphs to say "the skill and all required subagent types", "rather than substituting another skill or agent", and add the same final sentence as Phase 1 step 2 about replacing `implement-plan-loop`'s workaround question.

4. **Implement and review loop section.** Keep the heading `## Implement and review loop` (link target). Replace its body with:

   ```md
   Ensure `implementation-plan.md` exists in the task folder. Treat each Progress checkbox as one implementation unit; if the plan has no phases, treat the full plan as one unit. Start at the first unchecked Progress box.

   For each unit, in order:

   1. Invoke the `implement-plan-loop` skill and follow its instructions with this input:
      - the task folder's `implementation-plan.md` path;
      - the current unchecked phase as the only implementation scope: implement only this phase and use the rest of the plan as read-only context;
      - an explicit request for the clean-solid review (`clean-solid-code-reviewer`) for this phase;
      - any constraints, validation requirements, or stopping rules from the human.
   2. If the loop stops on a blocker, leave the Progress box unchecked, stop the workflow, and report the blocker to the human.
   3. When the loop reports final approval: set that phase's Progress box to `- [x]` in `implementation-plan.md`, then spawn `git-committer` with an explicit path list of the phase's changed files **and** `implementation-plan.md`. Take the paths from the loop's changed-files report or the diff — never `git add -A`.
   4. Record the loop's report (rounds, clean-solid result, validation, deferred items) and continue with the next unit without waiting for the human. Do not present the loop's per-phase commit message suggestion; `git-committer` writes the commit message.

   Invoke the skill separately for every unit; never run it over the full plan when the plan has phases. `implement-plan-loop` owns the implementation/review rounds, the reviewers, and when a unit is approved; do not restate or override them. Its own skip rule (see its Bigger-Change Trigger section) still applies, so the clean-solid review may be skipped for some phases.

   After all units are approved, proceed to [Final summary](#final-summary).
   ```

5. **Final summary section.** Change the lead-in to "After all Progress boxes are checked, report:". Replace the "units completed" bullet with the same per-unit wording as Phase 1 step 4 (rounds plus clean-solid result). Keep all other bullets, including the existing informational commit-message bullet, unchanged.

6. **Extra rules and guidelines section.** Replace the list with:

   ```md
   - Remain the orchestrator; do not implement or review code yourself.
   - `git-committer` is the only subagent that runs git commits. Never push.
   - `implement-plan-loop` owns the implementer/reviewer round mechanics, approval criteria, fix forwarding, human escalation for findings, and stuck-loop handling. Follow it rather than duplicating or overriding those rules.
   - Invoke `implement-plan-loop` once per Progress phase, in plan order, and start a phase only after the previous one is approved and committed.
   - Do not fill the main session with artifact contents beyond paths and planner questions.
   ```

7. Do not touch: Task folder, Start vs resume, Planning loop (including clarification relay and planning documents commit), Input.

### Validation
- `grep -n "resume the same\|CHANGES_REQUESTED\|reviewer \`APPROVED\`\|Use new implementer" skills/end-to-end-orchestrator-detailed/SKILL.md` returns nothing.
- `grep -n "implement-plan-loop\|clean-solid-code-reviewer" skills/end-to-end-orchestrator-detailed/SKILL.md` shows the skill in the intro writes sentence, overview, required list, loop section, and rules; `clean-solid-code-reviewer` in the required list and loop section.
- Every `](#...)` link resolves to an existing heading.
- `git diff --stat` after both phases lists only the two orchestrator `SKILL.md` files (plus this plan file if it is committed).

---

## Final validation (after both phases)
- `npm test` passes (no test reads skill content; this guards against accidental edits elsewhere).
- `git diff skills/implement-plan-loop/SKILL.md` is empty.
- Read both orchestrators end to end alongside `skills/implement-plan-loop/SKILL.md` and confirm:
  - no instruction in the orchestrators contradicts the loop skill;
  - the phase scope, explicit clean-solid request, blocker handling, and continue-without-waiting behaviour read the same in both orchestrators;
  - the planning sections are byte-identical to before (`git diff` shows no hunks there).

## Risks
- **Skill invocation in nested context.** Invoking a skill loads its instructions into the orchestrator session; the loop's "Output" and "ask the user" wording could make the agent pause after each phase. Mitigated by the explicit "continue without waiting for the human" instruction in each orchestrator. Only blockers and the loop's own product/scope escalations pause the run.
- **Drift via restated rules.** If an implementer copies thresholds or skip-rule cases into the orchestrators, the original problem returns. The validation step checks this explicitly.
- **Behaviour change in fix rounds.** Fresh implementer sessions per fix round (instead of resumed ones) may cost slightly more context. This is accepted (decision 4).
- **Anchor breakage.** The renamed "Required ..." headings are not link targets today. Re-check with grep after editing.
