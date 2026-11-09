import { useRef } from 'react'
import {
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  type EdgeProps,
} from '@xyflow/react'
import type { Packet, Pt } from '@core'
import { useSim } from '@/sim'
import { Card, toneColor } from '../nodes/parts'

// Edges own their geometry *and* whatever is riding on them: any sim packet
// whose route matches the edge id is placed with getPointAtLength() on the
// edge's live SVG path, so the packets follow the wires wherever they go.

const WIRE = 'var(--color-wire)'

/** Orthogonal polyline with rounded corners → SVG path string. */
function roundedPath(points: Pt[], r = 12) {
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y)
    const l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y)
    const rr = Math.min(r, l1 / 2, l2 / 2)
    const a = { x: p1.x - ((p1.x - p0.x) / (l1 || 1)) * rr, y: p1.y - ((p1.y - p0.y) / (l1 || 1)) * rr }
    const b = { x: p1.x + ((p2.x - p1.x) / (l2 || 1)) * rr, y: p1.y + ((p2.y - p1.y) / (l2 || 1)) * rr }
    d += ` L ${a.x} ${a.y} Q ${p1.x} ${p1.y} ${b.x} ${b.y}`
  }
  const last = points[points.length - 1]
  return d + ` L ${last.x} ${last.y}`
}

function pointOn(path: SVGPathElement | null, t: number) {
  if (!path) return null
  const len = path.getTotalLength()
  const at = Math.max(0, Math.min(1, t)) * len
  const p = path.getPointAtLength(at)
  const q = path.getPointAtLength(Math.min(len, at + 1))
  const back = path.getPointAtLength(Math.max(0, at - 1))
  return { x: p.x, y: p.y, angle: (Math.atan2(q.y - back.y, q.x - back.x) * 180) / Math.PI, len }
}

function PacketBody({ packet, path }: { packet: Packet; path: SVGPathElement | null }) {
  const head = pointOn(path, packet.t)
  if (!head) return null
  const isChip = packet.kind === 'chip'
  // motion streak: a few fading ghosts trailing behind the head
  const ghosts = isChip ? [] : [0.045, 0.03, 0.015].map((dt) => ({ dt, p: pointOn(path, packet.t - dt * Math.sin(Math.PI * packet.raw) * 1.6) }))
  const spin = packet.spin * Math.sin(Math.PI * Math.min(1, packet.raw * 1.1))
  const color = toneColor[packet.tone]
  return (
    <>
      {ghosts.map(
        ({ dt, p }) =>
          p && (
            <div
              key={dt}
              className="pointer-events-none absolute"
              style={{
                transform: `translate(-50%,-50%) translate(${p.x}px,${p.y}px) rotate(${spin}deg)`,
                opacity: 0.18 + (0.045 - dt) * 4,
                filter: 'blur(1.5px)',
                zIndex: 1000,
              }}
            >
              <Card />
            </div>
          ),
      )}
      <div
        className="pointer-events-none absolute"
        style={{
          transform: `translate(-50%,-50%) translate(${head.x}px,${head.y}px) rotate(${spin}deg)`,
          zIndex: 1001,
        }}
      >
        {isChip ? (
          <div className="relative">
            <div className="h-[8px] w-[14px] rounded-[2px]" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
            {packet.label && (
              <span
                className="absolute bottom-[11px] left-1/2 -translate-x-1/2 text-[9.5px] font-medium whitespace-nowrap"
                style={{ color }}
              >
                {packet.label}
              </span>
            )}
          </div>
        ) : (
          <Card pip={packet.pip} />
        )}
      </div>
    </>
  )
}

function useRiders(id: string) {
  const state = useSim()
  return state.packets.filter((p) => p.route === id)
}

/** Straight, bezier or stepped wire between two handles. */
export function WireEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props
  const ref = useRef<SVGPathElement>(null)
  const riders = useRiders(id)
  const shape = (data as { shape?: string })?.shape
  const [d] =
    shape === 'bezier'
      ? getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.45 })
      : shape === 'step'
        ? getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 12 })
        : getStraightPath({ sourceX, sourceY, targetX, targetY })
  return (
    <>
      <path ref={ref} d={d} fill="none" stroke={WIRE} strokeWidth={1.4} />
      {riders.length > 0 && (
        <EdgeLabelRenderer>
          {riders.map((p) => (
            <PacketBody key={p.id} packet={p} path={ref.current} />
          ))}
        </EdgeLabelRenderer>
      )}
    </>
  )
}

/**
 * Return route: source → guides (each moves along one axis) → the builder's
 * row → into the builder. The traversed part lights up in the packet's tone.
 */
export function ReturnEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, data } = props
  const ref = useRef<SVGPathElement>(null)
  const riders = useRiders(id)
  const guides = (data as { guides: { x?: number; y?: number }[] }).guides
  const pts: Pt[] = [{ x: sourceX, y: sourceY }]
  for (const g of guides) {
    const prev = pts[pts.length - 1]
    pts.push({ x: g.x ?? prev.x, y: g.y ?? prev.y })
  }
  const prev = pts[pts.length - 1]
  pts.push({ x: prev.x, y: targetY }, { x: targetX, y: targetY })
  const d = roundedPath(pts, 14)
  const len = ref.current?.getTotalLength() ?? 0
  return (
    <>
      <path ref={ref} d={d} fill="none" stroke={WIRE} strokeWidth={1.4} />
      {riders.map((p) => (
        <path
          key={p.id}
          d={d}
          fill="none"
          stroke={toneColor[p.tone]}
          strokeOpacity={0.55}
          strokeWidth={1.4}
          strokeDasharray={`${p.t * len} ${len}`}
        />
      ))}
      {riders.length > 0 && (
        <EdgeLabelRenderer>
          {riders.map((p) => (
            <PacketBody key={p.id} packet={p} path={ref.current} />
          ))}
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const edgeTypes = { wire: WireEdge, return: ReturnEdge }
