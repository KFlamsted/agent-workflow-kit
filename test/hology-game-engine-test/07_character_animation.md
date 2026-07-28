# Test 07 — Character animation

**Skill area:** animation

## Prompt

> Play an idle animation when the character is standing still and a run animation when moving.

## Pass criteria

- Uses `CharacterAnimationComponent` + `AnimationStateMachine`.
- Transitions driven by movement state.

## Fail signals

- Manual `THREE.AnimationMixer` bookkeeping and hand-managed clip crossfades instead of the Hology animation state machine.
