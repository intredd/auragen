import {
  createContext,
  useContext,
  useRef,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import type { GradientRenderer } from '../engine';

interface EngineContextValue {
  /** Shared reference to the active renderer instance. */
  rendererRef: MutableRefObject<GradientRenderer | null>;
}

const EngineContext = createContext<EngineContextValue | null>(null);

/**
 * Provides a shared renderer reference so the canvas (which owns the renderer)
 * and the controls/export UI can talk to the same engine instance.
 */
export function EngineProvider({ children }: { children: ReactNode }) {
  const rendererRef = useRef<GradientRenderer | null>(null);
  return (
    <EngineContext.Provider value={{ rendererRef }}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine(): EngineContextValue {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error('useEngine must be used within an <EngineProvider>');
  }
  return context;
}
