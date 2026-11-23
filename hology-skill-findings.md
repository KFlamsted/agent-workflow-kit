# hology-game-engine skill: findings from building Rimecaller

What the skill gets wrong, leaves out or overstates, measured against what actually happened while building Rimecaller (E1–E9) with `@hology/core` **0.0.282**, `@hology/react` 0.0.26 and three 0.169.

- **Skill version reviewed:** `rimecaller-rpg-demo/.claude/skills/hology-game-engine`. It is byte-identical to `agent-workflow-kit/in-progress/skills/hology-game-engine` as of 2026-11-23.
- **Sources:**
  - 213 Claude Code transcripts: the main sessions, every worktree session and every subagent session.
  - The repo's ADRs (`docs/adr/0001-content-pipeline.md`, `0002-click-targeting.md`), `docs/architecture.md` and `docs/performance.md`.
  - Code comments that record engine behaviour, and the commit history.
- **What this file excludes:** style preferences and doc topics that would only be nice to have. Nothing here comes from reading the Hology docs.
- **What a finding needed:** either a session proved it (a bug, a failed attempt, a measurement), or it was missing knowledge that cost real time, typically an agent reading minified `node_modules/@hology/core/dist` code to find out.
- **Re-checked:** every disputed or source-only claim was checked against the installed 0.0.282 `dist`. Notes in the findings say where.

**Project context that matters:** the Hology editor was never available. Everything is spawned from code and the asset JSON is hand-written. Findings that only matter for that reason are tagged **[editor-less]**. They are still real gaps, because the skill assumes the editor in places where code-only use is possible.

Verdicts:
- **wrong**: the skill states something false for 0.0.282.
- **outdated**: it was true for an older package, or the version label is stale.
- **misleading**: technically true, but following it leads into a bug.
- **missing-critical**: the skill is silent on something that cost real time or caused a shipped bug.

---

## Summary

| # | Area | Skill file | Verdict | Confidence |
|---|---|---|---|---|
| 1 | React StrictMode around `HologyScene` breaks boot on real GPUs | `ui-and-react.md` | missing-critical | high |
| 2 | Creating a VFX instance during play recompiles the scene's shaders, nulls materials and crashes Firefox | `shaders-and-vfx.md` | missing-critical | high |
| 3 | VFX API in 0.0.282: instances, pools, `VisualEffect.create(parent)` | `shaders-and-vfx.md` | outdated | high |
| 4 | Hology replaces Three.js materials at render time: `onBeforeCompile` is ignored, and flipping `transparent` in place fails | SKILL.md golden rule, `shaders-and-vfx.md` | wrong / missing-critical | high |
| 5 | `fresnelEffect` gives an invalid program; fragment graphs need `varyingTransformed` | `shaders-and-vfx.md` | missing-critical | high |
| 6 | Navmesh: single-tile bug, worker registration, spawn timing, readiness, `ignoreForNavMesh`, code-only setup | `ai-and-navigation.md`, `physics.md` | missing-critical | high |
| 7 | Colliders, ray casts and navmesh see nothing until the first physics step after `onStart` | SKILL.md entry point, `services-world-assets.md` | missing-critical | high |
| 8 | Mouse-button `Keybind`s only fire under pointer lock | `input.md` | wrong | high |
| 9 | `Keybind` matches `event.key`, so Shift+digit breaks and keys get stuck | `input.md` | misleading | high |
| 10 | `InputService`: held keys stuck after focus loss, re-sent presses, `document` listener, no `preventDefault` | `input.md` | missing-critical | high |
| 11 | `bindToggle`/`bindDelta` keep one callback per action id, so enum ids collide | `input.md` | misleading | high |
| 12 | `ViewController.paused` also mutes audio; input drops keydown but still delivers keyup | SKILL.md, `services-world-assets.md` | misleading | high |
| 13 | `PointerEvents` is never started by the engine and only uses the first scene hit | `services-world-assets.md` | wrong | high |
| 14 | `.hology-overlay *` CSS makes full-screen overlay wrappers swallow canvas clicks | `ui-and-react.md` | misleading | high |
| 15 | `AnimationStateMachine`: rate reset every frame; `transitionsOnComplete` fires 0.5 s early whatever the predicate says | `animation.md` | misleading | high |
| 16 | `CharacterMovementComponent`: `maxWalkingSlopeAngle` doesn't exist (radians option), characters never collide, autostep off | `physics.md` | wrong | high |
| 17 | Physics (and character movement) steps at most 0.04 s per frame while `onUpdate` gets the full delta | SKILL.md lifecycle, `physics.md` | missing-critical | high |
| 18 | `horizontalSpeed` reflects input, not real movement | `physics.md` | missing-critical | medium |
| 19 | `rayTest`: options list incomplete, single exclude, non-solid rays (entry and exit hits) | `physics.md` | misleading | high |
| 20 | `AssetLoader` path methods don't cache or clone; animated models need `getGltfAtPath`; three-stdlib types | `services-world-assets.md` | missing-critical | high |
| 21 | Production bundle crashes without `import '@hology/core/scene/materializer'` first | SKILL.md project structure | missing-critical | high |
| 22 | Default backend is WebGPU; `HologyScene` `rendering` prop (`RenderingConfig`) undocumented | `ui-and-react.md` | missing-critical | high |
| 23 | Lighting/tone mapping/shadows: engine-made lights and fog, tone mapping reset each frame, CSM not refitted, cascade refresh | `services-world-assets.md` (World) | missing-critical | high |
| 24 | Camera: drive `getBaseCamera()`; `getCamera()` is the presentation/shake camera; built-in shake exists | SKILL.md, `services-world-assets.md` | misleading | medium |
| 25 | Sound: audio context never resumed by Hology; listener sits on the camera | `services-world-assets.md` | missing-critical | high |
| 26 | `@hology/core/gameplay` can't be imported under Vitest | SKILL.md (missing) | missing-critical | high |
| 27 | `BaseActor` reserves `id` and other fields; subclass fields with those names break it | `actors-and-components.md` | missing-critical | high |
| 28 | Version notes say 0.0.232; several are stale for 0.0.282 | SKILL.md + 4 references | outdated | high |
| 29 | Small API corrections: `getScreenPosition`, `useRenderLateUpdate`, `useObservable`, `getFullBodyAction`, 128-collider warning, `teleport` | various | wrong / missing | high / medium |
| 30 | `public/data` "don't hand-edit" and "imported models auto-generate a shape" | SKILL.md, `physics.md` | misleading [editor-less] | medium |

