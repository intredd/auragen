import {
  createBlob,
  DEFAULT_GLOBAL,
  MAX_BLOBS,
} from '../gradient/config/gradientSettings';
import {
  CONFIG_VERSION,
  type BlendMode,
  type Blob,
  type GlobalSettings,
  type GradientConfig,
} from '../gradient/types';

/** URL query key that holds the encoded preset. */
export const PRESET_QUERY_KEY = 'p';

/**
 * Canonical public URL where the app is hosted. Share links are built against
 * this so they keep working when generated off `localhost` (or any preview
 * origin). Set to an empty string to fall back to the current page origin.
 */
export const SITE_URL = 'https://intredd.github.io/auragen/';

function toBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + padding);
}

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

const BLEND_MODES: BlendMode[] = ['layer', 'blend'];

function blendMode(global: Record<string, unknown>, fallback: BlendMode): BlendMode {
  if (
    typeof global.blendMode === 'string' &&
    (BLEND_MODES as string[]).includes(global.blendMode)
  ) {
    return global.blendMode as BlendMode;
  }
  // Back-compat with the old boolean `colorBlend` field (schema < 4).
  if (typeof global.colorBlend === 'boolean') {
    return global.colorBlend ? 'blend' : 'layer';
  }
  return fallback;
}

function normalizeBlob(raw: unknown): Blob {
  const base = createBlob();
  const blob = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const position =
    typeof blob.position === 'object' && blob.position !== null
      ? (blob.position as Record<string, unknown>)
      : {};

  return {
    ...base,
    position: {
      x: num(position.x, base.position.x),
      y: num(position.y, base.position.y),
    },
    size: num(blob.size, base.size),
    scale: num(blob.scale, base.scale),
    angle: num(blob.angle, base.angle),
    smoothStep: num(blob.smoothStep, base.smoothStep),
    cornerSmoothing: num(blob.cornerSmoothing, base.cornerSmoothing),
    deformationRatio: num(blob.deformationRatio, base.deformationRatio),
    deformationSpeed: num(blob.deformationSpeed, base.deformationSpeed),
    separation: num(blob.separation, base.separation),
    color: str(blob.color, base.color),
  };
}

function normalizeGlobal(raw: unknown): GlobalSettings {
  const global = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    backgroundColor: str(global.backgroundColor, DEFAULT_GLOBAL.backgroundColor),
    speed: num(global.speed, DEFAULT_GLOBAL.speed),
    blendMode: blendMode(global, DEFAULT_GLOBAL.blendMode),
  };
}

function normalizeConfig(input: unknown): GradientConfig | null {
  if (typeof input !== 'object' || input === null) return null;
  const obj = input as Record<string, unknown>;
  if (!Array.isArray(obj.blobs) || obj.blobs.length === 0) return null;

  return {
    version: CONFIG_VERSION,
    blobs: obj.blobs.slice(0, MAX_BLOBS).map(normalizeBlob),
    global: normalizeGlobal(obj.global),
  };
}

/** Encode a config to a compact, URL-safe string. */
export function serializeConfig(config: GradientConfig): string {
  return toBase64Url(JSON.stringify(config));
}

/** Decode a preset string back into a validated config, or null if invalid. */
export function deserializeConfig(encoded: string): GradientConfig | null {
  try {
    return normalizeConfig(JSON.parse(fromBase64Url(encoded)));
  } catch {
    return null;
  }
}

/** Read a preset from the current URL, if present and valid. */
export function readConfigFromUrl(): GradientConfig | null {
  if (typeof window === 'undefined') return null;

  const encoded = new URLSearchParams(window.location.search).get(PRESET_QUERY_KEY);
  if (!encoded) return null;

  return deserializeConfig(encoded);
}

/**
 * Build a shareable URL that encodes the given config.
 *
 * Prefers an explicit `baseUrl`, then the canonical {@link SITE_URL}, and only
 * falls back to the current page origin when neither is set — so a link copied
 * from `localhost` still points at the deployed site.
 */
export function buildShareUrl(config: GradientConfig, baseUrl?: string): string {
  const originBase =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '';
  const base = baseUrl ?? (SITE_URL || originBase);

  const search = new URLSearchParams();
  search.set(PRESET_QUERY_KEY, serializeConfig(config));
  return `${base}?${search.toString()}`;
}
