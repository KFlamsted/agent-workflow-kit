# Player Input

Docs: https://docs.hology.app/gameplay/player-input.md

`InputService` separates **keybinds** (key/mouse) → **actions** (intent) → **callbacks**, so keys can be rebound (e.g. from persistent storage) without touching gameplay code.

## Action ids

Each action id has exactly one toggle callback and one delta callback; binding again replaces the previous one. Use string ids (`'camera.zoom'`) or one shared enum for the whole game: two services with their own numeric enums both start at 0, so one silently overwrites the other's callbacks.

## Player controller

Keep input setup and the possessed character in a `@Service()`:

```typescript
@Service()
class PlayerController {
  private input = inject(InputService)

  constructor() {
    this.input.setKeybind(InputAction.jump, new Keybind(' '))          // Keybind(key, shift?, ctrl?)
    this.input.setKeybind(InputAction.sprint, new Keybind('Shift'))
    this.input.setKeybind(InputAction.moveForward, new Keybind('w'))   // likewise s, a, d
    this.input.setMousebind(InputAction.rotate, new Mousebind(0.01, true, 'x'))        // (sensitivity, flipped, axis); movement only
    this.input.setMousebind(InputAction.rotateCamera, new Mousebind(0.003, false, 'y'))
    this.input.setWheelbind(InputAction.zoomCamera, new Wheelbind(0.0003, false))      // (sensitivity, flipped)
    this.input.start()
  }

  possess(character: Character) {
    const move = character.movement.directionInput
    this.input.bindToggle(InputAction.jump, character.movement.jumpInput.toggle)       // cb(active: boolean)
    this.input.bindToggle(InputAction.sprint, character.movement.sprintInput.toggle)
    this.input.bindToggle(InputAction.moveForward, move.togglePositiveY)               // NegativeY, NegativeX, PositiveX
    this.input.bindDelta(InputAction.rotate, character.movement.rotationInput.rotateY) // cb(delta: number)
    this.input.bindDelta(InputAction.rotateCamera, character.thirdPersonCamera.rotationInput.rotateX)
    this.input.bindDelta(InputAction.zoomCamera, character.thirdPersonCamera.zoomInput.increment)
  }
}
```

When rebinding to a new character, the third-person tutorial wraps it in `stop()` … `start()`.

**Holders** store state to read in update or physics loops: `AxisInput` (`horizontal`/`vertical`, about -1..1) and `ActionInput` (`activated`), bound via `bindToggle(action, actionInput.toggle)`, e.g. `idle.transitionsBetween(walk, () => pressingWalk.activated)`.

## Keybind behaviour

- `setKeybind` **adds** a key to an action rather than replacing existing ones.
- **Keyboard:** `Keybind.test` compares `event.key` only, so modifiers change the key. Press `1`, press Shift, release `1`: the keyup arrives as `!`, the action stays held, and Shift+1 never fires. For digit/symbol bindings, or wherever Shift may be held, subclass `Keybind` and override `test()` to compare `event.code`.
- **Mouse buttons:** `'MouseLeft'`, `'MouseMiddle'`, `'MouseRight'` `Keybind`s fire **only under pointer lock** (FPS-style) and pass no cursor position. For cursor-driven games, listen for `pointerdown` on `ViewController.htmlElement` and match with `Keybind.test` so rebinding still works, or use `PointerEvents` (caveats in `services-world-assets.md`).

## Gotchas

- **Stuck keys after focus loss.** Held toggles live in a private list that nothing clears on window `blur`, not even `stop()`/`start()`. After Alt+Tab while holding W the character keeps walking. On `blur`, dispatch synthetic `keyup`s for every bound key, then reset game input state.
- **Re-sent presses.** Every keyup re-fires `true` for each key still considered held, and browser auto-repeat repeats keydown. One-shot actions bound with `bindToggle` must ignore presses of an already-held action.
- **Listens on `document`.** An element calling `stopPropagation` on key events (e.g. a debug console) swallows releases, and keys stick.
- **Never calls `preventDefault`.** Tab, arrows and the context menu keep their browser behaviour.
- **While `view.paused`**, keydown, mouse and wheel are dropped but keyup is delivered, so an unpause key can't go through `InputService`; use a plain DOM listener.
