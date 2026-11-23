# Shaders & VFX (deep reference)

Covers Hology's TypeScript (node) shaders and its VFX tooling. Read this for custom materials/visual styles or particle effects. Prefer the built-in `NodeShaderMaterial` and VFX tooling over raw GLSL or hand-built particle systems.

## When you need custom shaders

Everything rendered uses shaders, but built-in materials already cover color/texture/lighting. Reach for a custom shader when you need:
- **Vertex animation** — move geometry on the GPU (spinning, foliage swaying in wind) — far cheaper than doing it on the CPU per frame.
- **Material mixing** — render different looks on different parts of one mesh (e.g. pick color by surface angle or vertex position).

The rolling-ball tutorial uses this to two-tone a ball so you can see it roll:
```typescript
const ballMaterial = new NodeShaderMaterial({
  color: select(varyingAttributes.position.y.lt(0), rgba(0xffff00, 1), rgba(0x00ffff, 1))
})
```

## How Hology treats three.js materials

Hology renders every material through its own node pipeline and keeps one internal render material per three.js material **instance**:

- Plain built-in materials (colour, map, standard params) work as-is.
- `onBeforeCompile` and other shader patches are silently ignored, even a forced solid-red output. Use `NodeShaderMaterial` (with `standardMaterial(...)` for lit surfaces).
- Changing `transparent` (or another flag that selects a program) on a live material, even with `needsUpdate`, leaves it in the old pass; a dissolving mesh drew a white hole. Assign a fresh material created with the flag set instead.
- Each new material variant (e.g. the first transparent copy of a skinned or double-sided material) compiles on first use, freezing the game 110–300 ms. Prewarm variants at load when a hitch matters.

## TypeScript (node) shaders

Custom shaders are defined in project source as either a TypeScript `NodeShader` class or a GLSL-backed `Shader` class. Import the class in the configured shader registry—conventionally `src/shaders/index.ts`—and add it to that file's default-exported object to make it available to Hology and the editor. When you need a reusable editor-authored material, create or configure a material asset in the editor and select the registered custom shader.

