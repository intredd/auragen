import { useEffect, useRef } from 'react';
import { createGradientRenderer } from '../engine';
import { selectConfig, useGradientStore } from '../state/useGradientStore';
import { useEngine } from '../state/EngineContext';
import './GradientCanvas.css';

/**
 * Owns the WebGL renderer lifecycle and bridges it to the store:
 * pushes config changes and play/pause state into the engine, and keeps the
 * drawing buffer sized to the element.
 */
export function GradientCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { rendererRef } = useEngine();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = createGradientRenderer();
    renderer.mount(canvas);
    rendererRef.current = renderer;

    // Seed the engine with the current store state.
    const state = useGradientStore.getState();
    renderer.setConfig(selectConfig(state));
    if (state.isPlaying) renderer.play();
    else renderer.pause();
    renderer.start();

    // Keep the engine in sync with the store without re-rendering React.
    const unsubscribe = useGradientStore.subscribe((next, prev) => {
      if (next.blobs !== prev.blobs || next.global !== prev.global) {
        renderer.setConfig(selectConfig(next));
      }
      if (next.isPlaying !== prev.isPlaying) {
        if (next.isPlaying) renderer.play();
        else renderer.pause();
      }
    });

    const resize = () => {
      renderer.resize(canvas.clientWidth, canvas.clientHeight);
    };
    resize();

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    return () => {
      unsubscribe();
      resizeObserver.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [rendererRef]);

  return <canvas ref={canvasRef} className="gradient-canvas" data-transition-in />;
}
