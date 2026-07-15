import { InfoTip } from './InfoTip';

interface RangeControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  onChange: (value: number) => void;
}

function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
}

export function RangeControl({ label, value, min, max, step, hint, onChange }: RangeControlProps) {
  return (
    <label className="setting">
      <div className="setting-topper">
        <span className="setting-name">
          {label}
          {hint && <InfoTip text={hint} />}
        </span>
        <span className="setting-value">{formatValue(value)}</span>
      </div>
      <input
        className="setting-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(parseFloat(event.target.value))}
      />
    </label>
  );
}
