---
name: hology-game-engine
description: Reference for building games with the Hology engine (a TypeScript/Three.js game framework). Use whenever writing or reviewing Hology gameplay code — actors, services, components, input, physics, assets, world, cameras and UI. Prefer Hology's built-in framework helpers over reimplementing engine features directly in Three.js.
---

# Hology Game Engine

Hology is a web-based 3D game engine built on top of **Three.js**. Games are written in **TypeScript** and run in the browser. It ships a 3D editor plus a gameplay framework with dependency injection, an actor/component model, physics, input, assets, animation and camera helpers.

Docs: https://docs.hology.app (append `.md` to any page URL for markdown; full index at https://docs.hology.app/llms.txt).

## The golden rule: use Hology's framework, don't rebuild it in Three.js

Hology already wraps most of what a game needs. **Do not hand-roll from scratch in Three.js what Hology provides.** Reach for the framework helper first:

| Need | Use Hology helper — NOT raw Three.js |
| --- | --- |
| A game object | `@Actor()` + `BaseActor` (not a bare `THREE.Object3D`) |
| Mesh + physics body | `MeshComponent` + `PhysicalShapeMesh` (not manual `THREE.Mesh` + external physics) |
| Loading models/textures/audio/materials | `AssetLoader` (not `GLTFLoader`/`TextureLoader`/`AudioLoader` directly) |
| The camera / render loop / pause | `ViewController` (not creating your own `PerspectiveCamera` + `requestAnimationFrame`) |
| Spawning/finding objects, directional light | `World` (not `scene.add`) |
| Keyboard/mouse/gamepad input | `InputService` (not raw `addEventListener('keydown')`) |
| Character walking/jumping | `CharacterMovementComponent` (not custom kinematics) |
| Third-person camera follow | `ThirdPersonCameraComponent` |
| Collisions, forces, raycasts | `PhysicsSystem` |
| Overlap zones | `TriggerVolumeComponent` / `TriggerVolumeActor` |
| Shared/global state & systems | `@Service()` singletons |
| Per-frame logic | actor `onUpdate`/`onLateUpdate` or `ViewController.onLateUpdate` (not your own loop) |

Raw Three.js is still fair game for **content details** — geometries, materials, `THREE.Vector3` math, `THREE.Audio` config — but the game's structure, lifecycle, loading and systems should go through Hology.

## Project structure & entry point

