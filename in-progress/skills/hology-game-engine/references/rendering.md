# Rendering, Lighting & Shadows

What the engine creates and overrides at render time (`@hology/core@0.0.282`). Backend and the `rendering` prop: `ui-and-react.md`; materials: `shaders-and-vfx.md`. Renderer state: `inject(RenderingView)` from `@hology/core/rendering`.

## What the engine creates

Every scene gets a hemisphere fill named `default_ambient`, a cascaded-shadow (CSM) sun and exponential fog. The default fog colour `#0267b2` tints the whole scene teal; override it when the scene looks blue-green.

- **Sun colour.** `world.directionalLight` has no colour setter; set colour on each cascade `DirectionalLight` in the scene.
- **Tone mapping.** `renderer.toneMapping` is reset every frame. Spawn a `PostProcessVolume` (root `@hology/core`) and set `settings.tonemapMapping` / `tonemapExposure` instead.
- **Shadow receivers.** Meshes show no shadows unless `receiveShadow = true`.

## Cascaded shadows

- **Refit after an FOV change.** Cascade frustums are fitted once, when the camera is assigned at the default FOV. After changing FOV call `renderingView.csm?.updateFrustums()`; it narrowed the cascades by about 24%.
- **Cascade refresh.** Far cascades redraw on a hard-coded `[22, 40, 60, 120]` ms schedule, which makes moving shadows blink. `RenderingConfig` can't set it, but `RenderingView.options.shadows.cascadeUpdateIntervals` is re-read every frame.
- **Cost.** Shadow cascades were about 270 of 318 draw calls in one measured scene.

## Profiling

- **Render stats.** The renderer turns `info.autoReset` off and resets once at frame end; read stats just before that reset.
- **Engine garbage.** The WebGL frame setup allocates per visible object (about 0.5 MB per frame in one project), so visible object count drives GC.
