---
name: godot-gdscript-conventions
description: Conventions, patterns and pitfalls for writing Godot 4 GDScript. Use this skill whenever you write, edit, review or debug a .gd file, a Godot scene script, an Autoload, a custom Resource, or any game system in a Godot project (player controllers, state machines, health/damage, spawning, scene changes, save/load), even if the user does not mention "conventions" or "best practices".
---

# Godot 4 GDScript Conventions

Condensed from wshobson/agents `godot-gdscript-patterns` plus extra pitfalls (marked +).

## Workflow for every script change
1. Check the Godot version in `project.godot` (`config/features`). Write Godot 4 syntax only.
2. Read the scripts and scenes the change touches before editing. Existing project conventions win over these rules.
3. Only change the files the user asked for. If another file needs changing, say so instead of editing it silently.
4. If you can run Godot headless, run it and read parse/script errors before reporting done. Otherwise list what the user should check in the editor.

## Godot 3 drift (most common failure)
Most GDScript online is Godot 3, so models drift into it. Never write the left side:

| Godot 3 (wrong) | Godot 4 |
|---|---|
| `KinematicBody2D` | `CharacterBody2D` + built-in `velocity` |
| `move_and_slide(velocity, Vector2.UP)` | `move_and_slide()` |
| `export var` / `onready var` | `@export var` / `@onready var` |
| `yield(obj, "signal")` | `await obj.signal` |
| `connect("hit", self, "_on_hit")` | `hit.connect(_on_hit)` |
| `emit_signal("hit")` | `hit.emit()` |
| `scene.instance()` | `scene.instantiate()` |
| `TileMap` layers | `TileMapLayer` nodes (+) |

## Script layout
Order: `class_name`/`extends` → `signal` (past tense) → `enum`/`const` → `@export` (with `@export_group`, `@export_range`) → public vars → `_private` vars → `@onready` refs → built-ins → public methods → `_private` methods.

```gdscript
class_name Player
extends CharacterBody2D

signal died

@export var speed: float = 200.0
var _health: int
@onready var sprite: Sprite2D = $Sprite2D

func _physics_process(_delta: float) -> void:
    velocity = Input.get_vector("left", "right", "up", "down") * speed
    move_and_slide()
```

## Typing
Type vars, params and returns (`-> void`); use `:=` when the type is obvious. Use typed arrays (`Array[Node]`), typed helpers (`maxf`, `mini`, `clampi`) and `StringName` for identifiers. Typing catches errors at parse time and runs faster.

## Communication between nodes
- Call down, signal up: parents call children's methods; children emit signals. (+) Keeps scenes reusable.
- No hard references between sibling scenes. Use signals, or an `@export var target: SomeType` assigned in the Inspector.
- An EventBus Autoload containing only `signal` lines is for events many unrelated systems need. Don't route everything through it.
- Emit change signals from property setters so every write is covered:

```gdscript
var current_health: int:
    set(value):
        var old := current_health
        current_health = clampi(value, 0, max_health)
        if current_health != old:
            health_changed.emit(current_health, max_health)
```

## Autoloads
- Only for truly global systems: GameManager, EventBus, SceneManager, SaveManager, audio.
- Managers that must run while the tree is paused need `process_mode = PROCESS_MODE_ALWAYS`.
- Don't make Autoloads depend on each other in `_ready()`; load order is fragile. (+)

## Resources (data)
- Put static data in `class_name X extends Resource` with `@export` fields. Keep them data-only.
- Resources are shared by every node using them. Copy before mutating at runtime: `stats = base_stats.duplicate()`.
- `duplicate()` is shallow; use `duplicate(true)` for nested sub-resources you will modify. (+)
- Don't read exported values in a Resource's `_init()`; they aren't applied yet when loading `.tres`. Initialize runtime state in a separate method. (+)

## State machines
Node-based: a `StateMachine` node with `State` children. Disable inactive states via `process_mode`; the machine forwards `_process`, `_physics_process` and `_unhandled_input` to the active state. For simple game-wide state, `enum` + `match` is enough.

```gdscript
# State API: enter(msg), exit(), update(delta), physics_update(delta), handle_input(event)
func transition_to(state_name: StringName, msg: Dictionary = {}) -> void:
    if not states.has(state_name):
        push_error("State '%s' not found" % state_name)
        return
    var previous := current_state
    previous.exit()
    previous.process_mode = Node.PROCESS_MODE_DISABLED
    current_state = states[state_name]
    current_state.process_mode = Node.PROCESS_MODE_INHERIT
    current_state.enter(msg)
    state_changed.emit(previous.name, current_state.name)
```

## Components
Prefer composition over deep inheritance:
- `HealthComponent`: clamped setter (above), `take_damage()` returns actual damage, emits `damaged`/`healed`/`died`, ignores hits when dead or invincible.
- `HitboxComponent` (Area2D): deals damage, ignores its own owner.
- `HurtboxComponent` (Area2D): receives hits and forwards to an exported `HealthComponent`.

## Object pooling
- Pool frequently spawned objects (bullets, effects) instead of `instantiate()`/`queue_free()` each time.
- Inactive: `process_mode = PROCESS_MODE_DISABLED`, `visible = false`. Reactivate with `PROCESS_MODE_INHERIT`.
- Pooled objects emit `returned_to_pool` instead of freeing themselves; `on_spawn()`/`on_despawn()` reset state.
- `push_warning` when a non-growing pool is exhausted.

## Scene changes
Use a SceneManager Autoload. Skip loading with `ResourceLoader.has_cached(path)`; otherwise load async:

```gdscript
ResourceLoader.load_threaded_request(path)
while true:
    var progress := []
    match ResourceLoader.load_threaded_get_status(path, progress):
        ResourceLoader.THREAD_LOAD_IN_PROGRESS:
            loading_progress.emit(progress[0])
            await get_tree().process_frame
        ResourceLoader.THREAD_LOAD_LOADED:
            _swap_scene((ResourceLoader.load_threaded_get(path) as PackedScene).instantiate())
            return
        _:
            push_error("Failed to load scene: %s" % path)
            return
```

Swap: `queue_free()` the old scene, `add_child` the new one to `get_tree().root`, set `get_tree().current_scene`. Await transitions around the swap.

## Saving
- Save under `user://`; `res://` is read-only in exported games. (+)
- Save plain data via JSON, never Node references.
- Check `FileAccess.open(...)` for `null` and report via `FileAccess.get_open_error()`.
- `JSON.parse_string` returns `null` on failure and all numbers as `float`; validate the type and cast to `int`. (+)
- Give saveable nodes an explicit stable ID; `get_path()` breaks when the tree changes.
- `open_encrypted_with_pass` with a key in source only deters casual editing. (+)

```gdscript
var data = JSON.parse_string(file.get_as_text())
if typeof(data) != TYPE_DICTIONARY:
    push_error("Invalid save data")
    return {}
var level := int(data.get("level", 1))
```

## Performance
- Cache refs with `@onready`; never `$Node`/`get_node()` in `_process` or loops.
- Reuse arrays (`.clear()`) instead of allocating in hot paths.
- Movement/physics in `_physics_process`, visuals in `_process`.
- Disable idle nodes with `set_process(false)` / `set_physics_process(false)`.
- Measure with the Profiler before optimizing.

## Errors and await
- `push_error` for invalid state, `push_warning` for recoverable issues. Never fail silently.
- After `await`, the node or its target may be freed. Check `is_instance_valid(node)` before using it. (+)
- Prefer `get_tree().create_timer(t).timeout` for one-off delays; use a `Timer` node for repeating or cancellable ones. (+)
