interface InfoTipProps {
  text: string;
}

/**
 * A small "?" icon that reveals an explanatory tooltip on hover or keyboard
 * focus. Purely CSS-driven visibility (see ControlsPanel.css); the icon is
 * focusable so the hint is reachable without a pointer.
 */
export function InfoTip({ text }: InfoTipProps) {
  return (
    <span
      className="info-tip"
      tabIndex={0}
      role="note"
      aria-label={text}
      onClick={(event) => event.preventDefault()}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="8" cy="4.7" r="0.95" fill="currentColor" stroke="none" />
        <path d="M8 7v5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="info-tip-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
