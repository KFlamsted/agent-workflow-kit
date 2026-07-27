---
name: hology-game-engine
description: Reference for building games with the Hology engine (a TypeScript/Three.js game framework). Use whenever writing or reviewing Hology gameplay code — actors, services, components, input, physics, assets, world, cameras, animation, AI and UI. Load the matching references/*.md file for any topic you work on in depth.
---

# Hology Game Engine

Hology is a web-based 3D game engine built on **Three.js**. Games are written in **TypeScript** and run in the browser. It ships a 3D editor plus a gameplay framework with dependency injection, an actor/component model, physics, input, assets, animation, AI and camera helpers.

This file is the always-loaded core: the golden rule, project structure, the essential concepts, and do's & don'ts. **For any topic you touch in depth, open the matching file in `references/`** (see the index below) — that's where the full API and examples live.

Docs: https://docs.hology.app (append `.md` to any page URL for markdown; full index at https://docs.hology.app/llms.txt).

## The golden rule: use Hology's framework, don't rebuild it in Three.js

Hology already wraps most of what a game needs. **Do not hand-roll from scratch in Three.js what Hology provides.** Reach for the framework helper first:

| Need | Use Hology helper — NOT raw Three.js |
| --- | --- |
| A game object | `@Actor()` + `BaseActor` (not a bare `THREE.Object3D`) |
| Mesh + physics body | `MeshComponent` + `PhysicalShapeMesh` (not manual `THREE.Mesh` + external physics) |
| Loading models/textures/audio/materials | `AssetLoader` (not `GLTFLoader`/`TextureLoader`/`AudioLoader` directly) |
| The camera / render loop / pause | `ViewController` (not your own `PerspectiveCamera` + `requestAnimationFrame`) |
| Spawning/finding objects, directional light | `World` (not `scene.add`) |
| Keyboard/mouse input | `InputService` (not raw `addEventListener('keydown')`) |
| Character walking/jumping | `CharacterMovementComponent` (not custom kinematics) |
| Third-person camera follow | `ThirdPersonCameraComponent` |
| Collisions, forces, raycasts | `PhysicsSystem` |
| Overlap zones | `TriggerVolumeComponent` / `TriggerVolume` |
| NPC pathfinding / decisions | `Navigation` + navmesh, behavior-tree nodes (not custom A*/state machines) |
| Character animation blending | `CharacterAnimationComponent` + `AnimationStateMachine` |
| Custom materials / vertex effects | `NodeShaderMaterial` (TS shaders), VFX tooling |
| Shared/global state & systems | `@Service()` singletons |
| Per-frame logic | actor `onUpdate`/`onLateUpdate` or `ViewController.onLateUpdate` (not your own loop) |

Raw Three.js is still fair game for **content details** — geometries, materials, `THREE.Vector3` math, `THREE.Audio` config — but the game's structure, lifecycle, loading and systems should go through Hology.

## Reference index — open the file for your task

`SKILL.md` covers the essentials. When working on a topic in depth, read the matching file first (they hold the full API surface, options, and worked examples):

| Working on… | Open |
| --- | --- |
| Actor/component classes, lifecycle bugs, `@Parameter`, `MeshComponent`, spawning/moving, prefabs | `references/actors-and-components.md` |
| Services, `GameInstance`, `World`, `ViewController`, `AssetLoader`, `PointerEvents`, sound | `references/services-world-assets.md` |
| Player controls, keybinds, `AxisInput`/`ActionInput`, player controllers | `references/input.md` |
| Physics bodies, collision shapes, collision/overlap events, forces, ray casts, triggers, character movement | `references/physics.md` |
| Playing clips, `CharacterAnimationComponent`, animation state machines | `references/animation.md` |
| NPC AI, navmeshes, `Navigation`, behavior trees, `CharacterMoveToNode` | `references/ai-and-navigation.md` |
| Custom shaders / materials, particle & visual effects | `references/shaders-and-vfx.md` |
| HUD/menus, `HologyScene`, React hooks, signals, overlay CSS | `references/ui-and-react.md` |

