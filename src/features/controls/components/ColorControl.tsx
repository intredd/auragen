import { InfoTip } from './InfoTip';

interface ColorControlProps {
  label: string;
  value: string;
  hint?: string;
  onChange: (value: string) => void;
}

export function ColorControl({ label, value, hint, onChange }: ColorControlProps) {
  return (
    <label className="setting setting--inline">
      <div className="setting-topper">
        <span className="setting-name">
          {label}
          {hint && <InfoTip text={hint} />}
        </span>
        <span className="setting-value">{value}</span>
      </div>
      <input
        className="setting-color"
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}