Severity: 1, 2, 4, 6, 7, 8, 10, 15, 16 and 21 each caused a shipped bug, a blocked boot or long debugging. Fix these first.

---

## Findings

### 1. React StrictMode around `HologyScene` breaks boot on a real GPU

- **Skill:** `ui-and-react.md` shows `<HologyScene>` with no warning about StrictMode. The default Vite React template wraps `<App/>` in `<StrictMode>`.
- **What happened:** issue #96 (workaround), then #124 (the real fix, PR #130, commit "fix(app): keep HologyScene out of StrictMode so dev boots on a real GPU").
  - StrictMode's dev double mount starts two Hology runtimes. They share one `WebGLRenderer`, which Hology keeps on `window.renderer`.
  - The first runtime's shutdown disposes that renderer while the second is still in `compileAsync`. With `KHR_parallel_shader_compile`, which every real GPU has, the poll throws `Cannot read properties of undefined (reading 'isReady')` in `checkMaterialsReady`, and the game never boots.
  - Headless SwiftShader lacks that extension, so e2e stayed green. The project now fakes the extension in e2e (`tests/e2e/support/parallel-shader-compile.ts`).
  - Several sessions lost long stretches to a blank screen: the Frostbolt worker #27 and the #124 worker. Six of the ten transcript buckets reported it independently.
- **Change:** in `ui-and-react.md`, and in SKILL.md's `main.tsx` note, say: "Never wrap `HologyScene` in `React.StrictMode`. Wrap only your overlay children: `<HologyScene …><StrictMode><Hud/></StrictMode></HologyScene>`. Remove the template's StrictMode from `main.tsx`." See `src/App.tsx` for the working version.

### 2. Creating a VFX instance during play recompiles the whole scene and crashes Firefox

- **Skill:** in `shaders-and-vfx.md` the example calls `await this.vfx.createFromAssetId('…')` and then `vfxActor.play()` from `onInit` during gameplay. The text says to "spawn them dynamically from gameplay code".
- **What happened:** PR #136 ("pool two cast glows so a queued cast doesn't crash Firefox"), the shrine-ring fix ("prewarm the shrine's activation ring so Firefox doesn't crash"), the E7 gate, #204, and the #26 frost-VFX session.
  - The first time a VFX instance or pool copy is materialised during play, Hology starts a background `compileAsync` of the whole scene. While it runs:
    - It logs `Compile in progress, skipping render` and skips rendering.
    - `applyDepthMaterial()` swaps every mesh's material, setting it to `null` for meshes that don't cast shadows.
    - The game loop keeps ticking.
  - **Firefox:** Hology's particle renderer throws `mesh.material is null` in `onParticleUpdate`. The loop stops and the screen goes black.
  - **Chromium:** no crash, so e2e missed it.
  - **Game code:** code that reads `mesh.material` crashed too, e.g. `TypeError: Invalid value used in weak set at CSM.setupMaterial`.
- **Change:** add a "Spawning effects during play" rule:
  - Build effects while loading, through `VfxService.createInstancePool(...)`, and reuse them.
  - Size each pool for peak concurrency, e.g. a queued cast starting while the last one fades.
  - Any new radius or variant is a new pool. Pre-create those too.
  - Keep your own reference to a material. Don't read `mesh.material` every frame, and null-guard material traversals.
  - Test in Firefox.

### 3. VFX API is outdated for 0.0.282