Starter files to copy from: `templates/actor.ts`, `templates/component.ts`, `templates/service.ts`.

The public Hology docs do not document networking. Do not invent or rely on multiplayer APIs unless the installed `@hology/core` types/version and the project's requirements confirm them; do not treat exposed networking APIs as stable or generally supported.

## Project structure & entry point

A Hology project is a Vite + TypeScript web app. `hology.config.json` at the root declares the engine paths — keep to these conventions:

```json
{
  "dataPath": "public/data",
  "shadersPath": "src/shaders",
  "actorsPath": "src/actors",
  "componentsPath": "src/components"
}
```

Canonical layout (matches the official `starter-third-person-shooter`):

```
my-game/
├── hology.config.json              # engine paths (above)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.tsx                    # UI entry: renders <HologyScene> with game and runtime registries
│   ├── App.tsx                     # HUD / menus (React) layered over the game
│   ├── App.css
│   ├── actors/
│   │   ├── index.ts                # MUST re-export every actor (default export object) or the editor won't see them
│   │   └── *-actor.ts              # one file per actor class
│   ├── components/
│   │   ├── index.ts                # re-exports shared ActorComponents
│   │   └── *-component.ts
│   ├── services/
│   │   ├── game.ts                 # GameInstance entry point (see below)
│   │   └── player-controller.ts    # input/keybind service, other game systems & state
│   └── shaders/
│       └── index.ts                # re-exports node/TS shaders
└── public/
    ├── data/                       # engine data written by the editor — don't hand-edit
    │   ├── asset/
    │   ├── scene/
    │   └── scene-blob/
    └── assets/                     # raw model/texture/audio source files
```

