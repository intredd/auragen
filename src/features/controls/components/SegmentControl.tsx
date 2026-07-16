import type { SegmentOption } from '../../gradient/types';
import { InfoTip } from './InfoTip';

interface SegmentControlProps {
  label: string;
  value: string;
  options: SegmentOption[];
  hint?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** A segmented switch: pick exactly one of a few options, shown side by side. */
export function SegmentControl({
  label,
  value,
  options,
  hint,
  disabled,
  onChange,
}: SegmentControlProps) {
  return (
    <div className="setting">
      <div className="setting-topper">
        <span className="setting-name">
          {label}
          {hint && <InfoTip text={hint} />}
        </span>
      </div>
      <div className="segment" role="radiogroup" aria-label={label}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={option.value === value}
            className={`segment-option${option.value === value ? ' is-active' : ''}`}
            onClick={() => onChange(option.value)}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
