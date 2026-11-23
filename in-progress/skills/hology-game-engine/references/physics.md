# Physics

Docs: https://docs.hology.app/gameplay/physics.md

## Adding bodies

Actors with a `MeshComponent` (given a `PhysicalShapeMesh`) or `CharacterMovementComponent` join physics automatically; otherwise add them:

```typescript
onInit() {
  this.physics.addActor(this, [new BoxCollisionShape(new Vector3(1, 1, 1))], {
    type: PhysicsBodyType.dynamic, mass: 1, friction: 1, isTrigger: false,
    continousCollisionDetection: false,  // pricier; for fast objects
    ignoreForNavMesh: false,
  })
}
```

- **`ignoreForNavMesh: true`** for anything that isn't scenery (projectiles, corpses, pickups, temporary walls); otherwise the body cuts a hole in the navmesh. `CharacterMovementComponent` sets it for its capsule.
- Hology warns above 128 colliders per body.
- New bodies join on the next physics step (see SKILL.md lifecycle).

## Body types (`PhysicsBodyType`)

- **static**: never moves (ground, walls).
- **kinematic**: moved by position or velocity; ignores forces but pushes dynamic bodies (platforms, the character controller).
- **dynamic**: fully simulated (balls, crates).
- **kinematicVelocityBased**: declared in 0.0.282 but not in the public docs. There `kinematic` maps to Rapier's position-based and this to its velocity-based kinematic body. Check the installed enum before using it.

## Collision shapes

Primitive shapes, separate from render geometry: `Box`, `Plane`, `Sphere`, `Cylinder`, `Capsule`, `ConvexPolyhedron`, `Trimesh`, `Mesh` (`…CollisionShape`). Several shapes compose one body; `.withOffset()`/`.withRotation()` position them (e.g. tree trunks).

Editor-managed model assets get a fitting shape automatically. A model loaded by path and given to `MeshComponent` silently gets **no body** (medium confidence; seen in a code-only project): call `addActor(this, [shape], { type: PhysicsBodyType.static })` in `onInit` after setting the transform.

**Shapes inside the model** ([docs](https://docs.hology.app/assets/3d-models/custom-collision-shapes.md)): prefix mesh names `USP_` sphere (cheapest), `UBX_` box, `UCX_` convex hull, `UTM_` trimesh (most expensive). They're hidden and combined into one shape. Prefer several simple shapes over a trimesh.

## Collision & overlap events

```typescript
this.physics.onCollisionWithActorType(this, Target).pipe(takeUntil(this.disposed)).subscribe(other => {})
this.physics.onBeginOverlapWithActorType(this, Coin).pipe(takeUntil(this.disposed)).subscribe(coin => {})
```

Contact: `onBeginContact`, `onEndContact`, `onHasContactChanged`, `onCollisionWithActor`, `onCollisionWithActorType`. Overlap (needs `isTrigger: true`): `on{Begin,End}OverlapWithActorType(self, Class)` and `on{Begin,End}OverlapWithActor(self, instance)`.

## Forces (dynamic bodies)

```typescript
this.physics.setLinearDamping(this, 0.2)
this.physics.setAngularDamping(this, 5)
this.physics.beforeStep.pipe(takeUntil(this.disposed)).subscribe(dt => this.physics.applyImpulse(this, impulse))
```

`applyForce` (continuous), `applyImpulse` (instant), `applyLocalForce`/`applyLocalImpulse` (body frame), `applyTorque`/`applyTorqueImpulse`.

## Ray casting

```typescript
const result = new RayTestResult()   // reuse when casting often
this.physics.rayTest(from, to, result, { excludeActor: this })
if (result.hasHit) { /* hitPoint, hitNormal, distance, actor */ }
```

`rayTestFromCamera` also exists. `RayTestOptions`: `excludeActor`, `excludeTriggers` (triggers are hit unless set), `collisionFilter`, `resolveActor`, `debug` (on by default: draws every ray when physics debug is enabled), `debugColor`, `debugLifetime`.

- Only **one** actor can be excluded; the character controller's collision group is private.
- Rays are non-solid: a collider yields separate entry and exit hits, and a ray starting inside one hits its far side. To see past a hit, re-cast from just beyond it.
- Only physics colliders are hit, not visual-only meshes.

## Trigger volumes

Place the built-in `TriggerVolume` actor in the editor (reference it via a parameter) or attach `TriggerVolumeComponent`, then use the overlap events.

```typescript
private trigger = attach(TriggerVolumeComponent, { dimensions: new Vector3(1, 1, 1) })
```

## CharacterMovementComponent + ThirdPersonCameraComponent

```typescript
@Actor()
class CharacterActor extends BaseActor {
  private mesh = attach(MeshComponent, { object: new Mesh(new CylinderGeometry(.5, .5, 2), new MeshStandardMaterial()) })
  public thirdPersonCamera = attach(ThirdPersonCameraComponent /* { fixedBehind: false } */)
  public movement = attach(CharacterMovementComponent, {
    colliderHeight: 2, colliderRadius: .5,
    maxSlopeClimbAngle: MathUtils.degToRad(70),   // radians
    autoStepMaxHeight: 0,                         // off (default); set a height to climb steps
    maxSpeed: 3, maxSpeedBackwards: 3, maxSpeedSprint: 7,
    // rotateToMovementDirection: true,  // face movement instead of camera direction
  })
}
```

Differences from the public docs (0.0.282):
- `maxWalkingSlopeAngle` doesn't exist. Use `maxSlopeClimbAngle` and `minSlopeSlideAngle`, in **radians** (default `degToRad(70)`); a copied `70` means ~4011°.
- `characterCollision` defaults to `false`: characters pass through each other, so melee enemies stack on one spot. Set `true` to make capsules block.
- Autostep is off unless `autoStepMaxHeight` is set; a 0.5 m stair riser blocks the character.
- `horizontalSpeed` reflects input, not displacement: pushing into a wall still reports speed. For animation, measure position change in `physics.afterStep`. Medium confidence.
- To reposition, the project used `movement.teleport(position, yaw)` rather than `position` + `updateActorTransform`. Low confidence: the other path wasn't seen to fail.

Inputs (bind them as in `input.md`): `directionInput.toggle{Positive,Negative}{X,Y}` (WASD), `jumpInput.toggle`, `sprintInput.toggle`, `rotationInput.rotateY`. The camera has `rotationInput.rotateX` (pitch), `rotationInput.rotateY` and `zoomInput.increment`. With `fixedBehind: false` the camera doesn't follow the character's rotation, so send the same delta to both:

```typescript
this.input.bindDelta(InputAction.rotate, delta => {
  character.movement.rotationInput.rotateY(delta)
  character.thirdPersonCamera.rotationInput.rotateY(delta)
})
```

AI-driven movement: `CharacterMoveToNode` (`ai-and-navigation.md`).
