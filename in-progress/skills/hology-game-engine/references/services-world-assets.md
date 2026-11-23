# Services, World, Assets, View, Pointer & Sound

Docs: https://docs.hology.app/gameplay/services.md

## Services

`@Service()` classes are per-game singletons, consumed with `inject(ServiceClass)` (constructor/field init only). Use them for global state, systems (spawning, AI director) and cross-actor events: put an RxJS `Subject` on a service so any actor can publish and subscribe. See `templates/service.ts`. The `GameInstance` entry point is in SKILL.md.

## World

```typescript
const a = await this.world.spawnActor(ExampleActor, position, rotation)
const first = this.world.findActorByType(SpawnPoint)
const all = this.world.findActorsByType(Character)
await spawnPoint.spawnActor(BallActor)                 // uses the spawn point's transform
this.world.removeActor(actor)                          // runs onEndPlay + disposed; does NOT dispose geometry/materials
this.world.removePrefab(instance)
this.world.scene                                       // the THREE.Scene
this.world.directionalLight.intensity = 0.2            // also .direction (Vector3); .position is read-only
```

The directional light emulates a sun: change `direction`, not `position`. It has no colour setter; sun colour, engine lights, fog and shadows are in `rendering.md`.

`@hology/core@0.0.282` also declares `spawnActor(type, pos, rot, options)` and `spawnActorSync`.

## ViewController — camera, loop, pause

```typescript
const camera = this.view.getBaseCamera()
this.view.onLateUpdate(target).subscribe(() => {   // optional actor; per frame after all onUpdate
  camera.position.copy(target.position).addScaledVector(target.direction, -2)
  camera.lookAt(target.position)
})
this.view.paused = true
this.view.audioListener                            // for THREE.Audio / PositionalAudio
const pos = this.view.getScreenPosition(worldPos)  // Vector3 | null; optional target, viewportSize; call in late update
```

**Cameras (0.0.282).** `getCamera()` returns the **rendered** camera, which may be a shake copy rebuilt after `lateTick`; use it for raycasts and projection. Drive `getBaseCamera()`. Only the base camera is resized on window resize, so an override camera must copy its lens. Shake with `applyCameraShake`/`cameraShakeIntensity`; it moves only the rendered camera, so camera-relative movement stays steady. Medium confidence: the split is in the types, but no bug from writing to `getCamera()` was observed.

**Pause, time, audio.** `paused` stops rendering and input and mutes audio (listener gain = `muted || paused ? 0 : masterVolume`), so pause-menu sounds need their own route around the listener. While paused, `InputService` drops keydown but still delivers keyup (`input.md`). Also: `masterVolume`, `setMuted()`, `pausedChanged`, `mutedChanged`, `timeScale` (scales update deltas and physics).

## AssetLoader

Load by editor asset **name**, asset **id**, or **file path**.

```typescript
const model = await this.assets.getModelByAssetName('MyCharacter') // { scene: Group, animations: AnimationClip[] }
this.object.add(model.scene)
```

- Models: `getModelByAssetName`/`ById` → `LoadedMesh`; `getModelAtPath` (`.glb/.gltf/.fbx/.obj`) → `Object3D` only, animations dropped; `getGltfAtPath` → full `GLTF`, needed for anything animated.
- Textures: `getTextureByAssetName`/`ById`. Audio: `getAudioByAssetName`/`ById`, `getAudioAtPath` → `AudioBuffer`. Materials: `getMaterialByAssetId`. Prefabs: `getPrefabByName`/`ById`. Raw: `getAsset(id)`.
- Also declared in 0.0.282: `getAnimationClipByAssetId`/`ByAssetName` and `getAnimationClipForTargetByAssetId(id, targetRigId?)` → `AnimationClip | null`; `getSequenceById`/`ByName`; `getDataAssetById`/`ByName(…, type?)` → `DataAssetRef<T> | null`, `getDataAssetsByType(type)`; `getShaderGraphByAssetId`, `prepareShaderGraphParameters(graph, params?)`; `clearCache(asset)`, `clearCacheById(id)`. Check the installed declarations for exact signatures.

**Path methods** (`*AtPath`) load and parse on **every** call; nothing is cached or cloned. Cache one promise per path and clone per instance (`SkeletonUtils.clone` for skinned models). Their return types come from `three-stdlib`, not `@types/three`; type them as `Awaited<ReturnType<AssetLoader['getGltfAtPath']>>`. Paths are relative to the site base; a leading slash works.

## PointerEvents — clicks and hovers on 3D objects

Call `start()` yourself; the engine never does and nothing fires otherwise.

```typescript
this.pointer.start()
this.pointer.onClickObject3D(this.world.scene).subscribe(e => console.log(e.intersection.point))
this.pointer.onClickActorType(Coin).subscribe(({ actor, intersection }) => {})
```

- Events `onClick*`, `onPointerDown*`, `onPointerUp*`, `onPointerEnter*`, `onPointerLeave*`, `onPointerMove*`, each with `Object3D` / `Actor` / `ActorType` variants. Object3D variants emit `{ object, intersection }`, actor variants `{ actor, intersection }`.
- Pointer-leave emits `intersection: null` despite the types; null-check it.
- It raycasts the whole scene and uses only the **first** hit, so grass, canopies or any mesh in front swallow clicks. In cluttered scenes raycast yourself against invisible pick volumes.
- A click registers on pointer-up over the object hit on pointer-down. It listens on the game view directly, bypassing `InputService`, rebinding and pause.
- DOM overlays need the CSS in `ui-and-react.md` so clicks reach the canvas.

## Sound

Use `THREE.Audio` / `PositionalAudio` with `view.audioListener` and buffers from `AssetLoader`; one `Audio` per simultaneously playing sound, stopped before replaying.

```typescript
private sound = new THREE.Audio(this.view.audioListener)
async onStart() {
  this.sound.setBuffer(await this.assets.getAudioAtPath('data/asset-resources/impact.ogg')).setVolume(0.5)
}
play() {
  if (this.sound.isPlaying) this.sound.stop()
  this.sound.play()
}
```

- **Wait for a user gesture.** Hology never resumes the suspended audio context; sounds played earlier all fire at once on resume. Headless Chromium ignores autoplay rules, so tests won't catch it. Loading and decoding work while suspended.
- **The listener rides on the view camera**, which can be far from the player (18–32 m in an isometric game). Positional sounds then need an inverse distance model with a reference distance beyond the farthest zoom.
