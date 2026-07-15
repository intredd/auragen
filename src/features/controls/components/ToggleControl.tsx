interface ToggleControlProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ToggleControl({ label, value, onChange }: ToggleControlProps) {
  return (
    <label className="setting setting--inline">
      <div className="setting-topper">
        <span className="setting-name">{label}</span>
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
