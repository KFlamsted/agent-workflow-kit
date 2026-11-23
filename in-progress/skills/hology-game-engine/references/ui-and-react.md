# UI with React

Docs: https://docs.hology.app/user-interfaces/using-react.md

The UI is a normal web app (React recommended; Vue/Angular work) layered over the game canvas. Build HUDs in the DOM, not as 3D meshes, unless intentionally diegetic.

## HologyScene

```tsx
import { HologyScene } from '@hology/react'
import { StrictMode } from 'react'

function App() {
  return (
    <HologyScene gameClass={Game} sceneName="demo" dataDir="data"
      shaders={shaders} actors={actors} components={components}
      rendering={{ backend: 'webgl' }}>
      <StrictMode>{/* DOM overlay UI */}<PlayerHealthDisplay /></StrictMode>
    </HologyScene>
  )
}
```

**Never wrap `HologyScene` in `StrictMode`** (wrapping overlay children is fine). Its dev double mount starts two runtimes sharing one `WebGLRenderer` (`window.renderer`); the first one's shutdown disposes it mid-`compileAsync`, and with `KHR_parallel_shader_compile` (every real GPU) boot dies with `Cannot read properties of undefined (reading 'isReady')` in `checkMaterialsReady`. Headless SwiftShader lacks the extension, so e2e stays green; fake the extension in e2e to catch it.

Props:
- **gameClass**: the `GameInstance` subclass. **sceneName**, **dataDir** (`'data'`).
- **shaders / actors / components**: the registry objects. `components` only when the project has serialized custom components.
- **xr**: `{ enabled: true }` for VR ([docs](https://docs.hology.app/user-interfaces/vr.md)).
- **rendering**: `RenderingConfig` from `@hology/core/gameplay` (`RenderingViewOptions` fails with TS2322): `backend`, shadows, bloom, pixel ratio, MSAA, FPS cap. The default backend is **WebGPU**; `{ backend: 'webgl' }` forces WebGL (VFX then falls back to CPU). Read once on mount; later changes are ignored.

## Overlay CSS

Lets clicks reach the canvas (`PointerEvents`) while your own elements stay interactive:

```css
.hology-overlay { pointer-events: none }
.hology-overlay * { pointer-events: auto }
.hology-overlay .hud, .hology-overlay .screen-fade { pointer-events: none } /* full-screen wrappers */
```

`.hology-overlay *` outranks a plain class selector, so a full-screen wrapper styled `.screen-fade { pointer-events: none }` still swallows every canvas click. Give wrappers `none` with a selector at least as specific as `.hology-overlay .x`; only interactive panels get `auto`.

## Hooks (inside `HologyScene`)

- `useService(ServiceClass)`: a gameplay service instance.
- `useActorQuery(...)`: actors in the world; re-renders as matches are added/removed.
- `useRenderUpdate(fn)`: before every frame. `useRenderLateUpdate(fn)`: after other updates (the docs' `useRenderLaterUpdate` doesn't exist in `@hology/react` 0.0.26).
- `useObservable(observable)`: subscribe to an RxJS observable.

## UI at a world position

Project in the late-update hook; from `onUpdate` timing the marker trails the camera by about 1 px.

```tsx
function WorldMarker({ position }: { position: Vector3 }) {
  const ref = useRef<HTMLDivElement>(null)
  const view = useService(ViewController)
  useRenderLateUpdate(() => {
    const pos = view.getScreenPosition(position)   // Vector3 | null (off-screen)
    if (!ref.current) return
    ref.current.style.visibility = pos ? 'visible' : 'hidden'
    if (pos) { ref.current.style.left = pos.x + 'px'; ref.current.style.top = pos.y + 'px' }
  })
  return <div ref={ref} style={{ position: 'absolute', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
}
```

## Signals

Expose gameplay state as `@preact/signals-react` signals and read `.value` in components; writing `.value` from gameplay re-renders the UI. The React template installs the package and its Babel transform, but nothing in `@hology/*` pulls them in, so install them if missing.

```typescript
@Service()
class PlayerState { health = signal(100) }

function PlayerHealthDisplay() {
  return <h1>{useService(PlayerState).health.value}</h1>
}
```
