# AI, Navigation & Behavior Trees (deep reference)

Covers the `Navigation` service + navmeshes and the behavior-tree system. Read this when building NPC/enemy AI. Use Hology's built-in navmesh and behavior-tree nodes rather than writing pathfinding or a decision system from scratch.

## Navigation & navmeshes

Add a **NavMesh** actor to the scene (asset browser → Actors → NavMesh). This actor is the bounding volume used for generation: position and scale its box to cover the intended walkable landscape and relevant obstacles. Once configured, the navmesh generates automatically; then inject the `Navigation` service to query it. See the [character AI tutorial](https://docs.hology.app/tutorials/character-ai-behavior.md) for the editor setup details.

```typescript
private navigation = inject(Navigation)

onUpdate(dt: number) {
  const player = this.world.findActorByType(Character)
  const { success, path } = this.navigation.findPath(this.position, player.position)
  if (success) {
    const dir = path[1].clone().sub(this.position).normalize()
    this.position.addScaledVector(dir, dt * this.movementSpeed)
  }
}
```

Key methods:
- **`findPath(from, to)`** → `{ success: boolean, path: Vector3[] }` — `path[0]` is the start; steer toward `path[1]`.
- **`findClosestPoint(point)`** → `Vector3 | null` — nearest point on the navmesh (may be `null` while the mesh is still generating — handle it).

## Behavior trees

A behavior tree is a hierarchy of `Node`s that each return a `NodeState`: `SUCCESS`, `FAILURE`, or `RUNNING`. Build the tree in `onBeginPlay` (gameplay only, not the editor) and `tick(deltaTime)` the root every frame.

```typescript
onBeginPlay() { this.behaviorTree = this.createBehaviorTree() }
onUpdate(dt: number) { this.behaviorTree?.tick(dt) }
```

### Built-in nodes

**Composite** (manage children): `SequenceNode` (all must succeed, stops on first failure), `SelectorNode` (first success wins, tries next on failure), `ParallelSequenceNode`, `ParallelSelectorNode`, `WeightedRandomSelectorNode`.

**Decorator** (wrap one child): `InverterNode`, `RepeatNode` (loop forever — typical root), `RepeatTimesNode`, `RepeatUntilNode`, `RepeatUntilFailNode`, `GuardNode`, `CooldownNode`, `TimerNode`, `DelayNode`, `ThrottleNode`.

**Leaf** (actions/checks): `ActionNode(fn => NodeState)`, `ConditionNode(fn => boolean)`, `WaitNode(min, max?)` (Running for a duration/random range in ms), `SuccessNode`, `FailNode`. Movement leaf: `CharacterMoveToNode`.

```typescript
import { SelectorNode, SequenceNode, ActionNode, WaitNode, RepeatNode, NodeState } from '@hology/core/gameplay'

const attack = new ActionNode(() => { /* ... */ return NodeState.SUCCESS })
const patrol = new SequenceNode()
patrol.addChild(new ActionNode(() => NodeState.SUCCESS))
patrol.addChild(new WaitNode(1000))

const root = new SelectorNode()
root.addChild(attack)   // try attack; if it FAILS, fall through to patrol
root.addChild(patrol)
this.behaviorTree = new RepeatNode(root)   // keep the AI running
```

### Custom nodes

Extend `LeafNode` (or `DecoratorNode`) and implement `tick(dt): NodeState`. A common pattern: a node computes a value and stores it on a public field that a later node reads.

```typescript
class CheckHealthNode extends LeafNode {
  constructor(private character: Character, private threshold: number) { super() }
  tick(): NodeState {
    return this.character.health < this.threshold ? NodeState.SUCCESS : NodeState.FAILURE
  }
}
```

## CharacterMoveToNode — navmesh movement in a tree

Moves a character (via its `CharacterMovementComponent`) toward a target returned by a function, using the navmesh. Pair it with a node that finds the destination.

```typescript
const findPatrol = new FindPatrolPositionNode(this.navigation, this.position, this.position)
const moveToPatrol = new CharacterMoveToNode(this.navigation, this.movement)
moveToPatrol.target = () => findPatrol.foundPosition   // target is a function returning Vector3 | null

const patrol = new SequenceNode()
patrol.addChild(findPatrol)
patrol.addChild(moveToPatrol)
patrol.addChild(new WaitNode(300, 3000))
```

## Typical chasing-AI pattern

Subclass your player `Character` actor to reuse its model/movement/animation setup, then add AI on top:

```typescript
@Actor()
class AICharacter extends Character {
  protected override modelName = 'character-orc'
  private navigation = inject(Navigation)
  private world = inject(World)
  private behaviorTree?: Node

  async onInit() { await super.onInit() }
  onBeginPlay() { this.behaviorTree = this.createBehaviorTree() }
  onUpdate(dt: number) { this.behaviorTree?.tick(dt) }

  private createBehaviorTree() {
    // chasePlayer sequence: FindPlayerNode (SUCCESS if player within range) -> CharacterMoveToNode
    // patrol sequence: FindPatrolPositionNode -> CharacterMoveToNode -> WaitNode
    const selector = new SelectorNode()
    selector.addChild(chasePlayer)   // preferred; FAILS when no player nearby
    selector.addChild(patrol)        // fallback
    return new RepeatNode(selector)
  }
}
```

Find the player with `world.findActorsByType(Character).filter(c => !(c instanceof AICharacter))` and a distance check; return `FAILURE` when not found so the selector falls back to patrol. Full worked example: the AI tutorial (`hologyengine/ai-tutorial`).

## Imports

```typescript
import { Navigation, Node, LeafNode, NodeState, SelectorNode, SequenceNode,
         ActionNode, ConditionNode, WaitNode, RepeatNode, RepeatUntilNode,
         CharacterMoveToNode, inject, attach } from '@hology/core/gameplay'
```
