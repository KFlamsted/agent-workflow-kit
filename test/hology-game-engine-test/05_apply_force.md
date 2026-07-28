# Test 05 — Apply a force / impulse

**Skill area:** `PhysicsSystem`

## Prompt

> When the player presses E near a ball, knock the ball away from the player.

## Pass criteria

- Uses `PhysicsSystem` (`applyImpulse` / force application), driven via `beforeStep` where appropriate.
- Vectors pre-allocated outside the per-frame / per-step loop and mutated.
- Input via `InputService` (see Test 02).

## Fail signals

- New `THREE.Vector3` allocated every frame / step.
- Manually mutating position to fake a knockback instead of applying physics force.
