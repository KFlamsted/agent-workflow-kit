# Services, World, Assets, View, Pointer & Sound (deep reference)

Covers `@Service()`/`inject`, `GameInstance`, `World`, `ViewController`, `AssetLoader`, `PointerEvents`, and sound. Read this for global systems, spawning/finding, cameras, loading assets, clicks, and audio.

## Services — `@Service()` + `inject(...)`

A service is a singleton (one instance per game) for shared state, systems, and cross-actor communication. Create with `@Service()`; consume anywhere (actors, components, other services) with `inject(ServiceClass)`. Call `inject` only in constructors / field initializers.

```typescript
@Service()
class GameState { score = 0 }

@Actor()
class Goal extends BaseActor {
  private gameState = inject(GameState)
}
```

Use services for: global state (score, config), systems (spawning, AI director), and cross-actor events (put an event emitter / RxJS `Subject` on a service so any actor can publish/subscribe). Prefer event-based communication over relying on `onUpdate` ordering between actors.

## GameInstance — the entry point

The game's root is a `@Service()` extending `GameInstance` (conventionally `src/services/game.ts`), passed to the UI as `<HologyScene gameClass={Game} .../>`. Its `async onStart()` runs when the game starts.

```typescript
@Service()
class Game extends GameInstance {
  private world = inject(World)
  private playerCamera = inject(PlayerCamera)
  async onStart() {
    const spawnPoint = this.world.findActorByType(SpawnPoint)
    const ball = await spawnPoint.spawnActor(BallActor)
    this.playerCamera.setup(ball)
  }
}
export default Game
```

## World

```typescript
private world = inject(World)
const a = await this.world.spawnActor(ExampleActor, position, rotation)
const first = this.world.findActorByType(SpawnPoint)   // first of a class
const all = this.world.findActorsByType(Character)      // all of a class (array)
this.world.removeActor(actor)                         // remove an actor instance
this.world.removePrefab(instance)                    // remove a spawned prefab instance
this.world.scene                                        // the underlying THREE.Scene (for PointerEvents targets, etc.)
this.world.directionalLight.intensity = 0.2            // .direction (Vector3), .intensity, .position (read-only)
```

`directionalLight.direction` emulates a sun; don't set `position` (change `direction` instead).

## ViewController — camera, render loop, pause

```typescript
private view = inject(ViewController)
const camera = this.view.getCamera()
this.view.onLateUpdate(target).subscribe(() => {   // per-frame after all onUpdate — ideal for camera follow
  camera.position.copy(target.position).addScaledVector(target.direction, -2)
  camera.lookAt(target.position)
})
this.view.paused = true            // pauses BOTH the render loop and input processing; false to resume
this.view.audioListener            // THREE.AudioListener for THREE.Audio / PositionalAudio
```

Don't build your own `PerspectiveCamera` + `requestAnimationFrame` loop — use the active camera and `onUpdate`/`onLateUpdate`/`ViewController.onLateUpdate`.

## AssetLoader — load assets at runtime

Load by asset **name** (as set in editor), asset **id**, or **file path**. Use this instead of raw Three.js loaders so assets resolve through the project pipeline.

```typescript
private assets = inject(AssetLoader)
const model = await this.assets.getModelByAssetName('MyCharacter') // LoadedMesh { scene: Group, animations: AnimationClip[] }
this.object.add(model.scene)
const tex  = await this.assets.getTextureByAssetName('Bark')       // THREE.Texture
const buf  = await this.assets.getAudioByAssetName('JumpSound')     // AudioBuffer
const prefab = await this.assets.getPrefabByName('Enemy')           // Prefab
```

Full method set:
- Models: `getModelByAssetName`, `getModelByAssetId` → `LoadedMesh`; `getModelAtPath` (`.glb/.gltf/.fbx/.obj`) → `Object3D`; `getGltfAtPath` → full `GLTF`.
- Textures: `getTextureByAssetName`, `getTextureByAssetId` → `THREE.Texture`.
- Audio: `getAudioByAssetName`, `getAudioByAssetId`, `getAudioAtPath` → `AudioBuffer`.
- Materials: `getMaterialByAssetId` → `THREE.Material`.
- Prefabs: `getPrefabByName`, `getPrefabById` → `Prefab`.
- Raw: `getAsset(id)` → `Asset`.

## PointerEvents — clicks / hovers on 3D objects

Inject `PointerEvents` and subscribe by `Object3D`, actor instance, or actor type.

```typescript
private pointer = inject(PointerEvents)
this.pointer.onClickObject3D(this.world.scene).subscribe(e => console.log(e.intersection.point))
this.pointer.onClickActorType(Coin).subscribe(({ actor: coin, intersection }) => {
  console.log(coin, intersection.point)
})
```

Event kinds (each has `Object3D` / `Actor` / `ActorType` variants): `onClick*`, `onPointerDown*`, `onPointerUp*`, `onPointerEnter*`, `onPointerLeave*`, `onPointerMove*`. Object3D variants emit an event with `object` and `intersection`; actor and actor-type variants emit an event with `actor` and `intersection`, rather than passing the actor directly. The intersection includes `point`, `distance`, `face`, `object`, `uv`, and `uv2`. When rendering DOM UI over the game, add the overlay CSS from `ui-and-react.md` so canvas clicks still reach PointerEvents.

## Sound

Sound uses Three.js `THREE.Audio` / `PositionalAudio` with `view.audioListener`; load buffers via `AssetLoader`. One `Audio` instance per simultaneously-playing sound; stop before replaying.

```typescript
private view = inject(ViewController)
private assets = inject(AssetLoader)
private sound = new THREE.Audio(this.view.audioListener)

async onStart() {
  const buffer = await this.assets.getAudioAtPath('data/asset-resources/impact.ogg')
  this.sound.setBuffer(buffer).setVolume(0.5)
}
play() {
  if (this.sound.isPlaying) this.sound.stop()
  this.sound.play()
}
```
