# Shaders & VFX

Docs: https://docs.hology.app/shaders/creating-shaders.md · https://docs.hology.app/visual-effects/vfx-assets.md

Built-in materials cover colour, texture and lighting. Write a custom shader for GPU vertex animation (spinning, foliage sway) or for mixing looks across one mesh, e.g. two-toning a ball so it visibly rolls:

```typescript
new NodeShaderMaterial({ color: select(varyingAttributes.position.y.lt(0), rgba(0xffff00, 1), rgba(0x00ffff, 1)) })
```

## How Hology treats three.js materials

Hology renders every material through its own node pipeline, with one internal render material per three.js material **instance**:

- Plain built-in materials work as-is.
- `onBeforeCompile` and other shader patches are silently ignored, even a forced solid-red output. Use `NodeShaderMaterial` (with `standardMaterial(...)` for lit surfaces).
- Changing `transparent` (or another flag that selects a program) on a live material, even with `needsUpdate`, leaves it in the old pass; a dissolving mesh drew a white hole. Assign a fresh material created with the flag set.
- Each new material variant (e.g. the first transparent copy of a skinned or double-sided material) compiles on first use, freezing the game 110–300 ms. Prewarm variants at load when a hitch matters.

## Registered shader classes

Define a `NodeShader` (TypeScript) or `Shader` (GLSL) class and add it to the default-exported object in the shader registry (`src/shaders/index.ts`). Designers then pick it on a material asset in the editor; its `@Parameter()` fields (`number`, `boolean`, `string`, `Vector2`, `Vector3`, `Color`, `Euler`) are editable per material.

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

## NodeShaderMaterial in gameplay code

```typescript
import { rgb, standardMaterial, translateY, sin, float, uniformFloat, NodeShaderMaterial, timeUniforms } from '@hology/core/shader-nodes'

const bounce = new NodeShaderMaterial({
  color: standardMaterial({ color: rgb(0x00ff00) }),                       // fragment slot
  transform: translateY(sin(timeUniforms.elapsed.multiply(float(5)))),     // vertex slot
})

const custom = new NodeShaderMaterial({
  color: standardMaterial({ color: rgb(0x00ff00) }),
  transform: translateY(sin(uniformFloat('time').multiply(float(5)))),
  uniforms: { time: { value: 0 } },
})
custom.uniforms.time.value = clock.getElapsedTime()
```

Building blocks: `rgb`/`rgba`, `float`, math ops (`.multiply`, `.add`, `sin`, …), `select(cond, a, b)`, `varyingAttributes`, `timeUniforms`, `standardMaterial`, `uniformBool/Vec2/Vec3/Vec4/Mat2/Mat3/Mat4/Sampler2d`. The shader doc sub-pages list the full catalog.

Stage rules (0.0.282):
- `color` graphs read `varyingTransformed.*` and `varyingAttributes.*`; `transformed.*` is vertex-only and yields an invalid program in `color`.
- `fresnelEffect()` produced an invalid program. Build it by hand: `pow(oneMinus(saturate(dot(normalize(varyingTransformed.viewDir), normalize(varyingTransformed.normal)))), k)`.
- Compile errors surface poorly. When a node material renders nothing, bisect the graph.

## VFX

Author effects (particles, shaders, materials, animation, post-processing) as VFX assets in the editor, then place them in scenes or create them from code.

### Create effects at load, never during play

The first time a VFX instance or pool copy is materialised during play, Hology recompiles the whole scene in the background (`Compile in progress, skipping render`). The loop keeps ticking and `applyDepthMaterial()` sets `mesh.material` to `null` on non-shadow-casting meshes. On Firefox the particle renderer then throws `mesh.material is null` and the screen goes black; Chromium survives, so Chromium-only e2e misses it. Game code reading `mesh.material` crashes too (e.g. `CSM.setupMaterial`).

- Create every effect while loading via `VfxService.createInstancePool(...)` and reuse it.
- Size each pool for peak concurrency (a queued cast starting while the last one fades). Each radius or variant is a separate pool; pre-create those too.
- Keep your own material references instead of reading `mesh.material` per frame, and null-guard material traversals.
- Test in Firefox.

### Runtime API (0.0.282)

`VfxService` provides `createInstance`, `createInstanceFromAssetId` and `createInstancePool`; `VfxInstancePool` is exported from `@hology/core/gameplay`. `VfxActor` is an authoring adapter; gameplay can own `VfxInstance`s directly.

```typescript
this.pool = await this.vfx.createInstancePool(/* … see the installed VfxService declarations */)  // while loading

const fx = this.pool.get()   // restarted but paused
fx.play()                    // required after every get()
this.pool.release(fx)        // returns it and kills its particles; stop() only stops emission; dispose() frees it
```

Under WebGL every effect logs a harmless "GPU VFX requires the WebGPU renderer … Falling back to CPU" warning.

### Designer-selected effect

```typescript
@Parameter() private visualEffect: VisualEffect
private effect: Awaited<ReturnType<VisualEffect['create']>>

async onInit() {
  this.effect = await this.visualEffect.create(parent) // 0.0.282 requires a parent; type: see the installed declaration
}
```

`create(parent)` materialises a new effect, so call it while loading (an actor placed in the scene or spawned before play), never from a gameplay event. The result has `play()`, `stop()` and a writable `timescale`.

### VFX without the editor

A VFX asset is plain data: `{ id, name, type: 'vfx', vfx: { emitters } }`. Pass it to `new VisualEffect(asset)` or `VfxService.createFromAsset(asset)`, or write it as JSON under `public/data/asset/` and load it by id. `EmitterDataConstructor()` comes from `@hology/core/effects/vfx/vfx-asset`; param values are `{ type: SerializedParamType, value }`; `output.texture` is a texture **asset id**.
