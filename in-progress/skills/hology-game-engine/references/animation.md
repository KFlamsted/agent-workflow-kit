# Animation

Docs: https://docs.hology.app/gameplay/animation.md

Clips come from loaded models (`LoadedMesh.animations`). For a simple non-character object, drive a `THREE.AnimationMixer` per object and `mixer.update(dt)` in `onUpdate`. For characters use `CharacterAnimationComponent`: it handles blending, transitions and upper/lower-body masking (e.g. aim on top while legs run).

## CharacterAnimationComponent

```typescript
private characterAnimation = attach(CharacterAnimationComponent)

async onInit() {
  const model = await this.assetLoader.getModelByAssetName('character-human')
  this.object.add(model.scene)
  this.characterAnimation.setup(model.scene)
  const clip = THREE.AnimationClip.findByName(model.animations, 'idle')
  if (!clip) throw new Error("Clip 'idle' not found in 'character-human'")
  this.characterAnimation.play(clip)   // or playStateMachine(asm)
}
```

`play()` options: `loop`, `fadeTime`, `priority` (higher overrides lower, including a state machine), `inPlace` (root motion). `getFullBodyAction()` is typed non-null but returns `null` until the first `play()`.

## Animation state machines

A graph of `AnimationState`s with predicate-guarded transitions driven by gameplay state (`ActionInput.activated`, movement direction, `falling`).

```typescript
const idle = new AnimationState(idleClip)
const walk = new AnimationState(walkClip)
idle.transitionsBetween(walk, () => pressingWalk.activated)
this.characterAnimation.playStateMachine(new AnimationStateMachine(idle))   // initial state
```

- **`transitionsTo(state, predicate)`**: one-way.
- **`transitionsBetween(state, predicate)`**: back again when the predicate turns false.
- **`transitionsOnComplete(state, predicate?)`**: for clips that end (jump → fall). In 0.0.282 it fires when the predicate is true **or** at `clip.duration − 0.5 s`, whichever comes first; the predicate can't block it, so predicates can't select among destinations (contrary to the docs). A 0.67 s hit clip is cut after 0.17 s.

The machine calls `play()` every frame, resetting `timeScale`, so a run clip can't be stride-matched through it. For one-shots shorter than about 1 s or speed-matched locomotion, drive `play()` from your own state logic.

**Child states** are variants of a parent that inherit its transitions:

```typescript
const walkLeft = walk.createChild(walkLeftClip, () => movementDirection < 0)
walk.transitionsBetween(fall, () => falling)   // applies from any walk child
```

Full example: the third-person starter's `character-actor.ts`.

## Root motion

The clip's root bone translation moves the character through the movement component, so colliders and slopes still apply ([docs](https://docs.hology.app/gameplay/animation/character-root-motion.md)).

```typescript
const bone = this.characterMesh.getObjectByName('mixamorigSpine2') as Bone  // no/minor rotation, has the translation track
this.animation.setup(this.characterMesh, [], bone)
const slash = RootMotionClip.fromClip(attackClips.spinSlash, false)

this.animation.play(slash, { inPlace: false, loop: false, priority: 1 })
this.movement.setRootMotionAction(this.animation.getRootMotionAction())
```

While root motion plays, movement ignores direction input; control resumes from the new position. The docs don't show the `RootMotionClip` import; check the installed exports.
