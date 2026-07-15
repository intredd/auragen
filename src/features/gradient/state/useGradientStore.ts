import { create } from 'zustand';
import {
  createBlob,
  createDefaultConfig,
  MAX_BLOBS,
} from '../config/gradientSettings';
import {
  CONFIG_VERSION,
  type Blob,
  type GlobalSettings,
  type GradientConfig,
} from '../types';
import { readConfigFromUrl } from '../../presets';

interface GradientState {
  blobs: Blob[];
  global: GlobalSettings;
  selectedBlobId: string | null;

  isPlaying: boolean;
  isPanelOpen: boolean;
  isExportOpen: boolean;
  showHandles: boolean;

  addBlob: (overrides?: Partial<Omit<Blob, 'id'>>) => void;
  duplicateBlob: (id: string) => void;
  removeBlob: (id: string) => void;
  updateBlob: (id: string, patch: Partial<Blob>) => void;
  selectBlob: (id: string | null) => void;

  setGlobal: (patch: Partial<GlobalSettings>) => void;

  setConfig: (config: GradientConfig) => void;
  resetConfig: () => void;

  setPlaying: (isPlaying: boolean) => void;
  togglePlaying: () => void;

  setPanelOpen: (isPanelOpen: boolean) => void;
  togglePanel: () => void;

  setExportOpen: (isExportOpen: boolean) => void;
  toggleExport: () => void;

  setShowHandles: (showHandles: boolean) => void;
  toggleHandles: () => void;
}

/** Main panel collapse duration (keep in sync with the CSS transition). */
const PANEL_ANIM_MS = 500;

/** Guards the delayed export-open against being toggled again mid-animation. */
let exportOpenToken = 0;

function initialConfig(): GradientConfig {
  return readConfigFromUrl() ?? createDefaultConfig();
}

/** Assemble a serializable {@link GradientConfig} from the current state. */
export function selectConfig(state: GradientState): GradientConfig {
  return { version: CONFIG_VERSION, blobs: state.blobs, global: state.global };
}

const initial = initialConfig();

export const useGradientStore = create<GradientState>((set, get) => ({
  blobs: initial.blobs,
  global: initial.global,
  selectedBlobId: null,

  isPlaying: true,
  isPanelOpen: false,
  isExportOpen: false,
  showHandles: true,

  addBlob: (overrides) =>
    set((state) => {
      if (state.blobs.length >= MAX_BLOBS) return state;
      const blob = createBlob(overrides);
      return { blobs: [...state.blobs, blob], selectedBlobId: blob.id };
    }),

  duplicateBlob: (id) =>
    set((state) => {
      if (state.blobs.length >= MAX_BLOBS) return state;
      const source = state.blobs.find((blob) => blob.id === id);
      if (!source) return state;
      const clone = createBlob({
        ...source,
        position: {
          x: source.position.x + 0.1,
          y: source.position.y + 0.1,
        },
      });
      const index = state.blobs.findIndex((blob) => blob.id === id);
      const blobs = [...state.blobs];
      blobs.splice(index + 1, 0, clone);
      return { blobs, selectedBlobId: clone.id };
    }),

  removeBlob: (id) =>
    set((state) => {
      const blobs = state.blobs.filter((blob) => blob.id !== id);
      const selectedBlobId =
        state.selectedBlobId === id
          ? blobs[blobs.length - 1]?.id ?? null
          : state.selectedBlobId;
      return { blobs, selectedBlobId };
    }),

  updateBlob: (id, patch) =>
    set((state) => ({
      blobs: state.blobs.map((blob) =>
        blob.id === id ? { ...blob, ...patch } : blob,
      ),
    })),

  selectBlob: (id) => set({ selectedBlobId: id }),

  setGlobal: (patch) => set((state) => ({ global: { ...state.global, ...patch } })),

  setConfig: (config) =>
    set({
      blobs: config.blobs,
      global: config.global,
      selectedBlobId: null,
    }),

  resetConfig: () =>
    set(() => {
      const config = createDefaultConfig();
      return {
        blobs: config.blobs,
        global: config.global,
        selectedBlobId: null,
      };
    }),

  setPlaying: (isPlaying) => set({ isPlaying }),
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),

  // Expanding the main panel closes the export menu (they'd overlap).
  setPanelOpen: (isPanelOpen) => {
    exportOpenToken++;
    set(isPanelOpen ? { isPanelOpen, isExportOpen: false } : { isPanelOpen });
  },
  togglePanel: () => get().setPanelOpen(!get().isPanelOpen),

  // Opening export first collapses the panel, then reveals the menu once the
  // collapse animation has finished (so it slides in just below the toolbar).
  setExportOpen: (isExportOpen) => {
    if (!isExportOpen) {
      exportOpenToken++;
      set({ isExportOpen: false });
      return;
    }
    const token = ++exportOpenToken;
    if (get().isPanelOpen) {
      set({ isPanelOpen: false });
      window.setTimeout(() => {
        if (token === exportOpenToken) set({ isExportOpen: true });
      }, PANEL_ANIM_MS);
    } else {
      set({ isExportOpen: true });
    }
  },
  toggleExport: () => get().setExportOpen(!get().isExportOpen),

  setShowHandles: (showHandles) => set({ showHandles }),
  toggleHandles: () => set((state) => ({ showHandles: !state.showHandles })),
}));
