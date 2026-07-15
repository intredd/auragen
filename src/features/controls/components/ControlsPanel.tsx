import { useState } from 'react';
import {
  blobFields,
  globalFields,
  MAX_BLOBS,
  visualBlobFieldIds,
} from '../../gradient/config/gradientSettings';
import { demos, defaultDemoId } from '../../gradient/config/demos';
import { useGradientStore } from '../../gradient/state/useGradientStore';
import { FieldControl } from './FieldControl';
import { PanelToolbar } from './PanelToolbar';
import './ControlsPanel.css';

const primaryBlobFields = blobFields.filter((field) => !visualBlobFieldIds.includes(field.id));
const manualBlobFields = blobFields.filter((field) => visualBlobFieldIds.includes(field.id));

export function ControlsPanel() {
  const [showManual, setShowManual] = useState(false);
  const [activeDemo, setActiveDemo] = useState(defaultDemoId);
  const isPanelOpen = useGradientStore((state) => state.isPanelOpen);
  const blobs = useGradientStore((state) => state.blobs);
  const global = useGradientStore((state) => state.global);
  const selectedBlobId = useGradientStore((state) => state.selectedBlobId);

  const addBlob = useGradientStore((state) => state.addBlob);
  const duplicateBlob = useGradientStore((state) => state.duplicateBlob);
  const removeBlob = useGradientStore((state) => state.removeBlob);
  const updateBlob = useGradientStore((state) => state.updateBlob);
  const selectBlob = useGradientStore((state) => state.selectBlob);
  const setGlobal = useGradientStore((state) => state.setGlobal);
  const setConfig = useGradientStore((state) => state.setConfig);
  const resetConfig = useGradientStore((state) => state.resetConfig);

  const selectedBlob = blobs.find((blob) => blob.id === selectedBlobId) ?? null;
  const atLimit = blobs.length >= MAX_BLOBS;

  const handleDemoChange = (id: string) => {
    const demo = demos.find((item) => item.id === id);
    if (!demo) return;
    setActiveDemo(id);
    setConfig(demo.create());
  };

  return (
    <div className={`panel-parent${isPanelOpen ? ' is-open' : ''}`}>
      <PanelToolbar />

      <div className="panel-settings">
        <section className="settings-tab">
          <div className="settings-tab-header">
            <p className="settings-tab-name">Demo</p>
          </div>
          <select
            className="setting-select"
            value={activeDemo}
            onChange={(event) => handleDemoChange(event.target.value)}
          >
            {demos.map((demo) => (
              <option key={demo.id} value={demo.id}>
                {demo.label}
              </option>
            ))}
          </select>
        </section>

        <section className="settings-tab">
          <div className="settings-tab-header">
            <p className="settings-tab-name">
              Blobs <span className="settings-tab-count">{blobs.length}/{MAX_BLOBS}</span>
            </p>
            <button
              type="button"
              className="panel-btn"
              onClick={() => addBlob()}
              disabled={atLimit}
            >
              + Add
            </button>
          </div>

          <div className="blob-list">
            {blobs.map((blob, index) => (
              <button
                key={blob.id}
                type="button"
                className={`blob-chip${blob.id === selectedBlobId ? ' is-selected' : ''}`}
                onClick={() => selectBlob(blob.id)}
              >
                <span className="blob-chip-color" style={{ backgroundColor: blob.color }} />
                Blob {index + 1}
              </button>
            ))}
          </div>
        </section>

        {selectedBlob && (
          <section className="settings-tab">
            <div className="settings-tab-header">
              <p className="settings-tab-name">Blob settings</p>
              <div className="blob-actions">
                <button
                  type="button"
                  className="panel-btn"
                  onClick={() => duplicateBlob(selectedBlob.id)}
                  disabled={atLimit}
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  className="panel-btn panel-btn--danger"
                  onClick={() => removeBlob(selectedBlob.id)}
                  disabled={blobs.length <= 1}
                >
                  Delete
                </button>
              </div>
            </div>

            <div className="settings-tab-menu">
              {primaryBlobFields.map((field) => (
                <FieldControl
                  key={field.id}
                  field={field}
                  target={selectedBlob}
                  onPatch={(patch) => updateBlob(selectedBlob.id, patch)}
                />
              ))}

              <button
                type="button"
                className="reveal-toggle"
                aria-expanded={showManual}
                onClick={() => setShowManual((value) => !value)}
              >
                {showManual ? '▾ Manual controls' : '▸ Manual controls (size, rotation, position)'}
              </button>

              {showManual &&
                manualBlobFields.map((field) => (
                  <FieldControl
                    key={field.id}
                    field={field}
                    target={selectedBlob}
                    onPatch={(patch) => updateBlob(selectedBlob.id, patch)}
                  />
                ))}
            </div>
          </section>
        )}

        <section className="settings-tab">
          <p className="settings-tab-name">Global</p>
          <div className="settings-tab-menu">
            {globalFields.map((field) => (
              <FieldControl
                key={field.id}
                field={field}
                target={global}
                onPatch={(patch) => setGlobal(patch)}
              />
            ))}
            <button type="button" className="panel-btn panel-reset" onClick={resetConfig}>
              Reset scene
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
