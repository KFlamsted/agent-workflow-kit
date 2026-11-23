# Player Input (deep reference)

Covers `InputService`, keybinds, action inputs, and player controllers. Read this when wiring player controls or building a controller service.

The input system separates **keybinds** (which key/mouse) → **actions** (player intent) → **effects** (callbacks). This lets you rebind keys without touching gameplay code.

## Action identifiers

Each action id has exactly one toggle callback and one delta callback; binding again replaces the previous one. Use string ids (`'camera.zoom'`) or one shared enum for the whole game. Two services with their own numeric enums both start at 0, so one silently overwrites the other's callbacks.

```typescript
enum InputAction { moveForward, moveBackward, moveLeft, moveRight, jump, sprint, shoot, walk, rotate, zoomCamera, rotateCamera }
```

## Configuring keybinds (on `InputService`)

```typescript
this.input.setKeybind(InputAction.moveForward, new Keybind('w'))     // Keybind(key, shift?, ctrl?)
this.input.setKeybind(InputAction.jump, new Keybind(' '))
this.input.setKeybind(InputAction.shoot, new Keybind('MouseLeft'))
this.input.setMousebind(InputAction.rotate, new Mousebind(0.01, true, 'x'))  // (sensitivity, flipped, 'x'|'y')
this.input.setWheelbind(InputAction.zoomCamera, new Wheelbind(0.0003, false)) // (sensitivity, flipped)
```

`setKeybind` **adds** a key to an action rather than replacing existing ones. Keybinds can be read from persistent storage to let players remap controls. `Mousebind` is specifically for mouse **movement** on an axis.

- **Keyboard:** `Keybind.test` compares `event.key` only, so modifiers change the key. Press `1`, press Shift, release `1`: the keyup arrives as `!`, the action stays held, and Shift+1 never fires. For digit/symbol bindings, or wherever Shift may be held, subclass `Keybind` and override `test()` to compare `event.code`.
- **Mouse buttons:** `'MouseLeft'`, `'MouseMiddle'` and `'MouseRight'` `Keybind`s fire **only under pointer lock** (FPS-style games); no cursor position is passed either. For cursor-driven games, listen for `pointerdown` on `ViewController.htmlElement` and match with `Keybind.test` so rebinding still works, or use `PointerEvents` (see its caveats in `services-world-assets.md`).

## Binding actions to callbacks

- **`bindToggle(action, cb)`** — boolean on/off intents (movement held, sprint on/off). `cb(active: boolean)`.
- **`bindDelta(action, cb)`** — value-delta intents (mouse-driven rotation, zoom). `cb(delta: number)`.

```typescript
this.input.bindToggle(InputAction.sprint, player.toggleSprint)
this.input.bindDelta(InputAction.rotate, player.rotateY)
```

Call `this.input.start()` once after keybinds are configured (the player-input docs do it in the controller constructor). When rebinding to a new character, the third-person tutorial wraps the rebinding in `stop()` ... `start()`.

## Gotchas

- **Stuck keys after focus loss.** `InputService` keeps a private list of held toggles; nothing clears it on window `blur`, and `stop()`/`start()` don't reset it. After Alt+Tab while holding W the character keeps walking. Workaround: on `blur`, dispatch synthetic `keyup`s for every bound key, then reset game input state.
- **Re-sent presses.** On every keyup it re-fires `true` for each key it still considers held, and browser auto-repeat repeats keydown. One-shot actions bound with `bindToggle` must ignore presses of an already-held action.
- **Listens on `document`.** Any element calling `stopPropagation` on key events (e.g. a debug console) swallows releases, and keys stick.
- **Never calls `preventDefault`.** Tab, arrows and the context menu keep their browser behaviour.
- **While `view.paused`**, keydown, mouse and wheel are dropped but keyup is still delivered, so an unpause/toggle key cannot go through `InputService`; use a plain DOM listener.

## Input holder objects

Helpers that hold input state you can read in update/physics loops instead of tracking key presses yourself:
- **`AxisInput`** — exposes `horizontal` / `vertical` axis values (each roughly -1..1). Great for driving movement/forces.
- **`ActionInput`** — exposes `activated: boolean`; bind with `bindToggle(action, actionInput.toggle)`. Used e.g. to drive animation state predicates.

```typescript
const pressingWalk = new ActionInput()
this.input.bindToggle(InputAction.walk, pressingWalk.toggle)
// later: idle.transitionsBetween(walk, () => pressingWalk.activated)
```

## Player controller pattern

Put input setup and a reference to the possessed character in a `@Service()`:

```typescript
@Service()
class PlayerController {
  private input = inject(InputService)
  private character: Character

  constructor() {
    this.input.setKeybind(InputAction.jump, new Keybind(' '))
    this.input.setKeybind(InputAction.sprint, new Keybind('Shift'))
    this.input.setKeybind(InputAction.moveForward, new Keybind('w'))
    this.input.setKeybind(InputAction.moveBackward, new Keybind('s'))
    this.input.setKeybind(InputAction.moveLeft, new Keybind('a'))
    this.input.setKeybind(InputAction.moveRight, new Keybind('d'))
    this.input.setMousebind(InputAction.rotate, new Mousebind(0.01, true, 'x'))
    this.input.setMousebind(InputAction.rotateCamera, new Mousebind(0.003, false, 'y'))
    this.input.setWheelbind(InputAction.zoomCamera, new Wheelbind(0.0003, false))
    this.input.start()   // begin capturing input
  }

  possess(character: Character) {
    this.character = character
    const move = character.movement.directionInput
    this.input.bindToggle(InputAction.jump, character.movement.jumpInput.toggle)
    this.input.bindToggle(InputAction.sprint, character.movement.sprintInput.toggle)
    this.input.bindToggle(InputAction.moveForward, move.togglePositiveY)
    this.input.bindToggle(InputAction.moveBackward, move.toggleNegativeY)
    this.input.bindToggle(InputAction.moveLeft, move.toggleNegativeX)
    this.input.bindToggle(InputAction.moveRight, move.togglePositiveX)
    this.input.bindDelta(InputAction.rotate, character.movement.rotationInput.rotateY)
    this.input.bindDelta(InputAction.rotateCamera, character.thirdPersonCamera.rotationInput.rotateX)
    this.input.bindDelta(InputAction.zoomCamera, character.thirdPersonCamera.zoomInput.increment)
  }
}
```

See `physics.md` for `CharacterMovementComponent`'s input surface (`directionInput`, `jumpInput`, `sprintInput`, `rotationInput`).

## Imports

```typescript
import { InputService, Keybind, Mousebind, Wheelbind, AxisInput, ActionInput } from '@hology/core/gameplay/input'
```
