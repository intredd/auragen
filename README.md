# Auragen

Design **live, animated gradients** in your browser, then export them as images or
video for social posts, posters, and website backgrounds — or drop them into any
page as a ready-made web component.

[![Auragen — design live, animated gradients in the browser](docs/hero.gif)](https://intredd.github.io/auragen/)

### ▶ [Try it live → intredd.github.io/auragen](https://intredd.github.io/auragen/)

No install, no sign-up. Open the link, tweak a scene, hit export.

---

## What you can do

- **Compose a scene** from any number of colorful blobs on a custom background.
- **Shape each blob** directly on the canvas — move, resize, rotate, and stretch
  it into an oval by dragging its handles.
- **Bring it to life** with per-blob wobble (detail, amount, speed) and a global
  animation speed.
- **Blend or layer** overlapping blobs — either stack their colors or truly mix
  them where they overlap.
- **Start from a preset** in the Demo menu (Aurora, Morph, Layered rings) and make
  it your own.
- **Export** a PNG or a WebM video at a preset or custom resolution, with a
  selectable frame rate.
- **Share** a scene with a link, or **embed** it on your own site.

## How to use

1. **Pick a starting point.** Open the app and choose a scene from the **Demo**
   menu, or start from the default and build up.
2. **Add blobs.** Use **Add** (or **Duplicate**) in the panel. Remove the selected
   blob with the trash button or the `Backspace` / `Delete` key.
3. **Shape blobs on the canvas.** Click a blob to select it, then drag:
   - the **center dot** to move it,
   - anywhere on the **dashed outline** to resize,
   - the **rotate** and **stretch** handles to spin it or squash it into an oval.

   Click empty space to deselect. Hover the **?** icon next to any setting for a
   plain-language explanation of what it does.
4. **Fine-tune.** Adjust color, edge softness, and wobble in the panel. Settings
   you can already change on the canvas live under a collapsible **Manual
   controls** section. Set the global background, animation speed, and whether
   blobs **Layer** or **Blend**.
5. **Play / pause** the animation and **hide the handles** from the toolbar to
   preview the clean result.
6. **Export or share.** Open the **Export** menu to:
   - save a **PNG**,
   - record a **video** (play/stop — you control the length),
   - choose a **resolution** and **frame rate**,
   - **copy a share link** or the **embed code**.

## Embed on your site

Copy the snippet from **Export → Copy embed code** — it bakes the current scene
into the `preset` attribute. The component is served straight from GitHub via
jsDelivr, so there's nothing else to host:

```html
<script src="https://cdn.jsdelivr.net/gh/intredd/auragen@main/dist-embed/gradient-gen.js" defer></script>
<gradient-gen preset="<base64>" style="display:block;width:100%;height:420px"></gradient-gen>
```

Size is controlled purely with CSS (`width` / `height`); the canvas fits its box.
Without a `preset` it shows the default scene. Add `autoplay="false"` to start
paused. Both attributes are reactive — change them via JS and the component
updates live.

---

# For developers

Auragen started life as a CodePen demo (`Gradientv3`) and grew into a full
utility. The rest of this document covers the internals.

**Under the hood:** soft circular fields composited on the GPU, with per-blob
deformation and Layer/Blend modes — an approach I built up myself from that old
CodePen experiment, rather than pulling in an off-the-shelf gradient library.

## Stack

- **React 18 + TypeScript**
- **Vite 6** (dev server / build)
- **WebGL2** for the gradient renderer
- **Zustand** for state (single source of truth)

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL.

Other scripts:

```bash
npm run build         # type-check + production build (the app)
npm run build:embed   # build the framework-free <gradient-gen> web component
npm run build:all     # both of the above
npm run preview       # preview the production build
npm run lint          # type-check only
```

To publish an updated embed bundle, run `npm run build:embed` and commit
`dist-embed/gradient-gen.js` — jsDelivr serves it from the repo. Swap `@main` for
a release tag (e.g. `@v1.0.0`) to pin an immutable, permanently cached version,
or change `EMBED_SCRIPT_URL` in `src/features/export/embed.ts` to host it
yourself. The canonical share URL lives next to it as `SITE_URL` in
`src/features/presets/serialize.ts`.

## Architecture

The core idea: **the gradient engine knows nothing about React or the UI.** It
implements a small `GradientRenderer` interface, so the WebGL implementation can
later be swapped for Canvas2D / WebGPU without touching the interface consumers.

```text
src/
├─ app/                         # entry point, root component, global styles
│  ├─ App.tsx
│  └─ styles/global.css
├─ embed/                       # <gradient-gen> web component (no React)
│  └─ gradient-gen.ts
├─ features/
│  ├─ gradient/                 # the gradient itself
│  │  ├─ engine/                # renderer-agnostic core
│  │  │  ├─ types.ts            # GradientRenderer interface (setConfig)
│  │  │  ├─ WebGLGradientRenderer.ts   # uniform arrays, loop up to u_blob_count
│  │  │  ├─ shaders/            # vertex + fragment
│  │  │  └─ index.ts            # createGradientRenderer() factory
│  │  ├─ config/                # createBlob / createDefaultConfig / field schemas
│  │  ├─ state/                 # zustand store + engine context
│  │  ├─ components/            # GradientCanvas (React ⇄ engine bridge)
│  │  ├─ utils/                 # color + screen<->blob coordinate helpers
│  │  └─ types.ts               # Blob, GlobalSettings, GradientConfig
│  ├─ controls/                 # config-driven controls UI
│  │  └─ components/            # ControlsPanel, BlobHandles, FieldControl, ExportPanel…
│  ├─ export/                   # PNG/WebM, offscreen render at any resolution, embed snippet
│  └─ presets/                  # serialize GradientConfig to/from a shareable URL
└─ main.tsx
```

### Data model

The scene is a list of self-contained blobs plus a small global block. This one
`GradientConfig` is the shared contract for the UI, URL sharing, media export,
and the embeddable web component.

```ts
interface Blob {
  id: string;
  position: { x: number; y: number };   // uv space, mapped to screen (x*W, y*H)
  size; scale; angle; smoothStep; cornerSmoothing;
  deformationRatio; deformationSpeed; separation;
  color: string;                         // per-blob hex
}
type BlendMode = 'layer' | 'blend';
interface GlobalSettings { backgroundColor: string; speed: number; blendMode: BlendMode; }
interface GradientConfig { version: number; blobs: Blob[]; global: GlobalSettings; }
```

### Data flow

1. `config/gradientSettings.ts` declares blob/global fields once (`blobFields`,
   `globalFields`), driving the controls UI; the shader consumes the same config
   as uniform arrays.
2. The **store** (`useGradientStore`) holds `blobs`, `global`, `selectedBlobId`,
   plus play/panel state, with CRUD actions (`addBlob`, `duplicateBlob`,
   `removeBlob`, `updateBlob`, `setGlobal`).
3. `GradientCanvas` owns the renderer and subscribes to the store *outside* React
   render, pushing `setConfig` straight into the engine — dragging a slider or a
   blob handle never re-renders the canvas, only redraws on the GPU.
4. `BlobHandles` is an on-canvas gizmo overlay: a center anchor moves a blob, and
   the selected blob gets an ellipse with a size handle (minor axis) and a
   rotate/stretch handle (major axis). A click (no drag) selects and opens its
   menu. The overlay can be toggled off from the toolbar.
5. Media/embed export lives in its own menu (toolbar → Export); `export` and
   `presets` read the same config, keeping one source of truth.

`embed-example.html` is a local smoke-test page (`npm run build:embed`, then serve
the repo root).

## License

MIT — see [`LICENSE`](LICENSE). Free to use, fork, and embed.

---

Built by **Alex Ivanov** — frontend engineer focused on interactive sites, WebGL,
and motion.
[LinkedIn](https://www.linkedin.com/in/intredd/)
