interface ColorControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorControl({ label, value, onChange }: ColorControlProps) {
  return (
    <label className="setting setting--inline">
      <div className="setting-topper">
        <span className="setting-name">{label}</span>
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
