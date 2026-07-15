# Gradient Gen

Live, animated WebGL gradients you can tune, then export as images or video for
social media and posters. Started life as a CodePen demo (`Gradientv3`) and is
being grown into a full community utility.

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
│  │  └─ components/            # ControlsPanel, BlobHandles, FieldControl, ExportSection…
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
  deformationRatio; deformationSpeedX; deformationSpeedY; separation;
  color: string;                         // per-blob hex
}
interface GlobalSettings { backgroundColor: string; speed: number; }
interface GradientConfig { version: 1; blobs: Blob[]; global: GlobalSettings; }
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

### Embedding

Build the component and host `dist-embed/gradient-gen.js` anywhere static, then
use **Export → Copy embed code** in the app (bakes the current scene into the
`preset` attribute):

```html
<script src="https://your-host/gradient-gen.js" defer></script>
<gradient-gen preset="<base64>" style="display:block;width:100%;height:420px"></gradient-gen>
```

`embed-example.html` is a local smoke-test page (`npm run build:embed`, then serve
the repo root).
