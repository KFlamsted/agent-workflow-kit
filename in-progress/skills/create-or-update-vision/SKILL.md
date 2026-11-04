---
name: create-or-update-vision
description: Explicitly invoked workflow that explores the product idea with the user to create or update the project's vision document (VISION.md). Use only when the user invokes /create-or-update-vision or names this skill. Do not auto-run from mentions of VISION.md or an incomplete template.
disable-model-invocation: true
---

# Create or update the project vision

Explore the product idea with the user and write `<repo-root>/VISION.md`: a
short north-star description of what the finished product is meant to be. It
is the target that `MVP.md` and later milestones are sliced from. It is not a
specification: systems, numbers, and content lists belong in later specs.

Hold the conversation in this main session. You may spawn read-only research
agents for fact-finding, such as comparable products, platform or store
requirements, or the as-built inventory in step 1. Present their findings to the user as input
to decisions, never as decisions. Do not implement product code, create
issues, or edit other files, including `MVP.md`.

Default to leaving `VISION.md` uncommitted. Commit only when the user
explicitly asks (see step 7). Never push.

## 0. The human owns the vision

Every statement in `VISION.md` traces to a decision the human made in this
session or in the existing document. Your role is to guide: surface unknowns,
tensions, and options, and give a recommendation when you have one. The human
chooses.

- Label your suggestions as suggestions ("Recommended: ..., because ...").
  An unanswered recommendation stays an open question.
- When the human says "you decide", that is their decision to delegate. Make
  the choice, state it, and record it in `VISION.md` as *(delegated)* so it
  can be revisited.
- Repository evidence may answer facts (an engine is already set up). It must
  not choose the audience, pillars, release scope, or direction.
- Brainstorm ideas freely, but present them as options to accept, change, or
  reject. Write only the accepted ones.

Use the host's question tool (`AskUserQuestion`, `AskQuestion`, `question`)
when available; otherwise ask numbered questions in chat. Wait for answers.
After each reply, look for new unknowns and knock-on effects before moving on.

Keep question batches small (about 1–3 related questions). Explain why a
question matters when the tradeoff is not obvious. Use open questions when a
menu would hide the real choice.

Stay at north-star altitude. When an answer drifts into MVP slicing ("let's
leave that out of the first version"), note that it belongs in `MVP.md` and
ask what the finished product needs instead. When it drifts into specification (exact numbers,
formulas, full content lists), capture the intent in a sentence and move on.

Do not write `VISION.md` until step 5 confirmation succeeds.

## 1. Orient

Locate the Git repository root. The output path is always
`<repo-root>/VISION.md`.

Read, if present: the current `VISION.md`, `MVP.md`, `README.md`, any design,
pitch, or prompt documents the user points to, `git status`, and enough of the
repository to know its stack and whether it is a game.

If the repository already has user-facing functionality beyond a skeleton or
setup, spawn read-only research agents to build an as-built inventory, and
keep reading code out of this session. Choose how many from the size and
shape of the codebase, and merge their reports into one inventory. Brief each
to report facts with file references and no opinions on direction:

- what users can do today
- platforms, stack, and runtime targets
- rough volume of features or content
- half-built or abandoned work
- roadmap, TODO, or design documents
- places where documentation and code disagree

Turn each significant finding into a question for the user: is this part of
the vision, only part of the MVP, or legacy? Bring contradictions between the
code and the user's answers to the user; never smooth them over.

Treat existing material as a seed, not as agreed vision. If `MVP.md` exists,
it shows what the user cut for a first slice; ask whether those cuts also
limit the finished product.

Classify mode:

- **Create:** `VISION.md` is missing or still dominated by `[placeholders]`.
- **Update:** `VISION.md` has real content in at least one section.
- If mixed or ambiguous, ask which mode the user intends.

## 2. Inventory sections

Use the headings in [templates/vision.md](templates/vision.md). For each
heading, classify it as **satisfied**, **gap**, **contradiction** (with repo
evidence, another section, or the user's requested change), or **requested
change**.

**Create:** treat almost everything as a gap.

**Update:** explore gaps, contradictions, and requested changes. Leave
satisfied sections alone unless a later answer contradicts them. If a change
affects scope or direction and `MVP.md` exists, tell the user which MVP items
may now be misaligned. Updating the vision does not update the MVP.

## 3. Explore

Open the idea up before narrowing it. For each branch, surface what the user
has not said yet: unknowns, unstated assumptions, tensions between goals, and
risks. Offer concrete possibilities to react to.

**Identity**

- The pitch in two or three sentences. What the user should feel or achieve.
- References and inspirations, and how this product differs from each. What
  would make someone pick it over the closest alternative?

**Audience**

- Who it is for, concretely, and who it is not for. Challenge broad labels
  ("everyone", "family friendly") until they imply design consequences.

**Pillars**

- 3–5 pillars: the qualities every feature must serve. For each, what it
  means in practice and what it rules out. A pillar that rules nothing out is
  too vague.
- Name tensions between pillars and ask how the user resolves them.

**Release target**

- What version 1.0 contains, in rough magnitude: size, breadth, length of
  use or play. What makes it worth releasing (or selling).
- Platforms, distribution, and business model, if decided.

**Long-term direction**

- What may come after 1.0, and what keeps users coming back. Optional; say so.

**Non-goals**

- What the product never becomes, even if asked.

**Risks and unknowns**

- What could make the idea fail or not be fun/useful. For each: decide now,
  prototype, research, or leave open.

**Game specifics** (ask whether it is a game if unclear; omit for non-games)

- Core loops at three time scales: moment-to-moment, session, long-term.
- Progression arc from start to the end of 1.0 and beyond.
- Tone, art, and audio direction in a few words each.
- World, story, and setting: how much matters, and what kind.

Recording "not decided yet" is a valid answer. It goes under "Open questions".
Create may not finish while the pitch, audience, pillars, or release target
are placeholders; they may be partly open, but each needs at least one
decided statement.

The exploration is done when every template section is satisfied, deliberately
omitted, or captured as an open question, and you have raised every tension
and risk you found.

## 4. Converge

Restate the emerging vision in a few lines and check for contradictions with
the pillars. Ask the user to resolve each one; do not resolve them yourself.

## 5. Draft in conversation

Present a summary mapped to the template headings, including:

- the pitch, audience, and pillars with what each rules out
- the release target and non-goals
- risks and unknowns with their chosen handling
- open questions
- every *(delegated)* decision, so the user can take it back
- whether the game section is present or omitted, and why

Ask the user to confirm or correct. Do not write the file on this turn.

## 6. Write VISION.md

Only after confirmation:

- Start from [templates/vision.md](templates/vision.md) and keep its headings
  for kept sections. Replace every placeholder; no `[placeholders]` remain.
- Keep the "How to use this document" comment at the top. Remove the other
  per-section HTML comments.
- Omit "Long-term direction" and the game section when not applicable. Omit
  "Open questions" only if there are none.
- Phrase open questions so a later agent must ask, not invent.
- Aim for one or two pages. Cut detail that belongs in a spec.
- Write only `<repo-root>/VISION.md`.

Afterwards, if `MVP.md` exists, mention that `/create-or-update-mvp` can check
it against the new vision.

## 7. Commit offer

Default: leave the file uncommitted and tell the user they can inspect and
commit it.

If and only if they ask to commit: `git add` exactly `VISION.md`, then commit
locally with a concise message such as `docs: add product vision` or `docs:
update product vision`, following the repo's message style if it has one.
Never push, amend, reset, or use `--no-verify`. Do not stage other paths; if
`VISION.md` cannot be committed in isolation, stop and report why.
