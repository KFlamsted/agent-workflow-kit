# AI, Navigation & Behavior Trees

Docs: https://docs.hology.app/gameplay/navigation.md · https://docs.hology.app/gameplay/behavior-trees.md · [character AI tutorial](https://docs.hology.app/tutorials/character-ai-behavior.md)

## Navigation

Add a **NavMesh** actor (asset browser → Actors → NavMesh) and scale its box over the walkable area and obstacles. It generates automatically, subject to the rules below; query it with the `Navigation` service.

```typescript
const { success, path } = this.navigation.findPath(this.position, player.position)
if (success && path.length >= 2) {   // path[0] is the start, path[1] the next waypoint
  const dir = path[1].clone().sub(this.position).normalize()
  this.position.addScaledVector(dir, dt * this.movementSpeed)
}
const p = this.navigation.findClosestPoint(point)   // Vector3 | null (null while generating)
```

### Navmesh in practice (0.0.282)

1. **Keep each side of the volume ≥ 70 m.** Tile size is `min(400, max(50, ceil(min(w, d) / 2)))` m with a hard-coded `maxTiles`; a volume that fits in one tile never answers `findPath`/`findClosestPoint` (`findRandomPoint` still works). 40×40 m failed, 70×70 m works. Applies to editor-placed volumes too.
2. **Register the task worker.** Call `registerWorker` with a worker module that calls `initWorker()` (both from `@hology/core/worker`). Without it, tiles build on the main thread in `requestIdleCallback` with no timeout; a busy page starved it to 43 s, 151 s or never. With the worker: 2.9 s under 4× CPU throttling. If Vite then answers with a one-time "Outdated Optimize Dep" 504, restart the dev server.
3. **Spawn the navmesh after the first physics step.** Colliders join on the next step; a navmesh generated earlier misses every prop until the engine's 4 s refresh. Wait for one `physics.afterStep`.
4. **Gate AI on readiness.** `findPath` fails silently (log only) until generation finishes, typically 0.3–0.8 s after spawn. Poll `findPath` until it succeeds before starting AI.
5. **Exclude non-scenery bodies** with `ignoreForNavMesh: true` (`physics.md`).
6. **Paths float** 0.2–0.6 m above the collider top; move in XZ.
7. **Step height.** The default `walkableClimb` (≈0.3 m effective) dropped a 31° ramp despite the 45° slope limit; raise it (0.4 m worked).
8. **Only the most recently added navmesh is used.** Debug drawing is on by default.

**Without the editor**, the `NavMesh` class isn't exported and registry ids are minified. Find it in `getRegisteredActorClasses()` via `'initDynamic' in cls.prototype`, spawn it with `world.spawnActor`, then set `actor.object.position/scale` to the volume (bounds are re-checked every 2 s). Runtime-spawned static colliders, including trimesh terrain, are included.

## Behavior trees

A tree of `Node`s, each returning `NodeState.SUCCESS`, `FAILURE` or `RUNNING`. Build it in `onBeginPlay` and `tick(dt)` the root in `onUpdate`.

- **Composite**: `SequenceNode` (in order; stops on first failure, propagates `RUNNING`), `SelectorNode` (first success wins), `ParallelSequenceNode`, `ParallelSelectorNode`, `WeightedRandomSelectorNode`.
- **Decorator**: `InverterNode`, `RepeatNode` (forever; typical root), `RepeatTimesNode`, `RepeatUntilNode`, `RepeatUntilFailNode`, `GuardNode`, `CooldownNode`, `TimerNode`, `DelayNode`, `ThrottleNode`.
- **Leaf**: `ActionNode(() => NodeState)`, `ConditionNode(() => boolean)`, `WaitNode(minMs, maxMs?)`, `SuccessNode`, `FailNode`, `CharacterMoveToNode`.
- **Custom**: extend `LeafNode` or `DecoratorNode` and implement `tick(dt): NodeState`. A node can store a result on a public field for a later node to read.

```typescript
const attack = new ActionNode(() => {
  if (!canAttackTarget()) return NodeState.FAILURE
  attackTarget()
  return NodeState.SUCCESS
})

// CharacterMoveToNode drives a CharacterMovementComponent along the navmesh
const findPatrol = new FindPatrolPositionNode(this.navigation, this.position, this.position) // custom LeafNode
const moveToPatrol = new CharacterMoveToNode(this.navigation, this.movement)
moveToPatrol.target = () => findPatrol.foundPosition   // function returning Vector3 | null

const patrol = new SequenceNode()
patrol.addChild(findPatrol)
patrol.addChild(moveToPatrol)
patrol.addChild(new WaitNode(300, 3000))

const root = new SelectorNode()
root.addChild(attack)   // falls through to patrol on FAILURE
root.addChild(patrol)
this.behaviorTree = new RepeatNode(root)
```

## Chasing-AI pattern

Subclass the player `Character` actor to reuse its model, movement and animation, set e.g. `protected override modelName = 'character-orc'`, and build `RepeatNode(Selector[chasePlayer, patrol])`. `chasePlayer` = a find-player node (`world.findActorsByType(Character).filter(c => !(c instanceof AICharacter))` plus a range check; `FAILURE` when none) → `CharacterMoveToNode`. Full example: `hologyengine/ai-tutorial`.
