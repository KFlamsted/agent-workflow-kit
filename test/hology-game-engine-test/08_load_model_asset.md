# Test 08 — Load a model asset

**Skill area:** `AssetLoader`

## Prompt

> Load a character model named 'Hero' and attach it to the player actor.

## Pass criteria

- Uses `AssetLoader.getModelByAssetName('Hero')` (or an appropriate `AssetLoader` method).
- Attaches the returned `scene` to the actor's object.

## Fail signals

- Reaches for a direct Three.js loader (`GLTFLoader` / `FBXLoader`) without justifying it as a documented exception (unsupported format, loader-specific behavior, or established project pattern).
