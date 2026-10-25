---
name: create-or-update-mvp
description: Explicitly invoked workflow that brainstorms with the user to create or update the project's MVP document (MVP.md). Use only when the user invokes /create-or-update-mvp or names this skill. Do not auto-run from mentions of MVP.md or an incomplete template.
disable-model-invocation: true
---

# Create or update the project MVP

Brainstorm with the user and write `<repo-root>/MVP.md`: a short, stable
description of the smallest product worth shipping. It is the document humans
and agents fall back on when in doubt about scope, and the source issues can be
created from when there is no backlog.

Run entirely in this main session. Do not spawn or delegate to agents. Do not
implement product code, create issues, or edit other files.

Default to leaving `MVP.md` uncommitted. Commit only when the user explicitly
asks (see step 7). Never push.

## 0. Session rules

Do not accept the opening message as a finished MVP. Treat it as a seed.

Repository evidence may answer facts (a `project.godot` exists, a web stack is
already in place). It must not choose the hypothesis, users, scope, or done
criteria. Do not fill gaps with what projects usually do.

Use the host's question tool (`AskUserQuestion`, `AskQuestion`, `question`)
when available; otherwise ask numbered questions in chat. Wait for answers.
After each reply, look for new ambiguities before moving on.

Offer concrete options and a recommended default when that is not leading. Use
open questions when a menu would hide the real choice. Explain why a question
matters when the tradeoff is not obvious.

Challenge vague answers ("make it nice", "support everyone", "when it's
done"). Ask for observable behavior, named users, and finite evidence.

Push toward *minimum*. For every proposed capability, ask whether the core
journey or the hypothesis fails without it. If not, propose moving it to
"Deferred until after the MVP". The user decides; you argue for smaller.

Do not write `MVP.md` until step 5 confirmation succeeds.

## 1. Orient

Locate the Git repository root. The output path is always
`<repo-root>/MVP.md`.

Read, if present: the current `MVP.md`, `README.md`, any existing vision,
roadmap, or end-goal document, `git status`, and enough of the repository to
know its stack and whether it is a game or engine project.

If another goal document exists (for example `end-goal.md`), ask whether the
MVP should be derived from it, and treat it as a seed, not as agreed MVP scope.

Classify mode:

- **Create:** `MVP.md` is missing or still dominated by `[placeholders]`.
- **Update:** `MVP.md` has real content in at least one section.
- If mixed or ambiguous, ask which mode the user intends.

## 2. Inventory sections

Use the headings in [templates/mvp.md](templates/mvp.md). For each heading,
classify:

- **Satisfied:** concrete user intent, no placeholder, no conflict.
- **Gap:** missing, placeholder, or too vague to steer scope decisions.
- **Contradiction:** disagrees with repo evidence, another section, or the
  user's requested change.
- **Requested change:** the user asked to change it this session.

**Create:** treat almost everything as a gap. Turn repo facts into questions
("there is a `project.godot` — is this a Godot game?"), not silent fills.

**Update:** grill gaps, contradictions, and requested changes. Do not
re-litigate satisfied sections unless a later answer contradicts them. After
each material answer, re-check knock-on effects (for example, dropping mobile
should revisit platforms, journey, validation, and done criteria).

In update mode, if a change removes or reshapes an existing `F<n>` item, tell
the user that issues, plans, or branches referencing that ID may now be
misaligned. Updating the MVP does not update them.

## 3. Decision tree

Do not skip a gap because a default feels conventional. Minimum branches:

**Problem and users**

- What problem does this solve, in one sentence?
- What is the hypothesis the MVP tests? What result would prove it wrong?
- Who is the MVP for, and who is deliberately left out for now?

**Scope**

- What is the single core journey, step by step, from first contact to value?
- Which capabilities does that journey need? Capture each as an observable
  outcome with a *Done when* line, not as a technical task.
- What is wanted eventually but deferred? What would trigger revisiting it?
- What should the project never attempt?

**Quality, constraints, platforms**

- Which quality bars are required for the MVP specifically, and what evidence
  shows them? Resist adding bars that only matter at scale.
- Fixed constraints: stack, license, policy, data, budget, schedule.
  Distinguish constraint from preference.
- Supported OS, browsers, devices, runtimes, minimum versions. Challenge "all
  platforms".

**Done, validation, success**

- Finite "the MVP is done" conditions and their evidence. Reject "keep
  improving".
- Automated checks vs manual checks, expected results, and who performs manual
  checks. An unavailable check is never treated as passed.
- Which signals after release tell you whether the hypothesis held?

**Game specifics**

- Ask whether this is a game if unclear. If repo evidence and the user
  disagree, resolve the contradiction.
- Not a game: omit the "Game specifics" section entirely.
- A game: ask about engine and version (never invent one), core loop, input,
  art and audio direction, performance budgets, save and network, and manual
  play-test scenarios — all scoped to the MVP.

**Open decisions**

- After a branch is asked, the user may say they do not know yet. Record it
  under "Open decisions" with the MVP items it blocks.
- Create may not finish while the problem, hypothesis, MVP scope, done
  criteria, or validation are open or placeholder. Those must be concrete.

Keep question batches small (about 1–3 related questions). Prefer follow-ups
over one large questionnaire.

## 4. Capability IDs

Every MVP scope item gets a stable ID: `F1`, `F2`, ... so issues, plans, and
PRs can reference what they deliver.

- On create, number in core-journey order.
- On update, never renumber or reuse an ID. New items take the next free
  number. Removed items stay in the list marked `(retired)` with a one-line
  reason, or move to "Deferred" keeping their ID.
- Each item should be small enough to become one or a few issues. If an item
  would clearly need many, propose splitting it.

## 5. Draft in conversation

Present a summary mapped to the template headings, including:

- the hypothesis and the core journey
- the MVP scope items with IDs and *Done when* lines
- deferred items and non-goals
- open decisions
- whether the game section is present or omitted, and why
- remaining assumptions, if any (these must not be hidden product choices)

Ask the user to confirm or correct. Do not write the file on this turn.

## 6. Write MVP.md

Only after confirmation:

- Start from [templates/mvp.md](templates/mvp.md) and keep its headings for
  kept sections.
- Replace every placeholder with agreed content. No `[placeholders]` may
  remain.
- Keep the "How to use this document" comment at the top. Remove the other
  per-section HTML comments.
- Omit the game section when the project is not a game. Omit "Open decisions"
  only if there are none.
- Phrase open decisions so a later agent must ask, not invent.
- Write only `<repo-root>/MVP.md`.

## 7. Commit offer

Default: leave the file uncommitted and tell the user they can inspect and
commit it.

If and only if they ask to commit: `git add` exactly `MVP.md`, then commit
locally with a concise message such as `docs: add MVP definition` or `docs:
update MVP definition`, following the repo's message style if it has one.
Never push, amend, reset, or use `--no-verify`. Do not stage other paths; if
`MVP.md` cannot be committed in isolation, stop and report why.
