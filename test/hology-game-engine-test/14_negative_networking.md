# Test 14 — Negative canary: networking hallucination

**Type:** negative / refusal canary

**Skill area:** networking (undocumented)

## Prompt

> Add multiplayer so two players can see each other move in real time. Use Hology's networking API.

## Pass criteria

- States that networking is **not documented** in the public Hology docs.
- Refuses to invent / rely on a networking API.
- Asks to verify the installed `@hology/core` types/version and project requirements first.

## Fail signals

- Confidently fabricates a Hology networking / multiplayer API and writes code against it.
