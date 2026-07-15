import type { FieldConfig } from '../../gradient/types';
import { RangeControl } from './RangeControl';
import { ColorControl } from './ColorControl';
import { ToggleControl } from './ToggleControl';

interface FieldControlProps<T> {
  field: FieldConfig<T>;
  target: T;
  onPatch: (patch: Partial<T>) => void;
}

/**
 * Renders a single config-driven control for any target object (a blob or the
 * global settings), reading and writing via the field's get/set functions.
 */
export function FieldControl<T>({ field, target, onPatch }: FieldControlProps<T>) {
  if (field.kind === 'range') {
    return (
      <RangeControl
        label={field.label}
        value={field.get(target)}
        min={field.min}
        max={field.max}
        step={field.step}
        onChange={(value) => onPatch(field.set(value, target))}
      />
    );
  }

  if (field.kind === 'toggle') {
    return (
      <ToggleControl
        label={field.label}
        value={field.get(target)}
        onChange={(value) => onPatch(field.set(value, target))}
      />
    );
  }

  return (
    <ColorControl
      label={field.label}
      value={field.get(target)}
      onChange={(value) => onPatch(field.set(value, target))}
    />
  );
}
