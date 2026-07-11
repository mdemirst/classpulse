/** Flat-top hexagon geometry (shared across all hex components). */

export function hexPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(" ");
}

export function hexClipPath(): string {
  return "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
}

/** Width of a flat-top hex with given radius (vertex to vertex horizontally). */
export function hexWidth(r: number): number {
  return r * 2;
}

/** Height of a flat-top hex with given radius. */
export function hexHeight(r: number): number {
  return Math.sqrt(3) * r;
}