- The entry point is a `@Service()` class extending **`GameInstance`** (conventionally `src/services/game.ts`), referenced by the UI via `<HologyScene gameClass={Game} .../>`. Supply the actor and shader registries there, plus the component registry when the project defines custom components. Its `async onStart()` runs when the game starts — spawn actors and wire up controllers/cameras here.
- Re-export files (`actors/index.ts`, `components/index.ts`, `shaders/index.ts`) are how the editor and runtime discover your classes. Add every new class to the matching `index.ts`.
- Prefer the editor's "Add new → Actor class" to scaffold new actors (it wires up the file + export for you).
- Run in dev with `npm run dev` (Vite, serves on http://localhost:5173).
- Reference: no single "project structure" doc page exists — the canonical example is https://github.com/hologyengine/starter-third-person-shooter (described at https://docs.hology.app/getting-started/starter-project-third-person-shooter.md).

```typescript
// src/services/game.ts — entry point
import { GameInstance, Service, World, inject } from '@hology/core/gameplay'
import { SpawnPoint } from '@hology/core/gameplay/actors'
import BallActor from '../actors/ball-actor'

@Service()
class Game extends GameInstance {
  private world = inject(World)
  async onStart() {
    const spawnPoint = this.world.findActorByType(SpawnPoint)
    const ball = await spawnPoint.spawnActor(BallActor)
  }
}
export default Game
```

## Core concepts (essentials)

### Actors — `@Actor()` + `BaseActor`
A game object with a transform (`position`, `rotation`) and a Three.js object at `this.object`. Extend `BaseActor`, decorate with `@Actor()`, re-export from `src/actors/index.ts`.

```typescript
@Actor()
class ExampleActor extends BaseActor {
  onInit() {}                        // async allowed; @Parameter values ready here
  onBeginPlay() {}                   // spawned into running game (NOT editor)
  onUpdate(deltaTime: number) {}     // per frame, before render
  onLateUpdate(deltaTime: number) {} // per frame, after all onUpdate (camera follow)
  onEndPlay() {}                     // removed / shutdown (NOT editor)
}
```

### Lifecycle (critical rules)
- **Constructor / field init**: the ONLY place to call `inject(...)` and `attach(...)`. `@Parameter` fields are still `undefined` here — don't read them.
- **`onInit`**: `@Parameter` values are now set — do setup here. Don't call `inject`/`attach` (use `this.attach` for dynamic components). `onInit`s run concurrently — don't depend on another's completion.
- **`onUpdate` order between actors is NOT guaranteed** — communicate via events/services. Camera follow → `onLateUpdate`.
- **Removal**: unsubscribe; RxJS `.pipe(takeUntil(this.disposed))` auto-unsubscribes.

### `@Parameter()` — editor-editable per-instance fields
```typescript
@Parameter() speed: number = 1
@Parameter() target: BaseActor          // reference another actor
@Parameter() prefab: PrefabOf<WeaponActor>
```
Type inferred from annotation (number/boolean/string, `THREE.Vector2/3`/`Color`/`Euler`/`Object3D`/`Material`, `AudioBuffer`, `AnimationClip`, `BaseActor`, `Prefab`). Group values with `@ParameterDefinition('stable.id')`. → `references/actors-and-components.md`

### Components — `@Component()` + `ActorComponent` + `attach()`
Reusable behaviour units attached to actors.
```typescript
@Actor()
class CharacterActor extends BaseActor {
  health = attach(HealthComponent)   // attach(Type, options?)
}
```
→ `references/actors-and-components.md`

### `MeshComponent` — visuals + physics together
Prefer this over adding raw meshes. Give it a `PhysicalShapeMesh` to also create a physics body.
```typescript
private mesh = attach(MeshComponent<PhysicalShapeMesh>, {
  object: new PhysicalShapeMesh(new SphereGeometry(0.2, 32, 32),
    new MeshStandardMaterial({ color: 0xffff00 }), new SphereCollisionShape(0.2)),
  bodyType: PhysicsBodyType.dynamic, mass: 2, friction: 1,
})
```
→ `references/actors-and-components.md` (+ physics detail in `references/physics.md`)

### Services — `@Service()` + `inject(...)`
Singletons for shared state/systems/cross-actor events. `inject` only in constructor/field init.
```typescript
@Service() class GameState { score = 0 }
@Actor() class Goal extends BaseActor { private state = inject(GameState) }
```
Built-in services: `World`, `PhysicsSystem`, `ViewController`, `AssetLoader`, `InputService`, `Navigation`, `PointerEvents`. → `references/services-world-assets.md`

### `World` — spawn / find / scene
```typescript
private world = inject(World)
const a = await this.world.spawnActor(ExampleActor, position, rotation)
const first = this.world.findActorByType(SpawnPoint)   // findActorsByType → array
this.world.removeActor(a)
this.world.directionalLight.intensity = 0.2
```
→ `references/services-world-assets.md`

### `ViewController` — camera / loop / pause
```typescript
private view = inject(ViewController)
const camera = this.view.getCamera()
this.view.onLateUpdate(target).subscribe(() => { /* camera follow */ })
this.view.paused = true   // pauses render + input
```
→ `references/services-world-assets.md`

### `AssetLoader` — load at runtime (not raw Three.js loaders)
```typescript
private assets = inject(AssetLoader)
const model = await this.assets.getModelByAssetName('MyCharacter') // { scene, animations }
this.object.add(model.scene)
```
Also `getTextureByAssetName`, `getAudioByAssetName`, `getPrefabByName`, `getModelAtPath`, `*ById`, `getAudioAtPath`, … → `references/services-world-assets.md`

### `InputService` — player input
Separates keybinds → actions → callbacks. Configure in a player-controller service; call `input.start()`.
```typescript
this.input.setKeybind(InputAction.jump, new Keybind(' '))
this.input.bindToggle(InputAction.sprint, character.movement.sprintInput.toggle)
this.input.bindDelta(InputAction.rotate, character.movement.rotationInput.rotateY)
```
`bindToggle` = on/off intents; `bindDelta` = value deltas; `AxisInput`/`ActionInput` hold readable state. → `references/input.md`

### `PhysicsSystem` — forces / collisions / raycasts
```typescript
private physics = inject(PhysicsSystem)
this.physics.beforeStep.subscribe(dt => this.physics.applyImpulse(this, impulse))
this.physics.onBeginOverlapWithActorType(this, Coin).subscribe(coin => this.world.removeActor(coin))
this.physics.updateActorTransform(this)   // after manually setting position/rotation on a body
```
Body types: `static` / `kinematic` / `dynamic`. → `references/physics.md`

## Do's and Don'ts

**Do**
- Structure the game around actors, components and services; wire everything up in `GameInstance.onStart`.
- Re-export every actor from `src/actors/index.ts` (and components/shaders similarly).
- Call `inject(...)`/`attach(...)` only in the constructor / field initializers; read `@Parameter` values only from `onInit` onward.
- Pre-allocate vectors/objects outside `onUpdate`/`beforeStep` and mutate them; use `deltaTime` to stay frame-rate independent.
- Put camera-follow code in `onLateUpdate`; build behavior trees in `onBeginPlay`.
- Unsubscribe on removal (`takeUntil(this.disposed)`).
- Use `@Parameter()` to make actors designer-tweakable instead of hard-coding.
- Give physics objects a proper collision shape via `PhysicalShapeMesh`/`addActor`.
- Open the matching `references/*.md` before implementing a topic in depth.

**Don't**
- Don't build your own render loop, camera, asset loaders, input listeners, pathfinding, or particle systems when Hology provides them.
- Don't allocate new objects every frame in `onUpdate`/`beforeStep` (GC stalls).
- Don't rely on ordering between different actors' `onUpdate`/`onInit` — communicate via events/services.
- Don't read `@Parameter` fields in the constructor (still `undefined`).
- Don't `scene.add(...)` actors manually — spawn through `World`/`SpawnPoint`.
- Don't set an actor's transform for a physics body without `physics.updateActorTransform(this)`.
- Don't expect `onBeginPlay`/`onEndPlay` to run in the editor.
- Don't invent or rely on networking/multiplayer APIs: the public docs do not document networking, so first confirm the installed `@hology/core` types/version and project requirements.

## Import cheat sheet

```typescript
import { Actor, BaseActor, Component, ActorComponent, Parameter, ParameterDefinition,
         Service, GameInstance, World, ViewController, AssetLoader,
         PhysicsSystem, PhysicsBodyType, PointerEvents, Navigation,
         AnimationState, AnimationStateMachine,
         Node, LeafNode, NodeState, SelectorNode, SequenceNode, ActionNode, WaitNode,
         RepeatNode, CharacterMoveToNode, RayTestResult, inject, attach } from '@hology/core/gameplay'
import { MeshComponent, SpawnPoint, CharacterMovementComponent, ThirdPersonCameraComponent,
         CharacterAnimationComponent, TriggerVolumeComponent, TriggerVolume } from '@hology/core/gameplay/actors'
import { InputService, Keybind, Mousebind, Wheelbind, AxisInput, ActionInput } from '@hology/core/gameplay/input'
import { NodeShaderMaterial, rgb, rgba, select, varyingAttributes, timeUniforms } from '@hology/core/shader-nodes'
import { PhysicalShapeMesh, SphereCollisionShape, BoxCollisionShape } from '@hology/core'
import * as THREE from 'three'
```

Exact subpaths can vary by version — verify against the installed `@hology/core` types when unsure.

## Key doc links

- Actors: https://docs.hology.app/gameplay/actors.md
- Services / World / ViewController / AssetLoader: https://docs.hology.app/gameplay/services.md
- Player input: https://docs.hology.app/gameplay/player-input.md
- Physics / collisions / triggers / character movement: https://docs.hology.app/gameplay/physics.md
- Animation: https://docs.hology.app/gameplay/animation.md
- Behavior trees & navigation: https://docs.hology.app/gameplay/behavior-trees.md · https://docs.hology.app/gameplay/navigation.md
- UI with React: https://docs.hology.app/user-interfaces/using-react.md
- Full worked tutorials: https://docs.hology.app/tutorials/rolling-ball-gameplay-programming.md · https://docs.hology.app/tutorials/character-ai-behavior.md