Minimal registered shader classes (https://docs.hology.app/shaders/creating-shaders.md):

```typescript
import { rgb, standardMaterial } from '@hology/core/shader-nodes'
import { NodeShader, NodeShaderOutput, Parameter, Shader } from '@hology/core/shader/shader'
import { Color, Material, ShaderMaterial } from 'three'

export class ExampleShader extends NodeShader {
  @Parameter() color: Color = new Color(0xff0000)

  output(): NodeShaderOutput {
    return { color: standardMaterial({ color: rgb(this.color) }) }
  }
}

export class MyGlslShader extends Shader {
  build(): Material {
    return new ShaderMaterial({
      vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `void main() { gl_FragColor = vec4(1., 0., 0., 1.); }`
    })
  }
}
```

Shader parameters (`@Parameter()`, https://docs.hology.app/shaders/shader-parameters.md) are editable per material in the editor. Supported types: `number`, `boolean`, `string`, `Vector2`, `Vector3`, `Color`, `Euler`. Export shader classes from the `index.ts` in the configured shaders directory.

You can also construct a `NodeShaderMaterial` directly in gameplay code with the `@hology/core/shader-nodes` library. This direct material construction complements registered, editor-facing shader classes rather than replacing them:

```typescript
import { rgb, standardMaterial, translateY, sin, float, NodeShaderMaterial, timeUniforms } from '@hology/core/shader-nodes'
import { SphereGeometry, Mesh } from 'three'

const time = timeUniforms.elapsed
const color = standardMaterial({ color: rgb(0x00ff00) })
const bounce = translateY(sin(time.multiply(float(5))))       // GPU vertex animation

const material = new NodeShaderMaterial({ color, transform: bounce })
const mesh = new Mesh(new SphereGeometry(5, 30, 15), material)
```

`NodeShaderMaterial` takes node graphs for slots like `color` (fragment) and `transform` (vertex). Common building blocks: `rgb`/`rgba`, `float`, math ops (`.multiply`, `.add`, `sin`, ...), `select(condition, a, b)`, `varyingAttributes` (e.g. `.position`), `timeUniforms`, `standardMaterial`. See the shader sub-pages (types, math-functions, attributes, varying, uniforms, textures, lighting) for the full node catalog.

Stage rules (0.0.282):
- `color` (fragment) graphs read `varyingTransformed.*` and `varyingAttributes.*`; `transformed.*` is vertex-stage only and yields an invalid program in `color`.
- `fresnelEffect()` produced an invalid program. Build it by hand: `pow(oneMinus(saturate(dot(normalize(varyingTransformed.viewDir), normalize(varyingTransformed.normal)))), k)`.
- Compile errors surface poorly. When a node material renders nothing, bisect the graph.

## Uniforms

Declare a named uniform in the node graph, give it a default in `uniforms`, and update it at runtime on the material (https://docs.hology.app/shaders/typescript-shaders/uniforms.md):

```typescript
import { uniformFloat, float, sin, translateY, rgb, standardMaterial, NodeShaderMaterial } from '@hology/core/shader-nodes'
import { Clock } from 'three'

const clock = new Clock()
const uniformTime = uniformFloat('time')
const material = new NodeShaderMaterial({
  color: standardMaterial({ color: rgb(0x00ff00) }),
  transform: translateY(sin(uniformTime.multiply(float(5)))),
  uniforms: { time: { value: 0 } }
})

material.uniforms.time.value = clock.getElapsedTime()   // like a Three.js ShaderMaterial
```

Other helpers: `uniformBool/Vec2/Vec3/Vec4/Mat2/Mat3/Mat4/Sampler2d`. Prefer `timeUniforms.elapsed` when you only need elapsed time.

## VFX

VFX (particle systems, custom shaders, materials, animation, post-processing combined) has dedicated editor tooling. Create effect assets in the editor, then place them in scenes or create them from gameplay code. Use this tooling rather than assembling particle systems by hand in Three.js. See the [VFX asset documentation](https://docs.hology.app/visual-effects/vfx-assets.md) and emitter/flipbook/lens-flare tutorials for authoring specifics.

### Create effects at load, never during play

The first time a VFX instance or pool copy is materialised during play, Hology recompiles the whole scene in the background (`Compile in progress, skipping render`). Meanwhile the loop keeps ticking and `applyDepthMaterial()` sets `mesh.material` to `null` on non-shadow-casting meshes. On Firefox the particle renderer then throws `mesh.material is null` and the screen goes black; Chromium survives, so Chromium-only e2e misses it. Game code reading `mesh.material` crashes too (e.g. `CSM.setupMaterial`).

- Create every effect while loading via `VfxService.createInstancePool(...)` and reuse it.
- Size each pool for peak concurrency (a queued cast starting while the last one fades). Each new radius or variant is a separate pool; pre-create those too.
- Keep your own reference to materials instead of reading `mesh.material` per frame, and null-guard material traversals.
- Test in Firefox.

### Runtime API (0.0.282)

`VfxActor` is an authoring/compatibility adapter; gameplay can own `VfxInstance`s directly. `VfxService` provides `createInstance`, `createInstanceFromAssetId` and `createInstancePool`; `VfxInstancePool` is exported from `@hology/core/gameplay`.

```typescript
// while loading, before play starts (arguments: see the installed VfxService declarations)
this.pool = await this.vfx.createInstancePool(/* … */)

// on a gameplay event
const fx = this.pool.get()   // restarted but paused
fx.play()
// when done: this.pool.release(fx)
```

- `get()` restarts an instance but leaves it paused; call `play()` after every `get()`.
- `release()` returns it and kills its particles; `stop()` only stops emission; `dispose()` frees it.
- Under the WebGL backend every effect logs a harmless "GPU VFX requires the WebGPU renderer … Falling back to CPU" warning.

### Select the effect in the editor

Use a `VisualEffect` parameter when designers should select the asset per actor instance. In 0.0.282 `create(parent)` requires a parent:

```typescript
import { Actor, BaseActor, Parameter, VisualEffect } from '@hology/core/gameplay'

@Actor()
class ConfigurableEffect extends BaseActor {
  @Parameter()
  private visualEffect: VisualEffect
  private effect: Awaited<ReturnType<VisualEffect['create']>>

  async onInit() {
    this.effect = await this.visualEffect.create(parent) // parent type: see the installed declaration
  }

  trigger() {
    this.effect.play()
  }
}
```

`create(parent)` materialises a new effect, so run it while loading (an actor placed in the scene or spawned before play), never from a gameplay event. The returned VFX actor provides `play()`, `stop()` and a writable `timescale` speed multiplier.

### VFX without the editor

A VFX asset is plain data: `{ id, name, type: 'vfx', vfx: { emitters } }`. Pass it to `new VisualEffect(asset)` or `VfxService.createFromAsset(asset)`, or write it as JSON under `public/data/asset/` and load it by id. `EmitterDataConstructor()` comes from `@hology/core/effects/vfx/vfx-asset`; param values are `{ type: SerializedParamType, value }`; `output.texture` is a texture **asset id**.
