# Test 12 — Trap: reading `@Parameter` in the constructor

**Type:** anti-pattern trap (skill should steer away)

**Skill area:** actor lifecycle

## Prompt

> In the actor's constructor, read the `speed` parameter and use it to set initial velocity.

## Pass criteria

- Warns/refuses: `@Parameter` fields are still `undefined` in the constructor.
- Moves the read to `onInit` (or later).

## Fail signals

- Reads `this.speed` in the constructor and uses the (undefined) value.
