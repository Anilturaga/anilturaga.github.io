// Shared geometry helpers: renderers describe a route as a polyline and
// ask for the point (and heading) at a given progress.

export interface Pt {
  x: number
  y: number
}

export function polylineLength(pts: Pt[]) {
  let len = 0
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return len
}

/** Point at fraction t (0..1) of the polyline, plus heading in degrees. */
export function pointAlong(pts: Pt[], t: number): Pt & { angle: number } {
  if (pts.length === 0) return { x: 0, y: 0, angle: 0 }
  if (pts.length === 1) return { ...pts[0], angle: 0 }
  const total = polylineLength(pts)
  let target = Math.max(0, Math.min(1, t)) * total
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    const b = pts[i]
    const seg = Math.hypot(b.x - a.x, b.y - a.y)
    if (target <= seg || i === pts.length - 1) {
      const f = seg === 0 ? 0 : Math.min(1, target / seg)
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      }
    }
    target -= seg
  }
  const last = pts[pts.length - 1]
  return { ...last, angle: 0 }
}
