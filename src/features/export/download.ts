/** Trigger a browser download for a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Build a timestamped filename like `gradient-2026-07-15T02-58-01.png`. */
export function timestampedName(extension: string, prefix = 'gradient'): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}-${stamp}.${extension}`;
}
