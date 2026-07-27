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

Write shaders in TypeScript instead of GLSL. The code builds a graph of nodes that compiles to GPU code — no runtime performance penalty, but you get types and reuse. You can create shader assets in the editor (see the "Creating shaders" doc) or build materials directly in code with the `@hology/core/shader-nodes` library.

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

## VFX

VFX (particle systems, custom shaders, materials, animation, post-processing combined) has dedicated editor tooling. Create effect assets in the editor, then place them in scenes or spawn them dynamically from gameplay code. Use this tooling rather than assembling particle systems by hand in Three.js. See the VFX doc pages (VFX assets, emitter/flipbook/lens-flare tutorials) for authoring specifics.
