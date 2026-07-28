# Test 03 — Camera follow

**Skill area:** camera

## Prompt

> Make the camera follow the player character from behind.

## Pass criteria

- Uses `ThirdPersonCameraComponent`, or `ViewController` + `onLateUpdate` for camera follow.

## Fail signals

- Hand-made `PerspectiveCamera` + `requestAnimationFrame` loop.
- Camera follow placed in `onUpdate` instead of `onLateUpdate`.
