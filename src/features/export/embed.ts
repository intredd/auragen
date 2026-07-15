import { serializeConfig } from '../presets';
import type { GradientConfig } from '../gradient/types';

/**
 * jsDelivr CDN URL for the built `<gradient-gen>` web component, served straight
 * from the GitHub repo. Produce the file with `npm run build:embed` and commit
 * `dist-embed/gradient-gen.js` so jsDelivr can serve it. Swap `@main` for a
 * release tag (e.g. `@v1.0.0`) to get an immutable, permanently cached URL.
 */
const EMBED_SCRIPT_URL =
  'https://cdn.jsdelivr.net/gh/intredd/auragen@main/dist-embed/gradient-gen.js';

/** Where the built `gradient-gen.js` web component is hosted (jsDelivr CDN). */
export function defaultEmbedScriptUrl(): string {
  return EMBED_SCRIPT_URL;
}

export interface EmbedSnippetOptions {
  scriptUrl?: string;
  width?: string;
  height?: string;
}

/**
 * Build a copy-paste embed snippet: a `<script>` that registers the
 * `<gradient-gen>` custom element plus the element itself with the config baked
 * into its `preset` attribute.
 */
export function buildEmbedSnippet(
  config: GradientConfig,
  options: EmbedSnippetOptions = {},
): string {
  const scriptUrl = options.scriptUrl ?? defaultEmbedScriptUrl();
  const width = options.width ?? '100%';
  const height = options.height ?? '420px';
  const preset = serializeConfig(config);

  return [
    `<script src="${scriptUrl}" defer></script>`,
    `<gradient-gen preset="${preset}" style="display:block;width:${width};height:${height}"></gradient-gen>`,
  ].join('\n');
}
