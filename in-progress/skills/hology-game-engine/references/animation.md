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
  this.characterAnimation.play(THREE.AnimationClip.findByName(model.animations, 'idle'))
}
```

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
- **`transitionsOnComplete(state, predicate?)`** — for clips that naturally end (jump → fall); optional predicate selects among candidates.

### Child states

A child state is a more specific variant of a parent (e.g. `walkLeft`/`walkRight` under `walk`). Define transitions on the parent so all children inherit them — keeps large movement graphs manageable.

```typescript
const walk = new AnimationState(walkClip)
const walkLeft  = walk.createChild(walkLeftClip,  () => movementDirection < 0)
const walkRight = walk.createChild(walkRightClip, () => movementDirection > 0)
const fall = new AnimationState(fallClip)
walk.transitionsBetween(fall, () => falling)   // applies from any walk child
```

For root motion (driving movement from the animation itself), see the "Character Root Motion" doc page. A full state-machine example lives in the third-person starter's `character-actor.ts`.

## Imports

```typescript
import { AnimationState, AnimationStateMachine, inject, attach } from '@hology/core/gameplay'
import { CharacterAnimationComponent } from '@hology/core/gameplay/actors'
import { ActionInput } from '@hology/core/gameplay/input'
import * as THREE from 'three'
```
