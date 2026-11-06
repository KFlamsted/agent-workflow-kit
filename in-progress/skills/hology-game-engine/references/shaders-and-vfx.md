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

VFX (particle systems, custom shaders, materials, animation, post-processing combined) has dedicated editor tooling. Create effect assets in the editor, then place them in scenes or spawn them dynamically from gameplay code. Use this tooling rather than assembling particle systems by hand in Three.js. See the [VFX asset documentation](https://docs.hology.app/visual-effects/vfx-assets.md) and emitter/flipbook/lens-flare tutorials for authoring specifics.

### Spawn by asset ID

Inject `VfxService` during construction or field initialization, create the effect from an async lifecycle method, then start it:

```typescript
import { Actor, BaseActor, VfxService, inject } from '@hology/core/gameplay'

@Actor()
class ImpactEffect extends BaseActor {
  private vfx = inject(VfxService)

  async onInit() {
    const vfxActor = await this.vfx.createFromAssetId('your-asset-id')
    vfxActor.play()
  }
}
```

### Select the effect in the editor

Use a `VisualEffect` parameter when designers should select the asset per actor instance:

```typescript
import { Actor, BaseActor, Parameter, VisualEffect } from '@hology/core/gameplay'

@Actor()
class ConfigurableEffect extends BaseActor {
  @Parameter()
  private visualEffect: VisualEffect

  async onInit() {
    const vfxActor = await this.visualEffect.create()
    vfxActor.play()
  }
}
```

The public documentation defines `VisualEffect.create()` with no argument. A project's installed declarations may instead require a parent argument; when targeting such a version, follow those declarations.

The returned VFX actor provides the documented `play()` and `stop()` controls, plus a writable `timescale` speed multiplier (for example, `vfxActor.timescale = 0.5`). The parameter workflow preserves editor configuration; the service workflow is convenient for runtime spawning by known asset ID.
