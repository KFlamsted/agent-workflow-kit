# Player Input (deep reference)

Covers `InputService`, keybinds, action inputs, and player controllers. Read this when wiring player controls or building a controller service.

The input system separates **keybinds** (which key/mouse) → **actions** (player intent) → **effects** (callbacks). This lets you rebind keys without touching gameplay code.

## Action identifiers

Any string works, but an enum is convenient:

```typescript
enum InputAction { moveForward, moveBackward, moveLeft, moveRight, jump, sprint, rotate, zoomCamera }
```

## Configuring keybinds (on `InputService`)

```typescript
this.input.setKeybind(InputAction.moveForward, new Keybind('w'))     // Keybind(key, shift?, ctrl?)
this.input.setKeybind(InputAction.jump, new Keybind(' '))
this.input.setKeybind(InputAction.shoot, new Keybind('MouseLeft'))
this.input.setMousebind(InputAction.rotate, new Mousebind(0.01, true, 'x'))  // (sensitivity, flipped, 'x'|'y')
this.input.setWheelbind(InputAction.zoomCamera, new Wheelbind(0.0003, false)) // (sensitivity, flipped)
```

For keyboard input, `key` is generally a `KeyboardEvent.key` value (e.g. `'w'`, `' '`, `'Shift'`). Hology also accepts the mouse-button values `'MouseLeft'`, `'MouseMiddle'`, and `'MouseRight'` in a `Keybind`. `Mousebind` is specifically for mouse **movement** on an axis; mouse-button presses use `Keybind`. Keybinds can be read from persistent storage to let players remap controls.

## Binding actions to callbacks

- **`bindToggle(action, cb)`** — boolean on/off intents (movement held, sprint on/off). `cb(active: boolean)`.
- **`bindDelta(action, cb)`** — value-delta intents (mouse-driven rotation, zoom). `cb(delta: number)`.

```typescript
this.input.bindToggle(InputAction.sprint, player.toggleSprint)
this.input.bindDelta(InputAction.rotate, player.rotateY)
```

Remember to call `this.input.start()` once to begin capturing input.

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
    this.input.start()
  }
}
```

See `physics.md` for `CharacterMovementComponent`'s input surface (`directionInput`, `jumpInput`, `sprintInput`, `rotationInput`).

## Imports

```typescript
import { InputService, Keybind, Mousebind, Wheelbind, AxisInput, ActionInput } from '@hology/core/gameplay/input'
```
