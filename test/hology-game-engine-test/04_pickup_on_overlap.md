# Test 04 — Pickup on overlap

**Skill area:** physics overlap, services, triggers

## Prompt

> Add coins that disappear and increment the score when the player walks into them.

## Pass criteria

- Uses `onBeginOverlapWithActorType` or `TriggerVolumeComponent` / `TriggerVolume`.
- Score held in an `@Service()` singleton.
- Coin removed via `World.removeActor`.

## Fail signals

- Per-frame distance-checking math to detect pickup.
- Score tracked as a loose global / module variable instead of a service.
