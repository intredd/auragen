import { createGradientRenderer } from '../features/gradient/engine';
import type { GradientRenderer } from '../features/gradient/engine';
import { createDefaultConfig } from '../features/gradient/config/gradientSettings';
import { deserializeConfig } from '../features/presets';

/**
 * `<gradient-gen>` custom element.
 *
 * Framework-free embed of the animated gradient. It reuses the exact same
 * renderer the app uses — the whole point of keeping the engine decoupled from
 * React.
 *
 * Attributes:
 * - `preset`   base64url-encoded GradientConfig (from the app's "Copy embed code")
 * - `autoplay` "false" to start paused; anything else (or absent) autoplays
 *
 * Size the element with CSS (e.g. `style="width:100%;height:420px"`).
 */
export class GradientGenElement extends HTMLElement {
  private renderer: GradientRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  static get observedAttributes(): string[] {
    return ['preset', 'autoplay'];
  }

  connectedCallback(): void {
    if (!this.style.display) this.style.display = 'block';
    if (!this.style.position) this.style.position = 'relative';

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    this.appendChild(canvas);
    this.canvas = canvas;

    const renderer = createGradientRenderer();
    renderer.mount(canvas);
    this.renderer = renderer;

    this.applyPreset();

    if (this.getAttribute('autoplay') !== 'false') {
      renderer.play();
    }
    renderer.start();

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this);
    this.resize();
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.renderer?.dispose();
    this.renderer = null;
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
  }

  attributeChangedCallback(name: string): void {
    if (!this.renderer) return;
    if (name === 'preset') {
      this.applyPreset();
    } else if (name === 'autoplay') {
      if (this.getAttribute('autoplay') === 'false') this.renderer.pause();
      else this.renderer.play();
    }
  }

  private applyPreset(): void {
    if (!this.renderer) return;
    const preset = this.getAttribute('preset');
    const config = (preset && deserializeConfig(preset)) || createDefaultConfig();
    this.renderer.setConfig(config);
  }

  private resize(): void {
    if (!this.renderer) return;
    const width = this.clientWidth || 300;
    const height = this.clientHeight || 150;
    this.renderer.resize(width, height);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('gradient-gen')) {
  customElements.define('gradient-gen', GradientGenElement);
}
