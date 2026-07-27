# Physics (deep reference)

Covers `PhysicsSystem`, body types, collision shapes, collision/overlap events, forces, ray casting, trigger volumes, and `CharacterMovementComponent`. Read this for anything involving movement by simulation, collisions, or hit detection.

## PhysicsSystem

Inject it for forces, damping, transform sync, raycasts, and collision events. Actors with a `MeshComponent` (given a `PhysicalShapeMesh`) or `CharacterMovementComponent` are added to physics automatically; otherwise add them yourself:

```typescript
private physics = inject(PhysicsSystem)

onInit() {
  this.physics.addActor(this, [new BoxCollisionShape(1, 1, 1)], {
    isTrigger: false,
    mass: 1,
    friction: 1,
    continousCollisionDetection: false,  // pricier; better for fast objects
    type: PhysicsBodyType.dynamic,
  })
}
```

## Body types (`PhysicsBodyType`)

- **static** — never moves; unaffected by forces/collisions (ground, walls, platforms). Can be collided with.
- **kinematic** — moved explicitly by setting position/velocity; unaffected by forces but pushes dynamic bodies (moving platforms, elevators, the built-in character controller).
- **dynamic** — fully simulated: responds to forces, impulses, gravity, collisions (balls, crates, props).

## Collision shapes

Physics uses primitive shapes, separate from render geometry. Imported models auto-generate a fitting shape; supply one manually via `PhysicalShapeMesh` (see `actors-and-components.md`) or `addActor`:

`BoxCollisionShape`, `PlaneCollisionShape`, `SphereCollisionShape`, `CylinderCollisionShape`, `CapsuleCollisionShape`, `ConvexPolyhedronCollisionShape`, `TrimeshCollisionShape`, `MeshCollisionShape`. Multiple shapes per actor compose a complex body.

## Collision & overlap events

Subscribe on the physics system (RxJS observables). Use `takeUntil(this.disposed)` to auto-unsubscribe.

```typescript
onInit() {
  this.physics.onCollisionWithActorType(this, Target).subscribe(other => { /* score++ */ })
  this.physics.onBeginOverlapWithActorType(this, Coin).subscribe(coin => this.world.removeActor(coin))
}
```

Events: `onBeginContact`, `onEndContact`, `onHasContactChanged`, `onCollisionWithActor`, `onCollisionWithActorType`, `onBeginOverlapWithActor(Type)`, `onEndOverlapWithActor(Type)`. Overlap events require a trigger body (`isTrigger: true`).

## Applying forces (dynamic bodies)

Subscribe to `physics.beforeStep` for per-physics-step logic; pre-allocate vectors to avoid GC.

```typescript
this.physics.setLinearDamping(this, 0.2)
this.physics.setAngularDamping(this, 5)
this.physics.beforeStep.subscribe(dt => this.physics.applyImpulse(this, impulse))
```

Methods: `applyForce` (continuous, global), `applyImpulse` (instant, global), `applyLocalForce` / `applyLocalImpulse` (in the body's local frame), `applyTorque` / `applyTorqueImpulse` (rotational). Also `updateActorTransform(this)` after manually setting transform on a physics body.

## Ray casting

```typescript
const result = new RayTestResult()
this.physics.rayTest(new Vector3(0,0,0), new Vector3(0,0,100), result, { excludeActor: this })
if (result.hasHit) { /* result.hitPoint, result.hitNormal, result.distance, result.actor */ }
```

Reuse one `RayTestResult` when casting frequently. `RayTestOptions`: `excludeActor`, `debugColor`, `debugLifetime`. Use for line-of-sight, shooting, ground checks, etc.

## Trigger volumes

Detect entry/exit zones. Either place the built-in `TriggerVolume` actor in the editor (reference it via a parameter) or attach a `TriggerVolumeComponent` (a box). React via the physics overlap events above.

```typescript
@Actor()
class Coin extends BaseActor {
  private trigger = attach(TriggerVolumeComponent, { dimensions: new Vector3(1, 1, 1) })
}
```

## CharacterMovementComponent (+ ThirdPersonCameraComponent)

Built-in kinematic character controller — use it for walking/running/jumping instead of hand-rolling kinematics.

```typescript
@Actor()
class CharacterActor extends BaseActor {
  private mesh = attach(MeshComponent, {
    object: new Mesh(new CylinderGeometry(.5, .5, 2), new MeshStandardMaterial({ color: 0xffffff }))
  })
  private thirdPersonCamera = attach(ThirdPersonCameraComponent /* { fixedBehind: false } */)
  public movement = attach(CharacterMovementComponent, {
    autoStepMaxHeight: 0, colliderHeight: 2, colliderRadius: .5,
    maxWalkingSlopeAngle: 70, maxSpeed: 3, maxSpeedBackwards: 3, maxSpeedSprint: 7,
    // rotateToMovementDirection: true,  // face movement dir instead of camera dir
  })
}
```

Control it by binding its inputs (see `input.md`):
- **directionInput** — `togglePositiveY/negativeY/positiveX/negativeX` for WASD movement.
- **jumpInput** — `.toggle`.
- **sprintInput** — `.toggle`.
- **rotationInput** — `.rotateY` (turn), plus camera rotation when `fixedBehind: false`.

For AI-driven movement toward a navmesh target, use `CharacterMoveToNode` with this component (see `ai-and-navigation.md`).

## Imports

```typescript
import { PhysicsSystem, PhysicsBodyType, RayTestResult, inject, attach } from '@hology/core/gameplay'
import { MeshComponent, CharacterMovementComponent, ThirdPersonCameraComponent,
         TriggerVolumeComponent, TriggerVolume } from '@hology/core/gameplay/actors'
import { PhysicalShapeMesh, BoxCollisionShape, SphereCollisionShape } from '@hology/core'
```
