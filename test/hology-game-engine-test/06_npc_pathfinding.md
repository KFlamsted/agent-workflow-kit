# Test 06 — NPC pathfinding

**Skill area:** AI, navigation, behavior trees

## Prompt

> Add an enemy that patrols between two points and chases the player when close.

## Pass criteria

- Uses `Navigation` + a navmesh.
- Uses behavior-tree nodes (`SelectorNode` / `SequenceNode` / `CharacterMoveToNode`, etc.).
- Behavior tree built in `onBeginPlay`.

## Fail signals

- Custom A* / hand-rolled pathfinding.
- Custom finite-state-machine kinematics instead of behavior-tree nodes + navigation.
