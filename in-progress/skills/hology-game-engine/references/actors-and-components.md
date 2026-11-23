# Actors & Components

Docs: https://docs.hology.app/gameplay/actors.md. The actor skeleton and lifecycle rules are in SKILL.md.

**Reserved members.** `BaseActor` already defines `id`, `object`, `position`, `rotation`, `disposed` and more. A subclass field with one of those names breaks typecheck and, at runtime, overwrites the engine's value (e.g. the actor id). Check `base-actor.d.ts` before adding fields with generic names.

## Lifecycle phases

1. **Construction**: `inject`/`attach`; `@Parameter` fields undefined.
2. **Deserialisation**: attached components and editor `@Parameter` values are assigned.
3. **`onInit`** (may be `async`): subscriptions and setup; `this.attach(...)` for dynamic components; no free `inject`/`attach`.
4. **`onBeginPlay`**: gameplay-only start (behavior trees, timers). Not in the editor.
5. **`onUpdate`** then **`onLateUpdate`**, once per frame.
6. **`onEndPlay`** / removal: unsubscribe everything.

## Parameters — `@Parameter()`

Type is inferred from the annotation. Supported: `number`, `boolean`, `string`, `THREE.Vector2/3`, `Color`, `Euler`, `Object3D` (a model asset instance), `Material`, `AudioBuffer`, `AnimationClip`, `BaseActor` (or a subclass, to restrict the pick), `Prefab`, `PrefabOf<T>`.

Options ([docs](https://docs.hology.app/gameplay/actors/actor-parameters.md)): `label`, `help` (tooltip), `range: [min, max]` (slider), `stepSize`, `precision`, `optional` (checkbox enabling the value), `requires: { otherProp: value }` (show only when another property matches).

```typescript
@Parameter({ label: 'Movement Speed', range: [0, 100], stepSize: 1 })
speed: number = 10

@Parameter() canJump: boolean = false
@Parameter({ requires: { canJump: true } })
jumpHeight: number = 2
```

### `@ParameterDefinition()` — structured parameter objects

Groups values into a reusable, optionally polymorphic object. The string id is stable scene/prefab data; keep it when renaming the class.

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
  @Parameter() attack: AttackDefinition = new AttackDefinition() // designer can pick a subclass
}
```

- `@ParameterDefinition('id', { abstract: true })` forces the designer to pick a concrete subclass.
- Arrays: `@Parameter({ type: () => AbilityDefinition, array: true }) abilities: AbilityDefinition[] = []`; each item can be a different subclass.
- Class names become editor labels (`MagicAttackDefinition` → "Magic Attack").

## Components — `@Component()` + `ActorComponent`

Attach with the free `attach(Type, options?)` at field init, or `this.attach(...)` from `onInit`. See `templates/component.ts`.

`@Component({ inEditor, editorOnly })`, both default `false`:
- **inEditor**: also runs in the editor, for visual feedback only; disable gameplay logic there.
- **editorOnly**: runs only in the editor (e.g. preview meshes).

## MeshComponent

Given a `PhysicalShapeMesh` (collision shape independent of render geometry), it also creates a physics body; a plain `THREE.Mesh` is visual-only. Shapes and body types: `physics.md`.

## Moving actors

- **Direct transform**: set `this.position`/`this.rotation`, then `physics.updateActorTransform(this)` to sync the body.
- **Dynamic body**: forces, impulses or velocity; responds to gravity and collisions.
- **Kinematic body**: explicit position or velocity; ignores forces but pushes dynamic bodies.

```typescript
onUpdate(deltaTime: number) {
  this.position.addScaledVector(this.direction, this.speed * deltaTime)
  this.physics.updateActorTransform(this)
}
```

## Prefabs

A reusable tree of objects/actors authored in the editor (group → "Convert to a prefab", or create empty in the asset browser; edits propagate to every use). Prefer prefabs over rebuilding the same object graph.

```typescript
// Generic Prefab: AssetLoader.getPrefabByName / getPrefabById
const prefab = await this.assetLoader.getPrefabByName('village-house')
const instance: PrefabInstance = await this.world.spawnPrefab(prefab, position, rotation)
this.world.removePrefab(instance)

// PrefabOf<T>: an editor parameter restricted to prefabs whose main actor is T; spawns as T
@Parameter() weaponPrefab: PrefabOf<WeaponActor>
const weapon: WeaponActor = await this.world.spawnActor(this.weaponPrefab, position, rotation)
this.world.removeActor(weapon)
```
