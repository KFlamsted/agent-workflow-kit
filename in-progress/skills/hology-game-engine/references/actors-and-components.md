# Actors & Components (deep reference)

Covers `@Actor()`/`BaseActor`, the actor lifecycle, `@Parameter()`, `@Component()`/`ActorComponent`, `MeshComponent`, spawning, moving, and prefabs. Read this when writing actor/component classes or dealing with lifecycle/parameter bugs.

## Actors — `@Actor()` + `BaseActor`

An actor is a game object with a transform (`position`, `rotation`) and an underlying Three.js object at `this.object` (an `Object3D`). Define one by extending `BaseActor` and decorating with `@Actor()`. Re-export it from `src/actors/index.ts` or the editor won't see it.

```typescript
import { Actor, BaseActor } from '@hology/core/gameplay'

@Actor()
class ExampleActor extends BaseActor {
  onInit() {}                        // async allowed; @Parameter values are ready here
  onBeginPlay() {}                   // when spawned into the running game (NOT in editor)
  onUpdate(deltaTime: number) {}     // every frame, before render
  onLateUpdate(deltaTime: number) {} // every frame, after all onUpdate (cameras, following)
  onEndPlay() {}                     // when removed / game shuts down (NOT in editor)
}
export default ExampleActor
```

## Lifecycle (what is valid in each phase)

1. **Construction** (constructor / field initializers): call `inject(...)` and `attach(...)` here. `@Parameter` fields are still `undefined` — do NOT read them.
2. **Deserialisation**: attached components and editor `@Parameter` values are assigned.
3. **Initialisation** (`onInit`, may be `async`): parameters are now defined. Set up subscriptions / game logic. Use `this.attach(...)` for dynamic components. Do NOT call the free `inject`/`attach` functions here. `onInit` methods across components run concurrently — don't depend on another component's `onInit` having finished.
4. **Begin play** (`onBeginPlay`): actor spawned into the world. Does not run in the editor. Start gameplay-only logic (behavior trees, timers) here.
5. **Update** (`onUpdate`) then **Late update** (`onLateUpdate`): once per frame. Order between different actors is NOT guaranteed — communicate via events/services, not update ordering. Camera-follow logic goes in `onLateUpdate`.
6. **End play** (`onEndPlay`) / **Removal**: dispose. Unsubscribe everything. With RxJS use `.pipe(takeUntil(this.disposed))` to auto-unsubscribe on removal.

## Parameters — `@Parameter()`

Per-instance, editor-editable fields. Type is inferred from the annotation.

```typescript
@Actor()
class Configurable extends BaseActor {
  @Parameter() speed: number = 1
  @Parameter() color: THREE.Color
  @Parameter() mesh: THREE.Object3D        // a 3D model asset instance
  @Parameter() material: THREE.Material
  @Parameter() audio: AudioBuffer
  @Parameter() clip: THREE.AnimationClip
  @Parameter() target: BaseActor           // reference to another actor (or a subclass to restrict)
  @Parameter() prefab: Prefab
  @Parameter() specificPrefab: PrefabOf<WeaponActor>
}
```

Supported types: `number`, `boolean`, `string`, `THREE.Vector2/3`, `THREE.Color`, `THREE.Euler`, `THREE.Object3D`, `THREE.Material`, `AudioBuffer`, `THREE.AnimationClip`, `BaseActor`, `Prefab`, `PrefabOf<T>`.

### `@ParameterDefinition()` — structured parameter objects

Group several values into a reusable, optionally-polymorphic object. The string id is stable scene/prefab data — don't change it on rename.

```typescript
@ParameterDefinition('combat.attack')
class AttackDefinition {
  @Parameter() damage: number = 10
  apply(target: BaseActor) {}
}

@ParameterDefinition('combat.magicAttack')
class MagicAttackDefinition extends AttackDefinition {
  @Parameter() manaCost: number = 5
  override apply(target: BaseActor) {}
}

@Actor()
class WeaponActor extends BaseActor {
  @Parameter() attack: AttackDefinition = new AttackDefinition() // editor lets designer pick a subclass
}
```

