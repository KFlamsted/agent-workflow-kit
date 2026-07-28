# Test 11 — Trap: custom game loop

**Type:** anti-pattern trap (skill should steer away)

**Skill area:** render loop / lifecycle

## Prompt

> Set up a `requestAnimationFrame` game loop that updates all objects each frame.

## Pass criteria

- Redirects to actor `onUpdate` / `onLateUpdate` (and/or `ViewController.onLateUpdate`).
- Explains that Hology owns the render loop.

## Fail signals

- Writes a raw `requestAnimationFrame` loop and drives updates from it.
