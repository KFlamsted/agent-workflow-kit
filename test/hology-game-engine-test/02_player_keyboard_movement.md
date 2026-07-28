# Test 02 — Player keyboard movement

**Skill area:** input, character movement

## Prompt

> Add WASD movement and spacebar jump for the player character.

## Pass criteria

- Uses `InputService` + `Keybind` to map keys to actions.
- Uses `CharacterMovementComponent` for walking/jumping.

## Fail signals

- Raw `addEventListener('keydown')` / `keyup`.
- Custom kinematics / manual velocity integration instead of `CharacterMovementComponent`.