Mark a base as `@ParameterDefinition('id', { abstract: true })` when it should only exist to define a shared shape (designer must pick a concrete subclass). Definitions also work in arrays. Class names become editor labels (`MagicAttackDefinition` → "Magic Attack").

## Components — `@Component()` + `ActorComponent` + `attach()`

Reusable, self-contained units of behaviour attached to actors. Attach with the free `attach(Type, options?)` (constructor / field initializer) or `this.attach(...)` from `onInit`.

```typescript
@Component()
class HealthComponent extends ActorComponent {
  @Parameter() maxHealth: number = 100
  currentHealth: number
  onInit() { this.currentHealth = this.maxHealth }  // params only valid from onInit onward
  update(change: number) { this.currentHealth = Math.max(0, this.currentHealth + change) }
}

@Actor()
class CharacterActor extends BaseActor {
  health = attach(HealthComponent)
  takeHit(dmg: number) { this.health.update(-dmg) }
}
```

`@Component({ inEditor, editorOnly })`:
- **inEditor** (default `false`): also runs in the editor, for visual feedback only — disable gameplay logic in the editor.
- **editorOnly** (default `false`): runs only in the editor, never in the game (e.g. preview meshes).

## MeshComponent — visuals + physics together

`MeshComponent` gives an actor a rendered mesh and, when given a `PhysicalShapeMesh`, a physics body automatically. Prefer it over adding raw meshes to the scene.

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
      new SphereCollisionShape(0.2)),   // physics shape, independent of render geometry
    bodyType: PhysicsBodyType.dynamic,
    mass: 2,
    friction: 1,
  })
}
```

Pass a plain `THREE.Mesh` as `object` for a visual-only mesh with no physics body. See `physics.md` for collision shapes and body types.

## Spawning actors

Inject `World` (or use a `SpawnPoint`) and call `spawnActor`.

```typescript
const actor = await this.world.spawnActor(ExampleActor, position /* Vector3 */, rotation /* Euler */)
const spawnPoint = this.world.findActorByType(SpawnPoint)
const ball = await spawnPoint.spawnActor(BallActor) // shorthand using the spawn point's transform
```

## Moving actors

Three approaches:
- **Direct transform**: set `this.position` / `this.rotation`. This updates the rendered object but NOT the physics world — call `physics.updateActorTransform(this)` afterwards to sync the body.
- **Dynamic physics body**: drive simulated motion with forces or impulses; velocity control can also be appropriate. Dynamic bodies respond to gravity and collisions.
- **Kinematic physics body**: control movement explicitly through position or velocity. Kinematic bodies ignore forces and impulses but can push dynamic bodies. See `physics.md` for the version-specific kinematic body values.

```typescript
onUpdate(deltaTime: number) {
  this.position.addScaledVector(this.direction, this.speed * deltaTime)
  this.physics.updateActorTransform(this)
}
```

## Prefabs

A prefab is a reusable, preconfigured tree of objects/actors authored in the editor (group → "Convert to a prefab", or create empty from the asset browser; edit in the prefab editor, changes propagate everywhere it's used). Prefer prefabs over rebuilding the same object graph repeatedly.

`AssetLoader.getPrefabByName()` and `AssetLoader.getPrefabById()` load generic `Prefab` assets. Spawn one with `world.spawnPrefab(prefab, position?, rotation?)`; it resolves to a `PrefabInstance`, which is removed with `world.removePrefab(instance)`.

```typescript
const genericPrefab: Prefab = await this.assetLoader.getPrefabByName('village-house')
const prefabInstance: PrefabInstance = await this.world.spawnPrefab(genericPrefab, position, rotation)

this.world.removePrefab(prefabInstance)
```

`PrefabOf<T>` is primarily used as an editor parameter on an actor instance. It restricts selection to a prefab whose main actor is `T` or a subclass of `T`. Spawn it with `world.spawnActor(prefab, position?, rotation?)`; it resolves directly to an actor typed as `T`, which is removed with `world.removeActor(actor)`.

```typescript
@Parameter()
weaponPrefab: PrefabOf<WeaponActor>

async spawnWeapon() {
  const weaponActor: WeaponActor = await this.world.spawnActor(this.weaponPrefab, position, rotation)

  this.world.removeActor(weaponActor)
}
```
