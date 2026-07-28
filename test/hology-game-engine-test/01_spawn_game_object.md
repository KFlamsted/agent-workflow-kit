# Test 01 — Spawn a game object

**Skill area:** actors, `MeshComponent`, `PhysicalShapeMesh`, `World` / `SpawnPoint`

## Prompt

> Create a simple `CrateActor` — a 1×1×1 box that can be pushed around and collides with the ground. Spawn one at the level's spawn point when the game starts.

## Pass criteria

- Uses `@Actor()` + `BaseActor`.
- Uses `MeshComponent<PhysicalShapeMesh>` with a `BoxCollisionShape`, dynamic body type.
- Spawns via `World` / `SpawnPoint` inside `GameInstance.onStart` — **not** `scene.add(...)`.

## Fail signals

- Bare `THREE.Object3D` / `THREE.Mesh` added manually to the scene.
- Physics hand-rolled or missing a collision shape.
