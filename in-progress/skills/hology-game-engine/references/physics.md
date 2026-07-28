# Physics (deep reference)

Covers `PhysicsSystem`, body types, collision shapes, collision/overlap events, forces, ray casting, trigger volumes, and `CharacterMovementComponent`. Read this for anything involving movement by simulation, collisions, or hit detection.

## PhysicsSystem

Inject it for forces, damping, transform sync, raycasts, and collision events. Actors with a `MeshComponent` (given a `PhysicalShapeMesh`) or `CharacterMovementComponent` are added to physics automatically; otherwise add them yourself:

```typescript
private physics = inject(PhysicsSystem)

onInit() {
  this.physics.addActor(this, [new BoxCollisionShape(new Vector3(1, 1, 1))], {
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
- **kinematic** — moved explicitly through position or velocity; unaffected by forces and impulses but can affect dynamic bodies through collisions (moving platforms, elevators, the built-in character controller).
- **dynamic** — fully simulated: responds to forces, impulses, gravity, collisions (balls, crates, props).

Those are the three types presented in the public Hology physics documentation. **`@hology/core@0.0.232` version note:** that package's enum also declares **`kinematicVelocityBased`**. In that package version, `kinematic` maps to Rapier's position-based kinematic body and `kinematicVelocityBased` maps to Rapier's velocity-based kinematic body. Both are explicitly controlled kinematic bodies rather than force-driven bodies. Before using the fourth value in an existing project, inspect that project's installed `PhysicsBodyType` enum; it is absent from the public three-type model and may vary by package version.

## Collision shapes

Physics uses primitive shapes, separate from render geometry. Imported models auto-generate a fitting shape; supply one manually via `PhysicalShapeMesh` (see `actors-and-components.md`) or `addActor`:

`BoxCollisionShape`, `PlaneCollisionShape`, `SphereCollisionShape`, `CylinderCollisionShape`, `CapsuleCollisionShape`, `ConvexPolyhedronCollisionShape`, `TrimeshCollisionShape`, `MeshCollisionShape`. Multiple shapes per actor compose a complex body.

## Collision & overlap events

Subscribe on the physics system (RxJS observables). Use `takeUntil(this.disposed)` to auto-unsubscribe.

```typescript
onInit() {
  this.physics.onCollisionWithActorType(this, Target)
    .pipe(takeUntil(this.disposed))
    .subscribe(other => { /* score++ */ })
  this.physics.onBeginOverlapWithActorType(this, Coin)
    .pipe(takeUntil(this.disposed))
    .subscribe(coin => this.world.removeActor(coin))
}
```

Events: `onBeginContact`, `onEndContact`, `onHasContactChanged`, `onCollisionWithActor`, and `onCollisionWithActorType`. The four overlap subscription APIs are:

- `onBeginOverlapWithActorType(self, ActorClass)`
- `onEndOverlapWithActorType(self, ActorClass)`
- `onBeginOverlapWithActor(self, actorInstance)`
- `onEndOverlapWithActor(self, actorInstance)`

The `ActorType` variants filter by actor class; the `Actor` variants target one specific actor instance. Overlap events require a trigger body (`isTrigger: true`).

## Applying forces (dynamic bodies)

Subscribe to `physics.beforeStep` for per-physics-step logic; pre-allocate vectors to avoid GC.

```typescript
this.physics.setLinearDamping(this, 0.2)
this.physics.setAngularDamping(this, 5)
this.physics.beforeStep
  .pipe(takeUntil(this.disposed))
  .subscribe(dt => this.physics.applyImpulse(this, impulse))
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
  public thirdPersonCamera = attach(ThirdPersonCameraComponent /* { fixedBehind: false } */)
  public movement = attach(CharacterMovementComponent, {
    autoStepMaxHeight: 0, colliderHeight: 2, colliderRadius: .5,
    maxWalkingSlopeAngle: 70, maxSpeed: 3, maxSpeedBackwards: 3, maxSpeedSprint: 7,
    // rotateToMovementDirection: true,  // face movement dir instead of camera dir
  })
}
```

`maxWalkingSlopeAngle` is the option shown in the public character-movement documentation. When targeting a specific Hology release, verify the installed `CharacterMovementComponent` option declarations if that name is unavailable.

Control it by binding its inputs (see `input.md`):
- **directionInput** — `togglePositiveY/negativeY/positiveX/negativeX` for WASD movement.
- **jumpInput** — `.toggle`.
- **sprintInput** — `.toggle`.
- **rotationInput** — `movement.rotationInput.rotateY` rotates the character. A camera configured with `fixedBehind: false` does not rotate automatically; rotate it through its own `thirdPersonCamera.rotationInput.rotateY` input.

For a freely rotating third-person camera (`fixedBehind: false`), expose the camera component on the character as shown above and send the same input delta to both components:

```typescript
this.input.bindDelta(InputAction.rotate, delta => {
  character.movement.rotationInput.rotateY(delta)
  character.thirdPersonCamera.rotationInput.rotateY(delta)
})
```

For AI-driven movement toward a navmesh target, use `CharacterMoveToNode` with this component (see `ai-and-navigation.md`).

## Imports

```typescript
import { PhysicsSystem, PhysicsBodyType, RayTestResult, inject, attach } from '@hology/core/gameplay'
import { MeshComponent, CharacterMovementComponent, ThirdPersonCameraComponent,
         TriggerVolumeComponent, TriggerVolume } from '@hology/core/gameplay/actors'
import { PhysicalShapeMesh, BoxCollisionShape, SphereCollisionShape } from '@hology/core'
import { takeUntil } from 'rxjs'
import { Vector3 } from 'three'
```
