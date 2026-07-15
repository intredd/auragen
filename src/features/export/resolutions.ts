export interface ResolutionPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

/** Common social / print output sizes. */
export const resolutionPresets: ResolutionPreset[] = [
  { id: 'square', label: 'Square — 1080×1080', width: 1080, height: 1080 },
  { id: 'story', label: 'Story — 1080×1920', width: 1080, height: 1920 },
  { id: 'portrait', label: 'Portrait — 1080×1350', width: 1080, height: 1350 },
  { id: 'wide', label: 'Wide — 1920×1080', width: 1920, height: 1080 },
  { id: 'poster', label: 'Poster A4 — 2480×3508', width: 2480, height: 3508 },
];

export const defaultResolutionId = 'square';
