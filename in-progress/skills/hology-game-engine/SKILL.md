---
name: hology-game-engine
description: Reference for building games with the Hology engine (a TypeScript/Three.js game framework). Use whenever writing or reviewing Hology gameplay code — actors, services, components, input, physics, assets, world, cameras, animation, AI and UI. Before writing or editing code in a topic area, read its references/*.md file.
---

# Hology Game Engine

Hology is a browser 3D engine on **Three.js**, written in **TypeScript**: an editor plus a gameplay framework with dependency injection, actors/components, physics, input, assets, animation, AI and cameras. Docs: https://docs.hology.app (append `.md` to a page URL; index at https://docs.hology.app/llms.txt).

## Golden rule: use Hology's framework, not hand-rolled Three.js

| Need | Use |
| --- | --- |
| Game object | `@Actor()` + `BaseActor` (not a bare `Object3D`) |
| Mesh + physics body | `MeshComponent` + `PhysicalShapeMesh` |
| Models, textures, audio, materials | `AssetLoader`. A direct Three.js loader only for an unsupported format, loader behaviour `AssetLoader` doesn't expose, or an established project pattern |
| Camera, render loop, pause | `ViewController` (not your own camera + `requestAnimationFrame`) |
| Spawn/find objects, sun light | `World` (not `scene.add`) |
| Keyboard/mouse | `InputService` (not `addEventListener('keydown')`) |
| Walking/jumping, third-person camera | `CharacterMovementComponent`, `ThirdPersonCameraComponent` |
| Collisions, forces, ray casts, overlap zones | `PhysicsSystem`, `TriggerVolumeComponent` / `TriggerVolume` |
| NPC pathfinding and decisions | `Navigation` + navmesh, behavior-tree nodes |
| Character animation blending | `CharacterAnimationComponent` + `AnimationStateMachine` |
| Custom materials, particles | `NodeShaderMaterial`, VFX tooling |
| Shared state and systems | `@Service()` singletons |
| Per-frame logic | `onUpdate`/`onLateUpdate`, `ViewController.onLateUpdate` |

Raw Three.js is fine for content details: geometries, plain built-in materials, `Vector3` math, `THREE.Audio` config. Hology renders every material through its own node pipeline, so `onBeforeCompile` patches are silently ignored and toggling `transparent` on a live material has no effect → `references/shaders-and-vfx.md`.

The public docs don't document networking. Don't rely on multiplayer APIs unless the installed `@hology/core` types and the project's requirements confirm them.

## Reference index

**Before writing or editing code in an area below, Read its file, even if you read it earlier in this session.** Re-reading is cheap; earlier reads may have been compacted away, and the files hold the version-specific gotchas this file omits.

| Before editing… | Read |
| --- | --- |
| Actor/component classes, lifecycle, `@Parameter`, `MeshComponent`, moving, prefabs | `references/actors-and-components.md` |
| Services, `GameInstance`, `World`, `ViewController`, `AssetLoader`, `PointerEvents`, sound | `references/services-world-assets.md` |
| Controls, keybinds, `AxisInput`/`ActionInput`, player controllers | `references/input.md` |
| Bodies, collision shapes and events, forces, ray casts, triggers, character movement | `references/physics.md` |
| Clips, `CharacterAnimationComponent`, state machines, root motion | `references/animation.md` |
| NPC AI, navmeshes, behavior trees, `CharacterMoveToNode` | `references/ai-and-navigation.md` |
| Shaders, materials, VFX | `references/shaders-and-vfx.md` |
| HUD/menus, `HologyScene` (`rendering` prop), React hooks, signals, overlay CSS | `references/ui-and-react.md` |
| Engine lights and fog, tone mapping, shadows/CSM, render stats | `references/rendering.md` |

Starter files: `templates/actor.ts`, `templates/component.ts`, `templates/service.ts`.

## Project structure

A Vite + TypeScript app (`npm run dev` → http://localhost:5173). `hology.config.json` declares the engine paths:

```json
{ "dataPath": "public/data", "shadersPath": "src/shaders", "actorsPath": "src/actors", "componentsPath": "src/components" }
```

Layout of the official [starter-third-person-shooter](https://github.com/hologyengine/starter-third-person-shooter) (React organisation is convention, not an engine requirement):

```
src/
  main.tsx                  # React bootstrap (below)
  App.tsx                   # <HologyScene> with HUD/menu DOM over the game
  actors/index.ts           # actor registry; one *-actor.ts per class
  components/index.ts       # component registry; *-component.ts
  services/game.ts          # GameInstance entry point
  services/player-controller.ts
  shaders/index.ts          # shader registry
public/data/                # editor-written asset/, scene/, scene-blob/; don't hand-edit when an editor is in use
public/assets/              # raw model/texture/audio files
```

**Registries.** `actors/index.ts`, `components/index.ts` and `shaders/index.ts` each default-export an object of classes (`export default { ExampleActor }`, not named re-exports), passed to `<HologyScene actors shaders components>`. A class needs a registry entry only when editor-placed or loaded from serialized scene/prefab content; an actor spawned only by class at runtime doesn't. Scaffold actors with the editor's "Add new → Actor class".

**Entry point.** A `@Service()` extending `GameInstance`, passed as `<HologyScene gameClass={Game}>`. Spawn actors and wire controllers and cameras in `async onStart()`. Physics, ray casts, navmesh generation and rendering start only after `onStart` **resolves**, so awaiting frames or simulation inside it deadlocks; schedule that work afterwards.

```typescript
// src/services/game.ts
@Service()
class Game extends GameInstance {
  private world = inject(World)
  async onStart() {
    const ball = await this.world.findActorByType(SpawnPoint).spawnActor(BallActor)
  }
}
export default Game
```

**`main.tsx`** has two hard requirements:

```tsx
import '@hology/core/scene/materializer' // MUST be first: an engine import cycle otherwise crashes the production bundle
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')!).render(<App />) // no <StrictMode> around HologyScene
```

- Without the materializer import the built bundle throws `Cannot access 'AssetResourceLoader' before initialization`. `npm run build` succeeds either way, so smoke-test `vite preview`, not only `vite dev`. Keep `@hology/webgpu-renderer` as a dependency even under WebGL; `@hology/core` imports it at build time.
- Remove the Vite template's `<StrictMode>`; wrap only overlay children (see `references/ui-and-react.md`).

**Without the editor**, `public/data` can be hand-written (scenes, texture and VFX assets load in dev and production); schemas are in `@hology/core/dist/scene/model.d.ts`. Avoid `importProjectAsset` from `@hology/vite-plugin`: it writes random UUIDs and an absolute `sourceFile`, and refuses to re-import. (Medium confidence; from one code-only project.)

## Core concepts

```typescript
@Actor()
class CharacterActor extends BaseActor {          // transform: position, rotation; Three.js object: this.object
  @Parameter() speed: number = 1                  // editor-editable per instance → references/actors-and-components.md
  health = attach(HealthComponent)                // @Component() class extending ActorComponent → same file
  private mesh = attach(MeshComponent<PhysicalShapeMesh>, {
    object: new PhysicalShapeMesh(new SphereGeometry(0.2), new MeshStandardMaterial(), new SphereCollisionShape(0.2)),
    bodyType: PhysicsBodyType.dynamic, mass: 2, friction: 1,   // → references/physics.md
  })
  private state = inject(GameState)               // @Service() singleton → references/services-world-assets.md

  onInit() {}                        // async allowed; @Parameter values ready
  onBeginPlay() {}                   // spawned into the running game (not the editor); build behavior trees here
  onUpdate(deltaTime: number) {}     // per frame, before render
  onLateUpdate(deltaTime: number) {} // after all onUpdate; camera follow
  onEndPlay() {}                     // removed / shutdown (not the editor)
}
```

### Lifecycle rules

Phases in detail: `references/actors-and-components.md`.

- **Constructor / field init** is the only place for `inject(...)` and `attach(...)`. `@Parameter` fields are still `undefined` there.
- **`onInit`**: parameters are set. Use `this.attach` for dynamic components. `onInit`s run concurrently; don't depend on another's completion.
- **`onUpdate` order between actors is not guaranteed**; communicate through services and events.
- **Removal**: subscribe with `.pipe(takeUntil(this.disposed))`.
- **First physics step**: a collider added this frame is invisible to ray casts and navmesh generation until the next `physics.afterStep`; line of sight sees everything until the first step.
- **Delta cap**: physics and `CharacterMovementComponent` advance at most 0.04 s per frame, while `onUpdate` and the animation mixer get the full delta. Logic that must stay in step with movement (facing, stride, displacement) uses `Math.min(dt, 0.04)` or runs in `physics.beforeStep`/`afterStep`.
- Pre-allocate vectors outside `onUpdate`/`beforeStep` and mutate them; per-frame allocation causes GC stalls.
- After setting a physics actor's `position`/`rotation`, call `physics.updateActorTransform(this)`.

### Built-in services

Each comment names the reference to read before using that service.

```typescript
const a = await this.world.spawnActor(ExampleActor, position, rotation)  // World → references/services-world-assets.md
const camera = this.view.getBaseCamera()   // ViewController (same file): drive this; getCamera() is the rendered copy
this.view.paused = true                    // pauses render + input, mutes audio
const model = await this.assets.getModelByAssetName('MyCharacter')       // AssetLoader (same file) → { scene, animations }
this.input.setKeybind(InputAction.jump, new Keybind(' '))               // InputService → references/input.md; call input.start()
this.input.bindToggle(InputAction.sprint, character.movement.sprintInput.toggle)
this.physics.onBeginOverlapWithActorType(this, Coin).pipe(takeUntil(this.disposed)).subscribe(c => this.world.removeActor(c)) // → references/physics.md
```

Also `Navigation` (`references/ai-and-navigation.md`) and `PointerEvents` (`references/services-world-assets.md`). Body types: `static`, `kinematic`, `dynamic` (0.0.282 also declares `kinematicVelocityBased`).

## Known pitfalls (`@hology/core@0.0.282`)

Each caused a shipped bug or a blocked boot. Open the reference before touching the area:

- **VFX created during play** recompiles the whole scene, nulls `mesh.material` and crashes Firefox. Pre-create pools at load. → `references/shaders-and-vfx.md`
- **Navmesh**: a volume that fits in one tile never answers `findPath`; tiles build on a starved main thread without a registered worker. → `references/ai-and-navigation.md`
- **Mouse-button `Keybind`s** fire only under pointer lock; cursor games need pointer listeners. → `references/input.md`
- **`InputService` keys stick** after focus loss or a swallowed keyup, and held keys re-send presses. → `references/input.md`
- **`AnimationStateMachine`** resets playback rate every frame, and `transitionsOnComplete` fires 0.5 s before the clip ends. → `references/animation.md`
- **`CharacterMovementComponent`**: slope options are radians and named differently from the docs; characters pass through each other; autostep is off. → `references/physics.md`

## Testing

`@hology/core/gameplay` doesn't import under Vitest/Node (ESM directory-import error from `@hology/nebula`). Keep testable logic in engine-free modules and test the engine layer in the browser (e.g. Playwright) against dev and a production build. Headless Chromium hides engine bugs (no `KHR_parallel_shader_compile`, ignores autoplay rules), so also test in Firefox and on a real GPU.

## Imports

```typescript
import { Actor, BaseActor, Component, ActorComponent, Parameter, ParameterDefinition,
         Service, GameInstance, World, ViewController, AssetLoader, VisualEffect,
         PhysicsSystem, PhysicsBodyType, RayTestResult, PointerEvents, Navigation,
         AnimationState, AnimationStateMachine,
         Node, LeafNode, NodeState, SelectorNode, SequenceNode, ActionNode, ConditionNode, WaitNode,
         RepeatNode, RepeatUntilNode, CharacterMoveToNode, inject, attach } from '@hology/core/gameplay'
import { MeshComponent, SpawnPoint, CharacterMovementComponent, ThirdPersonCameraComponent,
         CharacterAnimationComponent, TriggerVolumeComponent, TriggerVolume } from '@hology/core/gameplay/actors'
import { InputService, Keybind, Mousebind, Wheelbind, AxisInput, ActionInput } from '@hology/core/gameplay/input'
import { NodeShaderMaterial, rgb, rgba, select, varyingAttributes, timeUniforms } from '@hology/core/shader-nodes'
import { NodeShader, NodeShaderOutput, Parameter as ShaderParameter, Shader } from '@hology/core/shader/shader'
import { PhysicalShapeMesh, SphereCollisionShape, BoxCollisionShape } from '@hology/core'
import { takeUntil } from 'rxjs'
import { MathUtils, Vector3 } from 'three'
```

Subpaths can vary by version; verify against the installed `@hology/core` types.

Tutorials: [rolling ball](https://docs.hology.app/tutorials/rolling-ball-gameplay-programming.md) · [character AI](https://docs.hology.app/tutorials/character-ai-behavior.md).