- Actor classes live in `src/actors/*.ts` and MUST be re-exported from `src/actors/index.ts` (default export object) or the editor won't find them.
- Services live in `src/services/*.ts`.
- The game entry point is a `@Service()` class extending **`GameInstance`** (conventionally `src/services/game.ts`). Its `async onStart()` runs when the game starts — spawn actors, wire up controllers and cameras here.
- Run in dev with `npm run dev` (Vite, serves on http://localhost:5173).

```typescript
// src/services/game.ts
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

## Actors — `@Actor()` + `BaseActor`

An actor is a game object with a transform (`position`, `rotation`) and an underlying Three.js `object` (`this.object`, an `Object3D`). Define one by extending `BaseActor` and decorating with `@Actor()`.

```typescript
import { Actor, BaseActor } from '@hology/core/gameplay'

@Actor()
class ExampleActor extends BaseActor {
  onInit() {}                        // async allowed; parameters are ready here
  onBeginPlay() {}                   // when spawned into the running game (not in editor)
  onUpdate(deltaTime: number) {}     // every frame, before render
  onLateUpdate(deltaTime: number) {} // every frame, after all onUpdate (cameras, following)
  onEndPlay() {}                     // when removed / game shuts down
}
export default ExampleActor
```

### Actor lifecycle (know what is valid in each phase)

1. **Construction** (constructor): call `inject(...)` and `attach(...)` here. Parameter properties are still `undefined` — don't read them.
2. **Deserialisation**: attached components and editor `@Parameter()` values are assigned.
3. **Initialisation** (`onInit`): parameters are now defined. Set up subscriptions/game logic. Use `this.attach(...)` for dynamic components. Do NOT call `inject`/`attach` (the free functions) here.
4. **Begin play** (`onBeginPlay`): actor spawned in the world (does not run in the editor).
5. **Update** (`onUpdate`) then **Late update** (`onLateUpdate`): per frame.
6. **End play** (`onEndPlay`) / **Removal**: dispose. Unsubscribe everything. With RxJS use `.pipe(takeUntil(this.disposed))` to auto-unsubscribe.

## Parameters — `@Parameter()` / `@ParameterDefinition()`

Expose editor-editable, per-instance fields. Types are inferred from the annotation.

```typescript
@Actor()
class Configurable extends BaseActor {
  @Parameter() speed: number = 1
  @Parameter() color: THREE.Color
  @Parameter() mesh: THREE.Object3D        // a 3D model asset instance
  @Parameter() target: BaseActor           // reference to another actor in the scene
  @Parameter() prefab: PrefabOf<WeaponActor>
}
```

Supported types include `number`, `boolean`, `string`, `THREE.Vector2/3`, `THREE.Color`, `THREE.Euler`, `THREE.Object3D`, `THREE.Material`, `AudioBuffer`, `THREE.AnimationClip`, `BaseActor`, `Prefab`/`PrefabOf<T>`.

Use `@ParameterDefinition('stable.id')` on a class to group several parameters into a structured, reusable object (supports inheritance/polymorphism and `{ abstract: true }` bases). The string id is stable scene/prefab data — don't change it on rename.

## Components — `@Component()` + `ActorComponent` + `attach()`

Components are reusable, self-contained units of behaviour attached to actors. Attach with the free `attach(Type, options?)` function (in the constructor / as a field initializer) or `this.attach(...)` during `onInit`.

```typescript
@Component()
class HealthComponent extends ActorComponent {
  @Parameter() maxHealth: number = 100
  currentHealth: number
  onInit() { this.currentHealth = this.maxHealth }   // params only valid from onInit on
  update(change: number) { this.currentHealth = Math.max(0, this.currentHealth + change) }
}

@Actor()
class CharacterActor extends BaseActor {
  health = attach(HealthComponent)
  takeHit(dmg: number) { this.health.update(-dmg) }
}
```

`@Component({ inEditor, editorOnly })`: `inEditor` (default false) runs it in the editor for visual feedback; `editorOnly` (default false) means it never runs in the game (e.g. editor-only preview meshes).

## MeshComponent — visuals + physics in one

`MeshComponent` gives an actor a rendered mesh and, when given a `PhysicalShapeMesh`, a physics body automatically. This is the standard way to give an actor a body — **prefer it over adding raw meshes to the scene**.

```typescript
import { PhysicalShapeMesh, SphereCollisionShape } from '@hology/core'
import { Actor, BaseActor, PhysicsBodyType, attach } from '@hology/core/gameplay'
import { MeshComponent } from '@hology/core/gameplay/actors'
import { SphereGeometry, MeshStandardMaterial } from 'three'

@Actor()
class BallActor extends BaseActor {
  private mesh = attach(MeshComponent<PhysicalShapeMesh>, {
    object: new PhysicalShapeMesh(
      new SphereGeometry(0.2, 50, 50),
      new MeshStandardMaterial({ color: 0xffff00 }),
      new SphereCollisionShape(0.2)),   // physics shape, separate from render geometry
    bodyType: PhysicsBodyType.dynamic,  // dynamic | kinematic | static
    mass: 2,
    friction: 1,
  })
}
```

Collision shapes: `BoxCollisionShape`, `PlaneCollisionShape`, `SphereCollisionShape`, `CylinderCollisionShape`, `CapsuleCollisionShape`, `ConvexPolyhedronCollisionShape`, `TrimeshCollisionShape`, `MeshCollisionShape`. Imported 3D models auto-generate a fitting collision shape.

## Services — `@Service()` + `inject(...)`

A service is a singleton (one instance per game) for shared state, systems and cross-actor communication. Create with `@Service()`; consume anywhere (actors, components, other services) with `inject(ServiceClass)`.

```typescript
@Service()
class GameState { score = 0 }

@Actor()
class Goal extends BaseActor {
  private gameState = inject(GameState)   // call inject only in constructor/field init
}
```

**Built-in services** (inject them, don't reimplement): `World`, `PhysicsSystem`, `ViewController`, `AssetLoader`, `InputService`.

## World

Spawns/finds actors and controls scene-wide things like directional light.

```typescript
private world = inject(World)
// spawn: type, optional THREE.Vector3 position, optional THREE.Euler rotation
const actor = await this.world.spawnActor(ExampleActor, position, rotation)
const player = this.world.findActorByType(SpawnPoint)  // first actor of a class
this.world.remove(actor)
this.world.directionalLight.intensity = 0.2            // .direction, .intensity, .position
```

`SpawnPoint` actors also expose `spawnPoint.spawnActor(Type)` as a shorthand.

## ViewController — camera, render loop, pause

Interface to the renderer. Get the active camera, hook late-update, and pause/resume.

```typescript
private view = inject(ViewController)
const camera = this.view.getCamera()
this.view.onLateUpdate(target).subscribe(() => {
  camera.position.copy(target.position).addScaledVector(target.direction, -2)
  camera.lookAt(target.position)
})
this.view.paused = true   // pauses render loop AND input; false to resume
// this.view.audioListener is the THREE.AudioListener for positional audio
```

Camera-follow logic belongs in `onLateUpdate` (runs after all `onUpdate`), not `onUpdate`.

## AssetLoader — load assets at runtime

Load by asset name (as set in editor), asset id, or file path. **Use this instead of Three.js loaders** so assets resolve through the project pipeline.

```typescript
private assets = inject(AssetLoader)
const model = await this.assets.getModelByAssetName('MyCharacter') // LoadedMesh: .scene, .animations
this.object.add(model.scene)
const tex   = await this.assets.getTextureByAssetName('Bark')       // THREE.Texture
const buf   = await this.assets.getAudioByAssetName('JumpSound')     // AudioBuffer
const prefab= await this.assets.getPrefabByName('Enemy')             // Prefab
```

Also: `getModelByAssetId`, `getModelAtPath` (`.glb/.gltf/.fbx/.obj`), `getGltfAtPath`, `getTextureByAssetId`, `getAudioByAssetId`, `getAudioAtPath`, `getMaterialByAssetId`, `getPrefabById`, `getAsset`.

## InputService — player input

Separates **keybinds** (which key) from **actions** (intent) from **effects** (callbacks). Configure in a player-controller `@Service()`; call `inputService.start()` to begin capturing.

```typescript
enum InputAction { moveForward, jump, sprint, rotate }

@Service()
class PlayerController {
  private input = inject(InputService)
  constructor() {
    this.input.setKeybind(InputAction.jump, new Keybind(' '))
    this.input.setKeybind(InputAction.moveForward, new Keybind('w'))
    this.input.setMousebind(InputAction.rotate, new Mousebind(0.01, true, 'x'))
    this.input.setWheelbind(InputAction.zoomCamera, new Wheelbind(0.0003, false))
  }
  possess(character: SomeCharacter) {
    this.input.bindToggle(InputAction.sprint, character.movement.sprintInput.toggle)
    this.input.bindDelta(InputAction.rotate, character.movement.rotationInput.rotateY)
    this.input.start()
  }
}
```

- `bindToggle(action, cb)` — boolean on/off intents (movement held, sprint).
- `bindDelta(action, cb)` — value-delta intents (mouse-driven rotation).
- `AxisInput` is a convenient holder for `horizontal`/`vertical` axis values you can read in physics/update loops.

## Physics — `PhysicsSystem`

Inject `PhysicsSystem` for forces, damping, transform sync, raycasts and collision events. Actors with a `MeshComponent`/`CharacterMovementComponent` are added automatically; otherwise use `physics.addActor(this, [shapes], options)`.

```typescript
private physics = inject(PhysicsSystem)
this.physics.beforeStep.subscribe(dt => this.physics.applyImpulse(this, impulse))
this.physics.setLinearDamping(this, 0.2)
this.physics.updateActorTransform(this)   // after manually setting position/rotation
this.physics.onCollisionWithActorType(this, Target).subscribe(other => {/* ... */})
this.physics.onBeginOverlapWithActorType(this, Coin).subscribe(coin => this.world.remove(coin))
```

Move an actor either by setting `this.position`/`this.rotation` directly (then call `physics.updateActorTransform(this)`) OR by simulating via dynamic/kinematic bodies. Collision/overlap events: `onBeginContact`, `onEndContact`, `onHasContactChanged`, `onCollisionWithActor(Type)`, `onBegin/EndOverlapWithActor(Type)`.

## Character movement & third-person camera

For walking characters, attach `CharacterMovementComponent` (kinematic controller) and `ThirdPersonCameraComponent` rather than writing custom kinematics.

```typescript
public movement = attach(CharacterMovementComponent, {
  colliderHeight: 2, colliderRadius: 0.5, maxSpeed: 3, maxSpeedSprint: 7,
  maxWalkingSlopeAngle: 70, /* rotateToMovementDirection: true */
})
private camera = attach(ThirdPersonCameraComponent, { /* fixedBehind: false */ })
```

Bind its `directionInput`, `jumpInput`, `sprintInput`, `rotationInput` via `InputService`.

## Trigger volumes

Detect entry/exit zones with `TriggerVolumeComponent` (a box) or place a `TriggerVolumeActor`; react via `PhysicsSystem` overlap events.

```typescript
private trigger = attach(TriggerVolumeComponent, { dimensions: new Vector3(1, 1, 1) })
```

## Sound, animation, prefabs, UI

- **Sound**: uses Three.js `THREE.Audio`/`PositionalAudio` with `this.view.audioListener`; load buffers via `AssetLoader.getAudioAtPath/getAudioByAssetName`. One `Audio` instance per simultaneous sound.
- **Animation**: play `THREE.AnimationClip`s from loaded models; Hology adds an animation state machine, character animation (upper/lower body masking) and root-motion helpers — prefer these over hand-built mixers.
- **Prefabs**: reusable pre-configured actor/object trees; spawn via `AssetLoader.getPrefabByName` / world spawn; reference with `Prefab`/`PrefabOf<T>` parameters.
- **UI**: it's a normal web page — build HUD/menus with React/Vue/Angular/HTML/CSS. React is the suggested stack. Don't render UI as 3D meshes unless intentionally diegetic.

## Do's and Don'ts

**Do**
- Structure the game around actors, components and services; wire everything up in `GameInstance.onStart`.
- Export every actor class from `src/actors/index.ts`.
- Call `inject(...)` and `attach(...)` only in the constructor / field initializers; read `@Parameter()` values only from `onInit` onward.
- Pre-allocate vectors/objects outside `onUpdate`/`beforeStep` and mutate them; use `deltaTime` to stay frame-rate independent.
- Put camera-follow code in `onLateUpdate`.
- Unsubscribe on removal (`takeUntil(this.disposed)`).
- Use `@Parameter()` to make actors designer-tweakable instead of hard-coding.
- Give physics objects a proper collision shape via `PhysicalShapeMesh`/`addActor`.

**Don't**
- Don't build your own render loop, camera, loaders, or input listeners when `ViewController`/`AssetLoader`/`InputService` exist.
- Don't allocate new objects every frame in `onUpdate`/`beforeStep` (GC stalls).
- Don't rely on ordering between different actors' `onUpdate`/`onInit` — communicate via events/services instead.
- Don't read `@Parameter()` fields in the constructor (still `undefined`).
- Don't `scene.add(...)` actors manually — spawn through `World`/`SpawnPoint`.
- Don't set an actor's transform for a physics body without `physics.updateActorTransform(this)`.
- Don't expect `onBeginPlay`/`onEndPlay` to run in the editor.

## Import cheat sheet

```typescript
import { Actor, BaseActor, Component, ActorComponent, Parameter, ParameterDefinition,
         Service, GameInstance, World, ViewController, AssetLoader, InputService,
         PhysicsSystem, PhysicsBodyType, inject, attach } from '@hology/core/gameplay'
import { MeshComponent, SpawnPoint, CharacterMovementComponent, ThirdPersonCameraComponent,
         TriggerVolumeComponent, TriggerVolumeActor } from '@hology/core/gameplay/actors'
import { Keybind, Mousebind, Wheelbind, AxisInput } from '@hology/core/gameplay/input'
import { PhysicalShapeMesh, SphereCollisionShape, BoxCollisionShape } from '@hology/core'
import * as THREE from 'three'
```

(Exact subpaths can vary by version — verify against the installed `@hology/core` types when unsure.)

## Key references

- Actors: https://docs.hology.app/gameplay/actors.md (+ lifecycle, parameters, components, spawning, moving)
- Services / World / ViewController / AssetLoader: https://docs.hology.app/gameplay/services.md
- Player input: https://docs.hology.app/gameplay/player-input.md
- Physics / collisions / trigger volumes / character movement: https://docs.hology.app/gameplay/physics.md
- Tutorial (full worked example): https://docs.hology.app/tutorials/rolling-ball-gameplay-programming.md
