# UI with React (deep reference)

Covers rendering a Hology game inside a web UI and connecting UI to gameplay state. Read this for HUDs, menus, and overlays. UI is normal web tech (HTML/CSS/React/Vue/Angular) — don't build HUDs as 3D meshes unless intentionally diegetic.

Hology runs in the browser, so the UI is a normal web app layered over the game canvas. React is the suggested stack and ships with a helper library.

## HologyScene

Mount the engine with the `HologyScene` component and pass the config (the props below match the React project template, plus `rendering`).

```tsx
import { HologyScene } from '@hology/react'   // provided by the React template
import { StrictMode } from 'react'
import Game from './services/game'
import actors from './actors'
import components from './components'
import shaders from './shaders'

function App() {
  return (
    <HologyScene gameClass={Game} sceneName="demo" dataDir="data"
      shaders={shaders} actors={actors} components={components}
      rendering={{ backend: 'webgl' }}>
      {/* DOM overlay UI goes here, rendered on top of the game */}
      <StrictMode>
        <PlayerHealthDisplay />
      </StrictMode>
    </HologyScene>
  )
}
```

**Never wrap `HologyScene` in `React.StrictMode`** (remove the Vite template's wrapper in `main.tsx`; wrapping overlay children, as above, is fine). StrictMode's dev double mount starts two Hology runtimes sharing one `WebGLRenderer` (`window.renderer`); the first one's shutdown disposes it mid-`compileAsync`, and with `KHR_parallel_shader_compile` (every real GPU) boot dies with `Cannot read properties of undefined (reading 'isReady')` in `checkMaterialsReady`. Headless SwiftShader lacks the extension, so e2e stays green; fake the extension in e2e to catch it.

- **gameClass** — your `GameInstance` subclass.
- **sceneName** — scene to load (e.g. `'demo'`).
- **dataDir** — path to game data (`'data'`).
- **xr** — `xr={{ enabled: true }}` enables VR (https://docs.hology.app/user-interfaces/vr.md).
- **shaders / actors / components** — the objects re-exported from their `src/*/index.ts` registries. Pass `components` when the project defines serialized custom actor components; projects without custom components do not need a non-empty component registry.
- **rendering** — `RenderingConfig` from `@hology/core/gameplay` (not `RenderingViewOptions`, which fails with TS2322): `backend`, shadows, bloom, pixel ratio, MSAA, FPS cap. The default backend is **WebGPU**; pass `{ backend: 'webgl' }` to force WebGL (VFX then falls back to CPU, see `shaders-and-vfx.md`). The renderer is built once on mount, so later prop changes are ignored.

## Required overlay CSS

So pointer events reach the canvas (for the `PointerEvents` service) while still working on your own HTML elements:

```css
.hology-overlay { pointer-events: none }
.hology-overlay * { pointer-events: auto }
.hology-overlay .hud, .hology-overlay .screen-fade { pointer-events: none } /* full-screen wrappers */
```

`.hology-overlay *` outranks a plain class selector, so a full-screen or layout wrapper (HUD root, fade layer) with `.screen-fade { pointer-events: none }` still swallows every canvas click. Give such wrappers `none` with a selector at least as specific as `.hology-overlay .x`; only interactive panels get `auto`.

## Hooks (inside `HologyScene`)

- **`useService(ServiceClass)`** — get a gameplay service instance (read global state to display).
- **`useActorQuery(...)`** — query actors in the world; re-renders when matching actors are added/removed.
- **`useRenderUpdate(fn)`** — run `fn` before every frame.
- **`useRenderLateUpdate(fn)`** — like above but after other update functions. (The docs' `useRenderLaterUpdate` spelling does not exist in `@hology/react` 0.0.26.)
- **`useObservable(observable)`** — subscribe a component to an RxJS observable.

## Overlaying UI at a world position

`ViewController.getScreenPosition(worldPos, target?, viewportSize?)` returns a `THREE.Vector3 | null` (screen `x`, `y`; `null` off-screen). Project in the late-update hook: from `onUpdate` timing the marker drifts about 1 px behind the camera.

```tsx
import { ViewController } from '@hology/core/gameplay'
import { useRenderLateUpdate, useService } from '@hology/react'
import { useRef } from 'react'
import { Vector3 } from 'three'

function WorldMarker({ position }: { position: Vector3 }) {
  const ref = useRef<HTMLDivElement>(null)
  const view = useService(ViewController)

  useRenderLateUpdate(() => {
    const pos = view.getScreenPosition(position)
    if (!ref.current) return
    ref.current.style.visibility = pos ? 'visible' : 'hidden'
    if (pos) {
      ref.current.style.left = pos.x + 'px'
      ref.current.style.top = pos.y + 'px'
    }
  })

  return <div ref={ref} style={{ position: 'absolute', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }} />
}
```

## Reacting to state changes with signals

React only re-renders when it knows state changed. The React template installs `@preact/signals-react` and its Babel transform; nothing in `@hology/*` pulls them in, so check `package.json` and install them if missing. expose gameplay state as signals and read `.value` in components.

```typescript
// service
import { Service } from '@hology/core/gameplay'
import { signal } from '@preact/signals-react'

@Service()
class PlayerState {
  health = signal(100)
}
export default PlayerState
```

```tsx
// component
function PlayerHealthDisplay() {
  const playerState = useService(PlayerState)
  return <h1>{playerState.health.value}</h1>   // re-renders when health.value changes
}
```

Update via `playerState.health.value = newValue` from gameplay code and the UI updates automatically. Any UI framework works, but signals (or your framework's reactivity) is the bridge between gameplay objects and the DOM.
