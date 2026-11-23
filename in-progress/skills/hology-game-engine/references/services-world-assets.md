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
this.world.removeActor(actor)                         // runs onEndPlay + disposed; does NOT dispose geometry/materials
this.world.removePrefab(instance)                    // remove a spawned prefab instance
this.world.scene                                        // the underlying THREE.Scene (for PointerEvents targets, etc.)
this.world.directionalLight.intensity = 0.2            // .direction (Vector3), .intensity, .position (read-only)
```

`directionalLight.direction` emulates a sun; don't set `position` (change `direction` instead). It has no colour setter; for sun colour, engine-made lights, fog and shadows see `rendering.md`.

`@hology/core@0.0.282` also declares `spawnActor(type, pos, rot, options)` and `spawnActorSync`.

## ViewController — camera, render loop, pause

```typescript
private view = inject(ViewController)
const camera = this.view.getBaseCamera()
this.view.onLateUpdate(target).subscribe(() => {   // optional actor; Observable<number>. Per-frame after all onUpdate — camera follow
  camera.position.copy(target.position).addScaledVector(target.direction, -2)
  camera.lookAt(target.position)
})
this.view.paused = true            // pauses BOTH the render loop and input processing; false to resume
this.view.audioListener            // THREE.AudioListener for THREE.Audio / PositionalAudio
const pos = this.view.getScreenPosition(worldPos) // THREE.Vector3 | null; optional target, viewportSize. Call in late update
```

**Cameras (0.0.282).** `ViewController` separates base, source and presentation cameras. `getCamera()` returns the **rendered** camera, which may be a shake copy rebuilt after `lateTick`; use it for raycasts and projection. Drive `getBaseCamera()` for a camera you control. The engine resizes only the base camera on window resize, so an override camera must copy its lens. For shake, use `applyCameraShake` / `cameraShakeIntensity`: it moves only the rendered camera, so camera-relative movement stays steady. Medium confidence: the split is confirmed in the types, but no bug from writing to `getCamera()` was observed.

**Pause, time and audio.** `paused` also mutes audio (listener gain = `muted || paused ? 0 : masterVolume`), so pause-menu sounds need their own route around the listener. While paused, `InputService` still delivers keyup but drops keydown (see `input.md`). Related API: `masterVolume`, `setMuted()`, `pausedChanged`, `mutedChanged`, and `timeScale` (scales update deltas and physics).

For a React overlay example see `ui-and-react.md`.

Don't build your own `PerspectiveCamera` + `requestAnimationFrame` loop — use the active camera and `onUpdate`/`onLateUpdate`/`ViewController.onLateUpdate`.

## AssetLoader — load assets at runtime

Load by asset **name** (as set in editor), asset **id**, or **file path**. Prefer this for Hology-managed/editor assets and supported paths so assets resolve through the project pipeline. Direct Three.js loaders are narrow exceptions for unsupported formats, loader-specific behavior `AssetLoader` does not expose, or an established project pattern; they should not replace this service by default.

```typescript
private assets = inject(AssetLoader)
const model = await this.assets.getModelByAssetName('MyCharacter') // LoadedMesh { scene: Group, animations: AnimationClip[] }
this.object.add(model.scene)
const tex  = await this.assets.getTextureByAssetName('Bark')       // THREE.Texture
const buf  = await this.assets.getAudioByAssetName('JumpSound')     // AudioBuffer
const prefab = await this.assets.getPrefabByName('Enemy')           // Prefab
```

Common documented methods:
- Models: `getModelByAssetName`, `getModelByAssetId` → `LoadedMesh`; `getModelAtPath` (`.glb/.gltf/.fbx/.obj`) → `Object3D` (`.scene` only, animations dropped); `getGltfAtPath` → full `GLTF`, needed for anything animated.
- Textures: `getTextureByAssetName`, `getTextureByAssetId` → `THREE.Texture`.
- Audio: `getAudioByAssetName`, `getAudioByAssetId`, `getAudioAtPath` → `AudioBuffer`.
- Materials: `getMaterialByAssetId` → `THREE.Material`.
- Prefabs: `getPrefabByName`, `getPrefabById` → `Prefab`.
- Raw: `getAsset(id)` → `Asset`.

**Path methods** (`getModelAtPath`, `getGltfAtPath`, `getAudioAtPath`) load and parse on **every** call; nothing is cached or cloned. Cache one promise per path and clone per instance, with `SkeletonUtils.clone` for skinned models. Return types come from `three-stdlib`, not `@types/three`; type them as `Awaited<ReturnType<AssetLoader['getGltfAtPath']>>`. Paths are relative to the site base; a leading slash (`/assets/...`) works.

Additional APIs declared by **`@hology/core@0.0.282`** (not all are covered by the public loading guide):
- Animation: `getAnimationClipByAssetId`, `getAnimationClipByAssetName` → `Promise<THREE.AnimationClip | null>`; `getAnimationClipForTargetByAssetId(id, targetRigId?)` resolves an animation reference for a target rig and returns the same type.
- Sequences: `getSequenceById`, `getSequenceByName` → `Promise<Sequence>`.
- Data assets: `getDataAssetById(id, type?)`, `getDataAssetByName(name, type?)` → `Promise<DataAssetRef<T> | null>`; `getDataAssetsByType(type)` → `Promise<T[]>`.
- Shader graphs: `getShaderGraphByAssetId` → `Promise<ShaderGraphDocument>`; `prepareShaderGraphParameters(graph, params?)` → `Promise<Record<string, unknown>>`.
- Cache: `clearCache(asset)` and `clearCacheById(assetId)` → `void`.

This is not an exhaustive or cross-version-stable inventory. Inspect the project's installed `AssetLoader` declarations for the authoritative API, signatures, and return types.

## PointerEvents — clicks / hovers on 3D objects

Inject `PointerEvents`, **start it** (the engine never does; nothing fires otherwise), and subscribe by `Object3D`, actor instance, or actor type.

```typescript
private pointer = inject(PointerEvents)
this.pointer.start()
this.pointer.onClickObject3D(this.world.scene).subscribe(e => console.log(e.intersection.point))
this.pointer.onClickActorType(Coin).subscribe(({ actor: coin, intersection }) => {
  console.log(coin, intersection.point)
})
```

Event kinds (each has `Object3D` / `Actor` / `ActorType` variants): `onClick*`, `onPointerDown*`, `onPointerUp*`, `onPointerEnter*`, `onPointerLeave*`, `onPointerMove*`. Object3D variants emit an event with `object` and `intersection`; actor and actor-type variants emit an event with `actor` and `intersection`, rather than passing the actor directly. The intersection normally includes `point`, `distance`, `face`, `object`, `uv`, and `uv2`. **Exception:** in current Hology runtime versions, pointer-leave events emit `intersection: null` because the pointer is no longer intersecting the target, despite the public docs and TypeScript declarations typing it as always present. Do not access intersection fields in a leave handler without a null check. When rendering DOM UI over the game, add the overlay CSS from `ui-and-react.md` so canvas clicks still reach PointerEvents.

Limits: it raycasts the whole scene with three.js and uses only the **first** hit, so grass, canopies or any mesh in front swallow clicks on units. It listens on the game view directly, bypassing `InputService`, rebinding and pause blocking. A click registers on pointer-up when pointer-down hit the same object. For click targeting in cluttered scenes, raycast yourself against invisible pick volumes.

## Sound

Sound uses Three.js `THREE.Audio` / `PositionalAudio` with `view.audioListener`; load buffers via `AssetLoader`. One `Audio` instance per simultaneously-playing sound; stop before replaying.

- **Wait for a user gesture.** Hology never resumes the browser's audio context, which starts suspended; sounds played earlier all fire at once on resume. Headless Chromium ignores autoplay rules, so tests won't catch it. Loading and decoding work while suspended, so preloading at boot is fine.
- **The listener rides on the view camera**, which can be far from the player (18–32 m in an isometric game). Positional sounds then need an inverse distance model with a reference distance beyond the farthest zoom.
- Pausing mutes the listener (see ViewController above).

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
