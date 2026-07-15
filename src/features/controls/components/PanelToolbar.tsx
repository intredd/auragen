import { useState } from 'react';
import { selectConfig, useGradientStore } from '../../gradient/state/useGradientStore';
import { buildShareUrl } from '../../presets';

/**
 * Always-visible top bar of the controls panel: play/pause, open export menu,
 * share preset, toggle on-canvas handles, and expand/collapse the panel.
 */
export function PanelToolbar() {
  const isPlaying = useGradientStore((state) => state.isPlaying);
  const isPanelOpen = useGradientStore((state) => state.isPanelOpen);
  const togglePlaying = useGradientStore((state) => state.togglePlaying);
  const togglePanel = useGradientStore((state) => state.togglePanel);
  const toggleExport = useGradientStore((state) => state.toggleExport);
  const showHandles = useGradientStore((state) => state.showHandles);
  const toggleHandles = useGradientStore((state) => state.toggleHandles);

  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = async () => {
    const url = buildShareUrl(selectConfig(useGradientStore.getState()));
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1500);
    } catch {
      window.prompt('Copy this share link:', url);
    }
  };

  return (
    <div className="panel-topper">
      <div className="panel-screen-menu">
        <button type="button" className="panel-play" onClick={togglePlaying}>
          {isPlaying ? 'Stop' : 'Play'}
        </button>
        <button type="button" className="panel-export" onClick={toggleExport}>
          Export
        </button>
        <button type="button" className="panel-share" onClick={handleShare}>
          {shareCopied ? 'Copied!' : 'Share'}
        </button>
        <button
          type="button"
          className={`panel-handles${showHandles ? ' is-active' : ''}`}
          onClick={toggleHandles}
          title={showHandles ? 'Hide handles' : 'Show handles'}
          aria-label={showHandles ? 'Hide handles' : 'Show handles'}
          aria-pressed={showHandles}
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </button>
      </div>

      <button
        type="button"
        className={`panel-toggle${isPanelOpen ? ' is-open' : ''}`}
        title={isPanelOpen ? 'Collapse settings' : 'Open settings'}
        aria-label={isPanelOpen ? 'Collapse settings' : 'Open settings'}
        aria-expanded={isPanelOpen}
        onClick={togglePanel}
      >
        <svg
          className="panel-toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
