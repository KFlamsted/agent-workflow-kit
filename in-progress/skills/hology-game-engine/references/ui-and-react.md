# UI with React (deep reference)

Covers rendering a Hology game inside a web UI and connecting UI to gameplay state. Read this for HUDs, menus, and overlays. UI is normal web tech (HTML/CSS/React/Vue/Angular) — don't build HUDs as 3D meshes unless intentionally diegetic.

Hology runs in the browser, so the UI is a normal web app layered over the game canvas. React is the suggested stack and ships with a helper library.

## HologyScene

Mount the engine with the `HologyScene` component and pass the config (the defaults below match the React project template).

```tsx
import { HologyScene } from '@hology/react'   // provided by the React template
import Game from './services/game'
import actors from './actors'
import shaders from './shaders'

function App() {
  return (
    <HologyScene gameClass={Game} sceneName="demo" dataDir="data" shaders={shaders} actors={actors}>
      {/* DOM overlay UI goes here, rendered on top of the game */}
      <PlayerHealthDisplay />
    </HologyScene>
  )
}
```

- **gameClass** — your `GameInstance` subclass.
- **sceneName** — scene to load (e.g. `'demo'`).
- **dataDir** — path to game data (`'data'`).
- **shaders / actors** — the objects re-exported from `src/shaders/index.ts` and `src/actors/index.ts`.

## Required overlay CSS

So pointer events reach the canvas (for the `PointerEvents` service) while still working on your own HTML elements:

```css
.hology-overlay { pointer-events: none }
.hology-overlay * { pointer-events: auto }
```

## Hooks (inside `HologyScene`)

- **`useService(ServiceClass)`** — get a gameplay service instance (read global state to display).
- **`useActorQuery(...)`** — query actors in the world; re-renders when matching actors are added/removed.
- **`useRenderUpdate(fn)`** — run `fn` before every frame.
- **`useRenderLaterUpdate(fn)`** — like above but after other update functions.

## Reacting to state changes with signals

React only re-renders when it knows state changed. The React template installs `@preact/signals-react`; expose gameplay state as signals and read `.value` in components.

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
