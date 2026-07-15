import { EngineProvider } from '../features/gradient/state/EngineContext';
import { GradientCanvas } from '../features/gradient/components/GradientCanvas';
import { ControlsPanel } from '../features/controls/components/ControlsPanel';
import { BlobHandles } from '../features/controls/components/BlobHandles';
import { ExportPanel } from '../features/controls/components/ExportPanel';

export function App() {
  return (
    <EngineProvider>
      <GradientCanvas />
      <BlobHandles />
      <ControlsPanel />
      <ExportPanel />
    </EngineProvider>
  );
}
