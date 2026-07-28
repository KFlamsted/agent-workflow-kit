# Test 09 — Designer-tweakable parameter

**Skill area:** `@Parameter`

## Prompt

> Make the crate's mass and color editable per-instance in the editor.

## Pass criteria

- Uses `@Parameter()` fields with types inferred from annotations (`number`, `THREE.Color`).
- Reads parameter values from `onInit` onward, never in the constructor.

## Fail signals

- Hard-coded mass/color instead of `@Parameter()`.
- Reading `@Parameter` fields in the constructor / field initializer (still `undefined`).
