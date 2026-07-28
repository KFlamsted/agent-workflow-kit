# Hology Game Engine — Skill Test Suite

A repeatable test suite for validating the [`hology-game-engine`](../../in-progress/skills/hology-game-engine/) skill: does an LLM equipped with the skill produce correct Hology code and follow its "golden rule" (use Hology's framework helpers, don't rebuild them in raw Three.js)?

## How to run a test

1. Start a session where the LLM has the `hology-game-engine` skill available (reference it in `AGENTS.md` / `CLAUDE.md`, or load it directly).
2. Give the LLM the **Prompt** from a test file, ideally against a compilable Hology project (see below).
3. Score the result against the file's **Pass criteria** / **Fail signals**.

## Test index

| # | File | Type | Focus |
|---|------|------|-------|
| 01 | `01_spawn_game_object.md` | helper | actors, `MeshComponent`, `World`/`SpawnPoint` |
| 02 | `02_player_keyboard_movement.md` | helper | `InputService`, `CharacterMovementComponent` |
| 03 | `03_camera_follow.md` | helper | `ThirdPersonCameraComponent`, `onLateUpdate` |
| 04 | `04_pickup_on_overlap.md` | helper | overlap events, triggers, `@Service()` |
| 05 | `05_apply_force.md` | helper | `PhysicsSystem` forces |
| 06 | `06_npc_pathfinding.md` | helper | `Navigation`, behavior trees |
| 07 | `07_character_animation.md` | helper | `CharacterAnimationComponent`, state machine |
| 08 | `08_load_model_asset.md` | helper | `AssetLoader` |
| 09 | `09_designer_parameter.md` | helper | `@Parameter`, lifecycle |
| 10 | `10_hud.md` | helper | UI / React overlay |
| 11 | `11_trap_game_loop.md` | trap | render loop / lifecycle |
| 12 | `12_trap_lifecycle_constructor.md` | trap | reading `@Parameter` too early |
| 13 | `13_trap_physics_transform.md` | trap | physics transform sync |
| 14 | `14_negative_networking.md` | negative canary | undocumented networking API |

- **helper** — verifies the LLM reaches for the correct Hology helper instead of hand-rolling in Three.js.
- **trap** — deliberately tempts an anti-pattern from the skill's "Don't" list; the LLM should steer away.
- **negative canary** — verifies the LLM refuses to invent undocumented APIs.

## Grading layers

Combine these for a reliable verdict:

1. **Objective / compile** — run each result through `tsc --noEmit` and/or `vite build` against real `@hology/core`. Hallucinated methods, wrong imports, and bad subpaths fail automatically. This removes most subjectivity.
2. **Behavioral** — score each result against its **Pass criteria** / **Fail signals** (used the named helper? avoided the "Don't"?).
3. **Reference-loading** — confirm the model opened the matching `references/*.md` for the topic (e.g. `physics.md` for tests 04–05, `ai-and-navigation.md` for 06).
4. **A/B (lift)** — run the whole suite once *with* the skill and once *without*. If the no-skill run scores similarly, the skill isn't adding value; the delta is what you're actually measuring.

## Suggested baseline project

For the compile layer, seed from the official [`starter-third-person-shooter`](https://github.com/hologyengine/starter-third-person-shooter) so generated code has a real, type-checkable `@hology/core` to build against. Apply each task to a fresh copy of the baseline, then run the compile check.

## Scoring sheet (optional)

| Test | Compile (pass/fail) | Behavioral (0–2) | Opened right reference? | Notes |
|------|---------------------|------------------|-------------------------|-------|
| 01 | | | | |
| … | | | | |

Behavioral scale: **2** = correct helper, no anti-patterns · **1** = partially correct / mixed · **0** = hand-rolled or wrong.
