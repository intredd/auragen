import type { Vec2 } from '../types';

/**
 * Blob center <-> screen mapping.
 *
 * In the shader, `uv = fragCoord/res` then `uv.y = 1 - uv.y`, and the blob
 * center is compared directly against uv (before any aspect scaling). The two
 * y-flips cancel, so a center of (cx, cy) lands at screen (cx*W, cy*H) measured
 * from the top-left in CSS pixels.
 */
export function blobToScreen(
  position: Vec2,
  width: number,
  height: number,
): { x: number; y: number } {
  return { x: position.x * width, y: position.y * height };
}

const RANGE_MIN = -2;
const RANGE_MAX = 2;

function clampToRange(value: number): number {
  return Math.min(RANGE_MAX, Math.max(RANGE_MIN, value));
}

export function screenToBlobPosition(
  px: number,
  py: number,
  width: number,
  height: number,
): Vec2 {
  return {
    x: clampToRange(px / width),
    y: clampToRange(py / height),
  };
}

/* ---------------------------------------------------------------------------
 * Ellipse gizmo geometry.
 *
 * The blob boundary at t=0 is an ellipse with semi-axes A = size*scale*W (major,
 * along `angle`) and B = size*W (minor). Note the radius uses the WIDTH for both
 * axes (the shader's aspect correction cancels the height), while the center's
 * y still maps through H. Screen offsets (derived from the shader):
 *   major = A * ( cos a, -sin a )
 *   minor = B * ( sin a,  cos a )
 * ------------------------------------------------------------------------- */

const SIZE_MIN = 0.02;
const SIZE_MAX = 2;
const SCALE_MIN = 0.2;
const SCALE_MAX = 3;

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}

export interface GizmoGeometry {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  angleDeg: number;
  major: { x: number; y: number };
  minor: { x: number; y: number };
}

export function computeGizmoGeometry(
  position: Vec2,
  size: number,
  scale: number,
  angleDeg: number,
  width: number,
  height: number,
): GizmoGeometry {
  const cx = position.x * width;
  const cy = position.y * height;
  const a = (angleDeg * Math.PI) / 180;
  const rx = size * scale * width;
  const ry = size * width;
  return {
    cx,
    cy,
    rx,
    ry,
    angleDeg,
    major: { x: cx + rx * Math.cos(a), y: cy - rx * Math.sin(a) },
    minor: { x: cx + ry * Math.sin(a), y: cy + ry * Math.cos(a) },
  };
}

/** Major handle drag → rotation + oval stretch (size held constant). */
export function majorHandleToParams(
  position: Vec2,
  size: number,
  px: number,
  py: number,
  width: number,
  height: number,
): { angle: number; scale: number } {
  const vx = px - position.x * width;
  const vy = py - position.y * height;
  let angle = (Math.atan2(-vy, vx) * 180) / Math.PI;
  angle = ((angle % 180) + 180) % 180;
  const major = Math.hypot(vx, vy);
  const scale = clamp(major / (size * width), SCALE_MIN, SCALE_MAX);
  return { angle, scale };
}

/** Distance (px) from a blob center to a screen point. */
export function distanceFromCenter(
  position: Vec2,
  px: number,
  py: number,
  width: number,
  height: number,
): number {
  return Math.hypot(px - position.x * width, py - position.y * height);
}

/**
 * Outline drag → uniform resize. Scales `size` by how far the pointer moved
 * relative to where the drag started (keeps oval ratio and rotation).
 */
export function resizeFromOutline(
  position: Vec2,
  startSize: number,
  startDist: number,
  px: number,
  py: number,
  width: number,
  height: number,
): { size: number } {
  if (startDist <= 0) return { size: startSize };
  const dist = distanceFromCenter(position, px, py, width, height);
  return { size: clamp((startSize * dist) / startDist, SIZE_MIN, SIZE_MAX) };
}