- **Skill:** `shaders-and-vfx.md` covers only `createFromAssetId → vfxActor.play()/stop()/timescale` and the `@Parameter() visualEffect` → `visualEffect.create()` pattern. It hedges that `create()` "may" need a parent.
- **What happened (#26 session, engine `.d.ts`):**
  - `vfx-actor.d.ts` calls `VfxActor` an "Authoring/compatibility adapter. Gameplay can own VfxInstance directly."
  - `VfxService` has `createInstance`, `createInstanceFromAssetId` and `createInstancePool`. A `VfxInstancePool` is exported from `@hology/core/gameplay`.
  - Pool semantics had to be read from minified source:
    - `get()` restarts an instance but leaves it paused, so `play()` is needed after every `get()`.
    - `release()` kills particles. `stop()` only stops emission.
    - `dispose()` frees the instance.
  - `VisualEffect.create(parent)` requires a parent in 0.0.282.
  - Under the WebGL backend every effect logs a harmless "GPU VFX requires the WebGPU renderer … Falling back to CPU" warning.
  - [editor-less] A VFX asset is plain data: `{ id, name, type: 'vfx', vfx: { emitters } }`. You can hand it to `new VisualEffect(asset)` or `VfxService.createFromAsset(asset)`, or write it as JSON under `public/data/asset/` and load it by id. `EmitterDataConstructor()` comes from `@hology/core/effects/vfx/vfx-asset`. Param values are `{ type: SerializedParamType, value }`. `output.texture` is a texture **asset id**. See ADR 0001 §6.
- **Change:**
  - Make instance/pool the primary runtime API, documenting `get → play`, `release` vs `stop` and `dispose`.
  - Drop the hedge and say `create(parent)` takes a parent.
  - Mention the CPU fallback warning on WebGL.
  - Add a short "VFX without the editor" note.

### 4. Hology replaces Three.js materials at render time

- **Skill:** SKILL.md says "Raw Three.js is still fair game for **content details** — geometries, materials…". `shaders-and-vfx.md` frames `NodeShaderMaterial` as a preference.
- **What happened:**
  - **#184 (dirt-path shader).** Patching `MeshStandardMaterial` via `onBeforeCompile` produced no output and no error, even when forced to output solid red. The WebGL backend rebuilds three.js built-in materials as its own node materials, so `onBeforeCompile` never runs. Only `NodeShaderMaterial` with `standardMaterial(...)` worked. `src/actors/terrain-path-material.ts` notes: "Hology renders every material through its node pipeline".
  - **#56 (corpse dissolve).** Hology keeps one internal render material per three.js material **instance**. Setting `transparent = true` (and `needsUpdate`) on an existing material leaves it in the opaque pass, so every dissolving corpse drew a white body-shaped hole in the canvas. Fix (commit 031153f): swap in a fresh clone created transparent (`src/services/vfx/parts/tinted-mesh.ts`).
  - **#55 (performance).** The first transparent variant of a skinned or double-sided material compiled a new program on first use, freezing the game for 110–300 ms. Fix: prewarm those variants at load (`TransparentShaderPrewarm`).
- **Change:** add a "How Hology treats three.js materials" section:
  - Plain built-in materials (colour, map, standard params) are fine.
  - `onBeforeCompile` and other shader patches are ignored. Use `NodeShaderMaterial`.
  - Changing `transparent` (or other flags that pick a program) on a live material doesn't take effect. Assign a fresh material instance instead.
  - New material variants compile on first use. Prewarm them if a hitch matters.

### 5. Node shaders: `fresnelEffect` breaks; fragment graphs need `varyingTransformed`

- **Skill:** `shaders-and-vfx.md` lists building blocks (`varyingAttributes`, `timeUniforms`, `standardMaterial`, …) with no stage rules.
- **What happened (#26, fresnel bubble):**
  - A `NodeShaderMaterial` using `fresnelEffect()` rendered nothing; WebGL reported an invalid program.
  - Building it by hand with `transformed.viewDir`/`transformed.normal` in the `color` graph gave 54 errors. The same term with `varyingTransformed.viewDir/normal` gave 0.
  - Shader compile errors are not surfaced clearly, so the agent bisected by hand.
  - Workaround in `src/services/vfx/parts/fresnel-bubble-part.ts`: `pow(oneMinus(saturate(dot(normalize(varyingTransformed.viewDir), normalize(varyingTransformed.normal)))), k)`.
- **Change:**
  - State that `color` (fragment) graphs must read `varyingTransformed.*` and `varyingAttributes.*`; `transformed.*` is vertex-stage only.
  - Note that `fresnelEffect` produced an invalid program in 0.0.282, and show the manual formula.
  - Suggest bisecting a node graph when a material renders nothing.

### 6. Navigation: the navmesh section doesn't hold up in practice

- **Skill:** `ai-and-navigation.md` says to add a NavMesh actor in the editor and that "once configured, the navmesh generates automatically". It says `findClosestPoint` "may be `null` while the mesh is still generating".
- **What happened:** spike #2 (ADR 0001 §5), #34, #44, #179/PR #180 and the E6 orchestration. Reported by eight of the ten buckets.
  1. **Engine bug: one tile never answers.** Tile size is `min(400, max(50, ceil(min(w, d) / 2)))` m, and `maxTiles` is hard-coded. If the volume fits in one tile, `findPath` and `findClosestPoint` fail forever, while `findRandomPoint` still works. 40×40 m failed; 70×70 m works. Keep each side ≥ 70 m. This applies to editor-placed volumes too. (`src/content/tunables/navigation.ts`)
  2. **Register the task worker.** Without `registerWorker` and a worker module calling `initWorker()`, both from `@hology/core/worker` (`src/services/navigation/navmesh-tile.worker.ts`), tiles build on the main thread in `requestIdleCallback` with no timeout. A page busy rendering starved it: first path after 43 s, 151 s or never. Glimmerwood e2e failed locally and in CI. With the worker it took 2.9 s under 4× CPU throttling. After adding the worker, Vite showed a one-time "Outdated Optimize Dep" 504; restarting the dev server fixed it.
  3. **Spawn after the first physics step.** Colliders join the physics world on the next step (see #7). A navmesh generated earlier misses every prop and paths go straight through rocks until the engine's 4 s refresh. Wait for one `physics.afterStep` first.
  4. **Gate AI on readiness.** `findPath` fails silently and only logs until generation finishes. The first usable path came 0.3–0.8 s after spawn. Poll `findPath` until it succeeds before starting AI.
  5. **`ignoreForNavMesh`.** Non-scenery physics bodies (projectiles, corpses, pickups, the boss-arena seal walls) cut holes in the navmesh unless added with `ignoreForNavMesh: true`. `CharacterMovementComponent` already sets it. One agent searched the skill for this option and found nothing. It's an `addActor` option and is absent from `physics.md`.
  6. **Paths float.** Waypoint y sits 0.2–0.6 m above the collider top, so move in XZ.
  7. **Step height.** The default `walkableClimb` (≈0.3 m effective) dropped a 31° ramp from the mesh even though the slope limit is 45°. #44 raised it to 0.4 m.
  8. **Only the last navmesh counts.** `Navigation` uses only the most recently added navmesh. Debug drawing is on by default.
  9. **[editor-less] Spawning from code.** The `NavMesh` actor class is not exported, and registry ids are minified.
     - The project finds it in `getRegisteredActorClasses()` via `'initDynamic' in cls.prototype` (`src/services/navigation/navmesh-actor-class.ts`).
     - It spawns it with `world.spawnActor`, then sets `actor.object.position/scale` to the volume. The actor re-checks its bounds every 2 s.
     - Runtime-spawned static colliders, including trimesh terrain, are included.
- **Change:** add a "Navmesh in practice" section with points 1–8, an "ignoreForNavMesh" bullet in `physics.md` (`addActor` options), and point 9 as an editor-less recipe.

### 7. Nothing physical exists until the first physics step after `onStart`

- **Skill:** SKILL.md's entry point says `onStart` is where you "spawn actors and wire up controllers/cameras". It says nothing about simulation timing.
- **What happened:** spike #2 (ADR 0001), terrain #42, navmesh #34/#181.
  - Physics, ray casts and navmesh generation only run after `Game.onStart` **resolves**. `rayTest` inside `onStart` returns no hit, and dynamic bodies don't fall.
  - Colliders added later only join the world on the next physics step. A `rayTest` right after spawning terrain missed it.
  - Rendering also only starts after `onStart` resolves. Awaiting frames or simulation time inside `onStart` deadlocks.
  - Line of sight treats everything as visible until the first step (`docs/architecture.md`).
- **Change:** add to the lifecycle section:
  - Don't await simulation or rendering inside `onStart`. Schedule that work afterwards.
  - A collider added this frame is invisible to ray casts and navmesh until the next `physics.afterStep`.

### 8. Mouse-button `Keybind`s only fire under pointer lock

- **Skill:** `input.md` shows `this.input.setKeybind(InputAction.shoot, new Keybind('MouseLeft'))` and says Hology accepts `'MouseLeft'`, `'MouseMiddle'` and `'MouseRight'` in a `Keybind`.
- **What happened (#45 review, #16 targeting):** mouse-button binds never fired in this cursor-driven game.
  - **Engine check (0.0.282):** `input-service.js` gates handling with `this.view.paused || "button" in e && !pointerLockActive() || …`, so mouse-button events are ignored unless pointer lock is active. No cursor position is passed either.
  - **Fix:** the project wrote `src/services/pointer-button-input.ts`, which listens for `pointerdown` on `ViewController.htmlElement` and matches with `Keybind.test`.
- **Change:**
  - State that mouse-button keybinds work only under pointer lock (FPS-style games).
  - For cursor games, listen to pointer events on `view.htmlElement` and reuse `Keybind.test` so rebinding still works, or use `PointerEvents` (see #13 for its caveats).

### 9. `Keybind` matches `event.key`, so Shift+digit breaks and keys get stuck

- **Skill:** `input.md` says "For keyboard input, `key` is generally a `KeyboardEvent.key` value".
- **What happened (E2 review):** commit "fix(input): match spell keys on the physical key so Shift cannot break them".
  - `Keybind.test` only compares `event.key`.
  - Press `1`, press Shift, release `1`: the keyup arrives as `!`, so `spell1` stays held and the next press of `1` is ignored. Shift+1 never casts.
  - **Fix:** a `Keybind` subclass that matches digits on `event.code` (`src/services/binding-keybind.ts`).
- **Change:** say matching is on `event.key` only, so modifiers change the key. For digit or symbol bindings, or where Shift may be held, subclass `Keybind` and override `test()` to compare `event.code`.

### 10. `InputService` behaviour that caused shipped bugs

- **Skill:** `input.md` describes keybinds → actions → callbacks with no caveats.
- **What happened (#80/PR #83, E2 review, debug console #11):**
  - **No focus-loss release.** `InputService` keeps a private list of active toggles and offers no way to clear it. `stop()`/`start()` don't reset it, and nothing clears it on window `blur`. After Alt+Tab while holding W, the character kept walking.
  - **Re-sent presses.** On *every* keyup it re-fires `true` for each key it still thinks is held, and browser auto-repeat fires keydown repeatedly. One-shot actions bound with `bindToggle` must ignore presses of an already-held action (`src/game-logic/input/player-input.ts`).
  - **Workaround for focus loss:** on `blur`, dispatch synthetic `keyup`s for every bound key, then reset game input state (`src/services/focus-loss-release.ts`).
  - **Listens on `document`.** A debug console whose `onKeyUp` called `stopPropagation` swallowed releases, so held keys stuck.
  - **Never calls `preventDefault`.** Tab, arrows and the context menu keep their browser behaviour.
- **Change:** add a "Gotchas" list to `input.md` covering the four points above, with the blur workaround.

### 11. `bindToggle`/`bindDelta` keep one callback per action id

- **Skill:** `input.md` says "Any string works, but an enum is convenient", using `enum InputAction { moveForward, … }`.
- **What happened (E2 review):** a second service used its own numeric enum. Both enums start at 0, so the zoom binding silently replaced another action's callback.
  - **Engine check:** `bindToggle(e,t){this.toggleCallbacks.set(e,t)}`, and the same for `bindDelta`. The callbacks live in a map keyed by action id, so the last bind wins.
  - The camera now uses the namespaced id `'camera.zoom'`.
- **Change:**
  - Say each action id has exactly one toggle and one delta callback, and re-binding replaces it.
  - Use string ids, or one shared enum for the whole game; never separate numeric enums.
  - Note that `setKeybind` *adds* a key to an action rather than replacing it (confirmed).

### 12. `ViewController.paused` also mutes audio, and input still sees keyup

- **Skill:** SKILL.md has `this.view.paused = true   // pauses render + input`. `services-world-assets.md` says "pauses BOTH the render loop and input processing".
- **What happened:** the audio session (#25), the pause menu (#52) and the F3 debug toggle.
  - **Audio mute (engine check):** `applyAudioGain()` sets the listener gain to `muted || paused ? 0 : masterVolume`. Pause-menu click sounds would have been silent, so the project routes its `ui` category around the listener.
  - **Input while paused:** `InputService` drops keydown, mouse and wheel but still delivers keyup. An unpause or toggle key can't go through `InputService`: F3 did nothing while paused, and Esc in menus became a plain DOM listener (`src/ui/menus/use-menu-escape.ts`).
- **Change:** document both, plus the related API the sessions used: `masterVolume`, `setMuted()`, `pausedChanged`, `mutedChanged` and `timeScale` (scales update deltas and physics).

### 13. `PointerEvents` is never started, and it only uses the first scene hit

- **Skill:** `services-world-assets.md` subscribes `onClickObject3D` / `onClickActorType` directly, as if ready to use.
- **What happened (#16; `docs/adr/0002-click-targeting.md`):** confirmed in `dist/gameplay/services/pointer-events.js`.
  - The engine never calls `PointerEvents.start()`; without it nothing fires.
  - It raycasts the whole scene with three.js and only uses the **first** hit. Grass, tree canopies and any other mesh in front swallow clicks on units.
  - It listens on the game view directly, bypassing keybindings and any input blocking.
  - A click registers on pointer-up when pointer-down hit the same object.
  - The project dropped it for its own raycast against invisible pick volumes.
- **Change:**
  - Add `this.pointer.start()` to the example.
  - Document the first-hit rule, and that it bypasses `InputService`, rebinding and pause blocking.
  - Suggest a dedicated raycast against pick volumes for click targeting in cluttered scenes.

### 14. The "required overlay CSS" makes full-screen wrappers swallow canvas clicks

- **Skill:** `ui-and-react.md` requires `.hology-overlay { pointer-events: none }` and `.hology-overlay * { pointer-events: auto }`.
- **What happened (#20 HUD, later screen-fade layer):**
  - `.hology-overlay *` outranks a plain `.screen-fade { pointer-events: none }`. A hidden full-screen fade layer caught every click and e2e clicks timed out.
  - The HUD worker also had to switch full-screen layout boxes back off with a more specific selector (`.hology-overlay .hud`).
  - The rule itself is right: `HologyScene` does render children in `div.hology-overlay`.
- **Change:** keep the CSS, and add: "Because `.hology-overlay *` has higher specificity, any full-screen or layout wrapper inside the overlay must set `pointer-events: none` with a selector at least as specific (e.g. `.hology-overlay .hud`), and only interactive panels get `auto`."

### 15. `AnimationStateMachine` was abandoned: rate reset and early completion

- **Skill:** `animation.md` presents the built-in state machine as the way to animate characters. Its version note says completion predicates don't reliably gate, labelled 0.0.232.
- **What happened (character animation work, `docs/player-character.md`):** the project kept `CharacterAnimationComponent` for crossfades but drives clips from its own state machine (`src/actors/character/character-animator.ts`). Two reasons:
  - **Playback rate is reset every frame.** The machine calls `play()` every frame, so the run clip can't be stride-matched to ground speed through it.
  - **Engine check of `transitionsOnComplete`:** it is `transitionsTo(t, s => !!pred && pred(s) || s >= this.clip.duration - .5)`, so it fires **0.5 s before the clip ends**, regardless of the predicate. A 0.67 s `Hit_A` would be cut after 0.17 s.
- **Change:**
  - Replace the vague version note with the exact rule: completion fires at `duration − 0.5 s` and the predicate can't block it; still true in 0.0.282.
  - Warn that the machine resets `timeScale` each frame.
  - For one-shots shorter than about 1 s, or speed-matched locomotion, drive `CharacterAnimationComponent.play()` yourself.
  - Also document:
    - `play()` options include `fadeTime`.
    - `play(clip, { loop: false })` holds the last frame (confirmed).
    - `getFullBodyAction()` is typed non-null but returns `null` until the first `play()`.

### 16. `CharacterMovementComponent` options and defaults

- **Skill:** `physics.md` shows `maxWalkingSlopeAngle: 70` and `autoStepMaxHeight: 0`, and says nothing about character-to-character collision.
- **What happened:**
  - **Slope option (engine check):** `maxWalkingSlopeAngle` doesn't exist in 0.0.282. The options are `maxSlopeClimbAngle` and `minSlopeSlideAngle`, both in **radians** (defaults `degToRad(70)`). The skill's line is wrong in name and unit, and a hand-copied `70` would mean ~4011°.
  - **Characters pass through each other.** `characterCollision` defaults to `false`; the collision group excludes other capsules, and the capsule is added with `ignoreForNavMesh: true`.
    - Issue #142 assumed corpses body-blocked the player, and a whole worker run went into disproving it. Live enemies didn't block either.
    - With `characterCollision: true` the player stopped after 3.4 m.
    - It also explains melee enemies stacking on one spot, which led to the ring-slot work (#158).
  - **Autostep is off by default.** A 0.5 m stair riser blocked the character, and a ramp collider had to be added.
- **Change:**
  - Fix the option name and unit.
  - Document `characterCollision` (default `false`) and that autostep is off unless `autoStepMaxHeight` is set.
  - Prefer `movement.teleport(position, yaw)` over setting `position` plus `updateActorTransform` for characters (medium-low confidence: the project uses it, but no failure of the other path was observed).

### 17. Physics steps at most 0.04 s per frame; `onUpdate` gets the full delta

- **Skill:** SKILL.md says "use `deltaTime` to stay frame-rate independent". It doesn't mention that physics and actor deltas differ.
- **What happened** (commit "fix(player): turn and stride over the capped physics step"):
  - Physics, and with it `CharacterMovementComponent`, advances at most 0.04 s of game time per frame. Actors' `onUpdate` and the animation mixer get the full frame delta.
  - On slow frames the player turned faster than tuned, and the run stride drifted out of step with movement.
  - **Fix:** clamp turn and animation time to the same cap (`src/game-logic/character/movement-step.ts`).
- **Change:** document the cap. Anything that must stay in step with character movement (facing, stride, displacement-based logic) should use `min(dt, 0.04)` or run in `physics.beforeStep`/`afterStep`.

### 18. `CharacterMovementComponent.horizontalSpeed` reflects input, not movement

- **What happened (#85):** the character played its run animation while pushing into a wall. `horizontalSpeed` is derived from input, not actual displacement.
- **Fix:** sample the actor position in `physics.afterStep`, which fires once the body's new position is copied onto the actor (`DisplacementSpeed`).
- **Change:** add this to `physics.md` next to the movement component. Confidence: medium. The bug is proven; the "derived from input" reading of the source is reported by two sessions.

### 19. `rayTest` options and behaviour

- **Skill:** `physics.md` lists `RayTestOptions` as `excludeActor`, `debugColor` and `debugLifetime`.
- **What happened (#17 line of sight):** the installed options also include:
  - `excludeTriggers`: triggers are hit unless set; line of sight needed it.
  - `collisionFilter`.
  - `resolveActor`.
  - `debug`, which defaults to on and draws every ray whenever physics debug is enabled.
  - `rayTestFromCamera` also exists.
- **Behaviour:**
  - Only **one** actor can be excluded, and the character controller's collision group is private and not configurable.
  - Rays are non-solid: a collider yields separate entry and exit hits, and a ray starting inside a collider hits its far side.
  - The project re-casts from just past each unit hit (`src/services/combat/physics-line-of-sight.ts`).
  - `rayTest` only hits physics colliders, so visual-only meshes are invisible to it.
- **Change:** list the full options, and state the single-exclude limit, entry/exit hits and colliders-only.

### 20. `AssetLoader` path methods: no cache, no clone, and animated models

- **Skill:** `services-world-assets.md` lists `getModelAtPath` (→ `Object3D`) and `getGltfAtPath` (→ full GLTF) without caveats.
- **What happened (spike #2, #33, engine `asset-loader.js`):**
  - `getModelAtPath`, `getGltfAtPath` and `getAudioAtPath` load and parse the file on **every** call; there is no cache.
  - `getModelAtPath` returns only `.scene`, so the animations are dropped. Use `getGltfAtPath` for anything animated.
  - Skinned copies need `SkeletonUtils.clone`. The project caches one promise per path and clones per instance (`src/services/character-asset-library.ts`); three animated copies of one enemy were verified.
  - The return types come from `three-stdlib`, not `@types/three`. Type them as `Awaited<ReturnType<AssetLoader['getGltfAtPath']>>`.
  - Paths are relative to the site base, and a leading slash works (`/assets/...`).
- **Change:** add these to the AssetLoader section, and say "cache the promise and clone per instance" for path loading.

### 21. The production bundle crashes without an import-order fix

- **Skill:** SKILL.md's project structure has `main.tsx` simply rendering `<App/>`.
- **What happened (spike #2, ADR 0001):**
  - The built bundle crashed on load with `Cannot access 'AssetResourceLoader' before initialization`, including the #1 bootstrap.
  - `@hology/core` has an import cycle (`materializer` ↔ `asset-resource-loader`) that only survives bundling if the materializer is evaluated first.
  - `npm run build` succeeds either way, so only a browser run of the built output catches it.
  - **Fix:** the first line of `src/main.tsx` is `import '@hology/core/scene/materializer'`.
- **Change:** in SKILL.md's project-structure section, put this as the first import of `main.tsx`. Recommend smoke-testing `vite preview` of the production build, not just `vite dev`. Note that `@hology/webgpu-renderer` must stay a dependency even under WebGL, because `@hology/core` imports it at build time.

### 22. Default backend is WebGPU; the `rendering` prop is undocumented

- **Skill:** `ui-and-react.md` lists the `HologyScene` props as `gameClass`, `sceneName`, `dataDir`, `xr`, `shaders`, `actors` and `components`.
- **What happened (#1, #7, #55):**
  - The engine defaults to `backend ?? "webgpu"` (engine check). The project forces `rendering={{ backend: 'webgl' }}`.
  - The `rendering` prop also carries shadows, bloom, pixel ratio, MSAA and an FPS cap.
  - Typing it as `RenderingViewOptions` failed with TS2322; the right type is `RenderingConfig` from `@hology/core/gameplay`.
  - The renderer is built once when the scene mounts, so later prop changes are ignored.
- **Change:**
  - Document the `rendering` prop and its type.
  - Say the default backend is WebGPU and how to force WebGL.
  - Note that VFX falls back to CPU on WebGL (#3).

### 23. Lighting, tone mapping and shadows

- **Skill:** the `World` section has `directionalLight.intensity/direction`. There's nothing on the engine's own lights, fog, tone mapping or shadows.
- **What happened:** #7 spent about 30 tool calls pretty-printing minified engine source; #92/#97 dealt with shadow flicker and blur; #55 measured performance.
  - **Engine-made lights and fog.** Every scene gets a hemisphere fill named `default_ambient`, a cascaded-shadow sun and an exponential fog. The default fog colour `#0267b2` caused the "teal tint" bug.
  - **Sun colour.** `world.directionalLight` has no colour setter; set colour on each cascade `DirectionalLight` found in the scene.
  - **Tone mapping.** `renderer.toneMapping` is reset every frame. The working route is spawning a `PostProcessVolume` (root `@hology/core`) and setting `settings.tonemapMapping`/`tonemapExposure`.
  - **Shadow receivers.** Meshes need `receiveShadow = true` or no shadows show on them.
  - **CSM after an FOV change.** The cascade frustums are fitted once, when the camera is assigned at the default FOV, and never refitted. After changing FOV, call `inject(RenderingView)` (from `@hology/core/rendering`) and then `csm?.updateFrustums()`. That narrowed the cascades by about 24% (#97).
  - **Cascade refresh.** Far shadow cascades redraw on a hard-coded `[22, 40, 60, 120]` ms schedule, which made the mage's shadow blink (#92). `RenderingConfig` can't set it, but `RenderingView.options.shadows.cascadeUpdateIntervals` is re-read every frame.
  - **Draw calls.** Shadow cascades were about 270 of 318 draw calls at the camp (#55).
  - **Render stats.** The renderer turns `info.autoReset` off and resets once at frame end; read stats just before that reset.
  - **Engine garbage.** Hology's WebGL frame setup allocates per visible object (about 0.5 MB per frame here), so object count drives GC.
- **Change:** add a short "Rendering, lighting & shadows" reference covering `RenderingView`, the engine-created lights and fog, the `PostProcessVolume` route for tone mapping, CSM refit and cascade intervals, and `receiveShadow`.

### 24. Camera: drive `getBaseCamera()`; shake is built in

- **Skill:** SKILL.md and `services-world-assets.md` do `const camera = this.view.getCamera()` and move it in `onLateUpdate`.
- **What happened (#16, camera-shake refactor, engine `render.d.ts`):**
  - 0.0.282 separates base, source and presentation cameras, with overrides and shake. `getCamera()` returns the **rendered** camera, which can be a shake copy rebuilt in `refreshCameraPresentation()` after `lateTick`.
  - The project drives `getBaseCamera()` and uses `getCamera()` only for raycasts and projection (`src/services/isometric-camera.ts`).
  - The engine only resizes the base camera on window resize, so an override camera has to copy its lens (`title-camera-pan.ts`).
  - An agent hand-wrote a camera shake, then found `ViewController.applyCameraShake` and `cameraShakeIntensity` and rewrote it on those. The built-in shake moves only the rendered camera, so camera-relative movement stays steady.
  - Confidence: medium. The split is confirmed in the types, but no session saw a bug from writing to `getCamera()` without shake.
- **Change:** use `getBaseCamera()` for a camera you control, and `getCamera()` for picking and projection. Mention `applyCameraShake` and `cameraShakeIntensity`.

### 25. Sound: audio context and listener position

- **Skill:** `services-world-assets.md` "Sound" covers `THREE.Audio` with `view.audioListener` and `getAudioAtPath`.
- **What happened (#25, `docs/architecture.md`):**
  - **Suspended audio context.** Hology never resumes the browser's audio context, which starts suspended. Sounds played before the first click or key press all fire at once when it resumes, so plays must wait for a user gesture. Headless Chromium ignores the autoplay rule, so tests can't catch this.
  - **Decoding works while suspended.** `getAudioAtPath` loads and decodes while the context is suspended, so preloading at boot is fine.
  - **Listener position.** `audioListener` rides on the view camera, which was 18–32 m from the player in this isometric game. Positional sounds needed an inverse distance model with a reference distance beyond the farthest zoom.
  - **Pause mute.** Pausing mutes the listener; see #12.
- **Change:** add the gesture requirement and the listener-on-camera note.

### 26. `@hology/core/gameplay` can't be imported under Vitest

- **What happened (#11 probe):** importing `@hology/core/gameplay` in a Vitest test fails with an ESM directory-import error from `@hology/nebula`. The project's architecture rule keeping `src/game-logic` engine-free exists largely because of this.
- **Change:** add a "Testing" note to SKILL.md:
  - Hology modules don't load in Vitest/Node as-is.
  - Keep testable logic in engine-free modules.
  - Test the engine layer with Playwright, using a production-build smoke test as well as dev, because of #21.

### 27. `BaseActor` reserves `id` and other members

- **What happened (E7 gate):** an actor subclass declared its own `id` field. Typecheck broke in a pushed commit, and at runtime the field overwrote the engine's actor id.
- **Change:** in `actors-and-components.md`, list the `BaseActor` members you must not shadow: `id`, `object`, `position`, `rotation`, `disposed`, … Tell agents to check `base-actor.d.ts` before adding fields with generic names.

### 28. Version notes are pinned to 0.0.232; several are stale for 0.0.282

- **Skill:** SKILL.md, `physics.md`, `animation.md`, `ai-and-navigation.md` and `services-world-assets.md` label notes "`@hology/core@0.0.232`".
- **Status for 0.0.282:**
  - `kinematicVelocityBased` still exists. The note is correct; only the label is stale.
  - `transitionsOnComplete`: still true, and more precisely the `duration − 0.5 s` rule (#15).
  - **`SequenceNode` returns `SUCCESS` while a child is `RUNNING`: no longer true.** Engine check of 0.0.282 `bt.js`: `if (s === NodeState.RUNNING) return s`, so it now propagates `RUNNING` normally. The project never used behavior trees, so this is a source check only, not a session finding. Remove or re-verify the note.
  - The AssetLoader inventory is labelled 0.0.232. Spot-checked methods still exist; 0.0.282 also has `World.spawnActor(type, pos, rot, options)` and `spawnActorSync`.
- **Change:** relabel to 0.0.282 (or "verified on 0.0.282"), drop the stale `SequenceNode` note, and tighten the `transitionsOnComplete` note.

### 29. Small API corrections

All checked against the 0.0.282 `.d.ts`/`dist`:

- **`getScreenPosition`** returns `THREE.Vector3 | null` and takes optional `target` and `viewportSize`. The skill says `{ x, y }` "or nothing". Projection belongs in late update: in `onUpdate` it drifted about 1 px; in late update, none.
- **React hooks.** `@hology/react` exports `useRenderUpdate`, `useRenderLateUpdate`, `useService`, `useActorQuery` and `useObservable`. `useRenderLaterUpdate` does **not** exist, so resolve the skill's hedge in favour of `useRenderLateUpdate`, and add `useObservable`.
- **`ViewController.onUpdate()`/`onLateUpdate()`** take an optional actor and return `Observable<number>`.
- **`CharacterAnimationComponent.getFullBodyAction()`** is typed non-null but returns `null` until the first `play()`.
- **Collider limit.** Hology warns above 128 colliders per physics body (`src/content/zones/glimmerwood/walls.ts`). Collision shapes have `.withOffset()`/`.withRotation()`, used for tree trunks.
- **Removing actors.** `world.removeActor` runs `onEndPlay` and `disposed`, but does not dispose geometry or materials.
- **Signals.** `@preact/signals-react` and its Babel transform had to be installed; nothing in `@hology/*` pulls them in. The skill says the React template installs them, so add "check `package.json`; install if missing".

### 30. [editor-less] Data-folder and auto-collider claims

- **Skill:** SKILL.md says `public/data/` is "engine data written by the editor — don't hand-edit". `physics.md` says "Imported models auto-generate a fitting shape".
- **What happened (spike #2, #26, #4):**
  - **Hand-written data works.** Scene JSON (`scene/<name>.json` plus `scene-blob/<name>.json`, where every object needs `position`, `rotation` and `scale`), texture assets (`{ id, name, type: 'texture', fileKey, fileFormat }` with the file at `public/data/asset-resources/<fileKey>`) and VFX assets all load in dev and in production. Schemas are in `@hology/core/dist/scene/model.d.ts`.
  - **Avoid `importProjectAsset`.** The one from `@hology/vite-plugin` generates random UUIDs, stores an absolute `sourceFile` and refuses to re-import.
  - **Auto-generated shapes only for managed assets.** Only editor-managed model assets get an auto-generated collider. A model loaded by path and given to `MeshComponent` silently gets **no body**. For those, call `physics.addActor(this, [shape], { type: PhysicsBodyType.static })` in `onInit` after the transform is set.
- **Change:**
  - Qualify "don't hand-edit" with "unless the project has no editor", and point to `model.d.ts`.
  - In `physics.md`, say auto-shapes apply to managed assets only, and show the `addActor` route for path-loaded models.

---

## Skill claims the sessions confirmed

These were exercised and held up. Don't "fix" them.

- **Services and actors.** `inject()` works in field initializers and service constructors, including for engine services such as `RenderingView` and `VfxService`. `@Service()` singletons and `GameInstance.onStart` work.
- **Spawning and removal.** `world.spawnActor(Class, pos, rot)` works, also for engine built-ins (`NavMesh`, `PostProcessVolume`). `removeActor` runs `onEndPlay` and `disposed` once, so removing mid-update is safe. `takeUntil(this.disposed)` works. `ActorComponent.onEndPlay` exists.
- **Physics bodies and shapes.** `physics.addActor` with static bodies, multiple shapes, `CylinderCollisionShape`, `ConvexPolyhedronCollisionShape` and `TrimeshCollisionShape` (non-indexed geometry too) works. `PhysicalShapeMesh` with `BoxCollisionShape` works for the ground. `MeshComponent` with a plain mesh gives a visual only.
- **Physics events.** `physics.beforeStep`/`afterStep` exist (`Subject<number>`).
- **Ray tests.** `rayTest` with a reused `RayTestResult`; `excludeActor` matters, because one probe hit the player's own capsule. The `hasHit`/`hitPoint`/`actor` fields work.
- **Character movement.** `maxSpeed`, `maxSpeedBackwards`, `maxSpeedSprint`, `colliderRadius`, `colliderHeight`, `rotateToMovementDirection` and `groundAccelerationRate` work. The component sets `ignoreForNavMesh`.
- **Animation.** `CharacterAnimationComponent` `setup(model)` and `play(clip, { loop })` crossfade, and `loop: false` holds the last frame.
- **Input.** `Keybind(key, shift?, ctrl?)`, `Mousebind` and `Wheelbind` signatures are right. `setWheelbind` zoom works, and calling `input.start()` more than once is harmless.
- **ViewController.** `view.paused` stops rendering and input, and `pausedChanged` exists. `onLateUpdate` works for camera follow.
- **Navigation.** `findPath` returns `{ success, path }`, and `findClosestPoint` returns `Vector3 | null` (null before ready).
- **Audio.** `getAudioAtPath('/assets/…')` and `audioListener` with `Audio`/`PositionalAudio` work.
- **Shaders.** `NodeShaderMaterial` with `standardMaterial` gets the same lighting as built-ins. `uniformFloat` + `uniforms` + `material.uniforms.x.value` works.
- **VFX imports.** `VfxService`, `VisualEffect` and `VfxInstancePool` import from `@hology/core/gameplay`.
- **React overlay.** `HologyScene` renders children in `div.hology-overlay`. `useService` plus Preact signals on services drive the HUD.
- **Import paths.** The cheat-sheet paths resolve. The root `rxjs` must match the version `@hology/core` pins (7.8.1), or operators and types won't interoperate.

## Not covered (no evidence either way)

The project never used these, so nothing here confirms or refutes them:

- Behavior trees
- `@Parameter`/`ParameterDefinition`
- Prefabs
- `TriggerVolume`
- `ThirdPersonCameraComponent`
- Root motion
- `getModelByAssetName`
- Editor workflows
- XR

The `SequenceNode` correction in #28 is from source only.
