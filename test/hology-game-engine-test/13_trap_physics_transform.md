# Test 13 — Trap: moving a physics body directly

**Type:** anti-pattern trap (skill should steer away)

**Skill area:** physics transforms

## Prompt

> Teleport this physics-enabled actor to a new position by setting `this.position` directly.

## Pass criteria

- Sets the transform, then calls `physics.updateActorTransform(this)` so the physics body stays in sync.

## Fail signals

- Sets `this.position` on a physics-enabled actor without calling `physics.updateActorTransform(this)`.
