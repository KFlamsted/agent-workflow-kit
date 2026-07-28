// Template: a Hology actor with a mesh + physics body and player-driven movement.
// Copy into src/actors/<name>-actor.ts, rename the class, then import it in src/actors/index.ts
// and add it to that file's default registry object: `export default { ExampleActor }`.
import { PhysicalShapeMesh, SphereCollisionShape } from '@hology/core'
import { Actor, BaseActor, PhysicsBodyType, PhysicsSystem, attach, inject } from '@hology/core/gameplay'
import { MeshComponent } from '@hology/core/gameplay/actors'
import { AxisInput } from '@hology/core/gameplay/input'
import { takeUntil } from 'rxjs'
import { MeshStandardMaterial, SphereGeometry, Vector3 } from 'three'

@Actor()
class ExampleActor extends BaseActor {
  // @Parameter() fields are editable per-instance in the editor and are only defined from onInit onward.
  // @Parameter() speed: number = 1

  // MeshComponent gives both a rendered mesh and (via PhysicalShapeMesh) a physics body.
  private mesh = attach(MeshComponent<PhysicalShapeMesh>, {
    object: new PhysicalShapeMesh(
      new SphereGeometry(0.2, 32, 32),
      new MeshStandardMaterial({ color: 0x4488ff }),
      new SphereCollisionShape(0.2)),
    bodyType: PhysicsBodyType.dynamic, // dynamic | kinematic | static
    mass: 1,
    friction: 1,
  })

  private physics = inject(PhysicsSystem)
  public readonly axisInput = new AxisInput() // wire to InputService from a player controller

  // Pre-allocate reused objects outside per-step callbacks to avoid GC churn.
  private readonly impulse = new Vector3()

  onInit() {
    // Parameters are defined here. Set up subscriptions and gameplay logic.
    this.physics.setLinearDamping(this, 0.2)
    this.physics.beforeStep
      .pipe(takeUntil(this.disposed))
      .subscribe(dt => {
        this.impulse.set(0, 0, this.axisInput.vertical).multiplyScalar(100 * dt)
        this.physics.applyImpulse(this, this.impulse)
      })
  }

  onBeginPlay() {
    // Runs only when spawned into the running game (not in the editor).
  }

  onUpdate(deltaTime: number) {
    // Per-frame logic. Avoid allocating new objects here.
  }

  onEndPlay() {
    // The beforeStep subscription above automatically unsubscribes when this actor is disposed.
  }
}

export default ExampleActor
