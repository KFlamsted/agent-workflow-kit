# Animation (deep reference)

Covers playing animation clips, the `CharacterAnimationComponent`, and animation state machines. Read this when animating models/characters. Prefer Hology's character animation helpers over hand-built mixers when animating characters.

## Raw Three.js mixer (simple / non-character)

Animation clips come from loaded models (`LoadedMesh.animations`). For simple cases you can drive a `THREE.AnimationMixer` directly and update it each frame.

```typescript
async onInit() {
  const model = await this.assetLoader.getModelByAssetName('character-human')
  this.object.add(model.scene)
  this.mixer = new THREE.AnimationMixer(model.scene)
  const clip = THREE.AnimationClip.findByName(model.animations, 'idle')
  if (!clip) {
    throw new Error("Animation clip 'idle' not found in model asset 'character-human'")
  }
  this.mixer.clipAction(clip).play()
}
onUpdate(dt: number) { this.mixer.update(dt) }
```

Each animated object needs its own mixer. For characters, prefer `CharacterAnimationComponent` below — it handles blending/transitions and upper/lower-body masking.

## CharacterAnimationComponent

Attach it, `setup(mesh)` with the loaded model mesh, then `play(clip)` a single clip or `playStateMachine(asm)` for state-driven animation.

```typescript
private characterAnimation = attach(CharacterAnimationComponent)

async onInit() {
  const model = await this.assetLoader.getModelByAssetName('character-human')
  this.object.add(model.scene)
  this.characterAnimation.setup(model.scene)
  const clip = THREE.AnimationClip.findByName(model.animations, 'idle')
  if (!clip) {
    throw new Error("Animation clip 'idle' not found in model asset 'character-human'")
  }
  this.characterAnimation.play(clip)
}
```

`play()` accepts optional options: `loop` and `priority` (a higher priority overrides lower-priority animation, including a state machine), and `inPlace` for root motion (see below).

It also supports masking animations to only affect the upper or lower body (e.g. aim/shoot on top while legs run).

## Animation state machines

Model animation as a directed graph of `AnimationState`s connected by predicate-guarded transitions. Drive predicates from gameplay state (e.g. `ActionInput.activated`, movement direction, `falling`).

```typescript
const idle = new AnimationState(idleClip)
const walk = new AnimationState(walkClip)
idle.transitionsBetween(walk, () => pressingWalk.activated)  // both directions
const asm = new AnimationStateMachine(idle)                  // pass the initial state
this.characterAnimation.playStateMachine(asm)
```

Transition methods on a state:
- **`transitionsTo(state, predicate)`** — one-way; transition when predicate is true.
- **`transitionsBetween(state, predicate)`** — bi-directional (back when predicate goes false).
- **`transitionsOnComplete(state, predicate?)`** — for clips that naturally end (jump → fall). The public documentation presents the optional predicate as useful for selecting among multiple possible completion destinations.

  **`@hology/core@0.0.232` version note:** in this runtime, a true predicate can trigger the transition early, but after the clip reaches its completion threshold the transition can succeed regardless of that predicate. Predicates therefore do not reliably gate or select completion destinations in this version. Inspect and test the installed package before designing multiple completion transitions around predicate selection.

### Child states

A child state is a more specific variant of a parent (e.g. `walkLeft`/`walkRight` under `walk`). Define transitions on the parent so all children inherit them — keeps large movement graphs manageable.

```typescript
const walk = new AnimationState(walkClip)
const walkLeft  = walk.createChild(walkLeftClip,  () => movementDirection < 0)
const walkRight = walk.createChild(walkRightClip, () => movementDirection > 0)
const fall = new AnimationState(fallClip)
walk.transitionsBetween(fall, () => falling)   // applies from any walk child
```

## Root motion

Lets an animation drive character movement (e.g. an attack that steps forward). The root bone carries the translation track; the character movement component applies it to the actor, so colliders and slopes still work (https://docs.hology.app/gameplay/animation/character-root-motion.md).

```typescript
// 1. Setup with a root bone (no/minor rotation, has the translation track)
const bone = this.characterMesh.getObjectByName('mixamorigSpine2') as Bone
this.animation.setup(this.characterMesh, [], bone)
const rootMotionSlash = RootMotionClip.fromClip(attackClips.spinSlash, false)

// 2. Play it and hand the action to the movement component
this.animation.play(rootMotionSlash, { inPlace: false, loop: false, priority: 1 })
this.movement.setRootMotionAction(this.animation.getRootMotionAction())
```

- `inPlace: false` lets the clip move the character; `loop: false` ends it after one play.
- Higher `priority` overrides the state machine while it plays.
- While root motion is active, movement ignores direction input; control returns from the new position when it ends.
- The docs do not show the `RootMotionClip` import; check the installed `@hology/core` exports.

A full state-machine example lives in the third-person starter's `character-actor.ts`.

## Imports

```typescript
import { AnimationState, AnimationStateMachine, inject, attach } from '@hology/core/gameplay'
import { CharacterAnimationComponent } from '@hology/core/gameplay/actors'
import { ActionInput } from '@hology/core/gameplay/input'
import * as THREE from 'three'
```
