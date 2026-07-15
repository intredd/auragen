import { InfoTip } from './InfoTip';

interface ToggleControlProps {
  label: string;
  value: boolean;
  hint?: string;
  onChange: (value: boolean) => void;
}

export function ToggleControl({ label, value, hint, onChange }: ToggleControlProps) {
  return (
    <label className="setting setting--inline">
      <div className="setting-topper">
        <span className="setting-name">
          {label}
          {hint && <InfoTip text={hint} />}
        </span>
      </div>
      <input
        className="setting-checkbox"
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}
