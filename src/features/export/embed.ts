import { serializeConfig } from '../presets';
import type { GradientConfig } from '../gradient/types';

/** Where the built `gradient-gen.js` web component is expected to be hosted. */
export function defaultEmbedScriptUrl(): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://your-host';
  return `${origin}/gradient-gen.js`;
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
