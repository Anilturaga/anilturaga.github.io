// A tiny, reusable component kit for character-cell diagrams on OpenTUI.
//
//   <Abs>        absolute placement in cells
//   <Line>       one row of colored segments
//   <Station>    a rounded, filled box (a node)
//   <Port>       a connector glyph on a station wall
//   <WireLayer>  orthogonal wires with auto-merged junctions (├ ┬ ┼ …)
//   <Rider>      something travelling along a wire, with a motion trail
//   <Chip>       a [label] with a state
//
// Nothing here knows about merge queues; stations.tsx composes these.

import { useRef } from 'react'
import type { Pt } from '@core'

export const C = {
  bg: '#0c0c0d',
  surface: '#141416',
  fg: '#e8e8ea',
  muted: '#8b8b92',
  dim: '#5c5c63',
  faint: '#3a3a40',
  wire: '#34343a',
  border: '#46464d',
  amber: '#e9b766',
  green: '#7fd394',
  red: '#e0645d',
  card: '#cfcfd3',
} as const

export type Seg = { t: string; fg?: string; bg?: string; bold?: boolean }

// ───────────────────────── placement + text ─────────────────────────

export function Abs({ x, y, z, children }: { x: number; y: number; z?: number; children: React.ReactNode }) {
  return (
    <box position="absolute" left={x} top={y} zIndex={z}>
      {children}
    </box>
  )
}

export function Line({ segs }: { segs: Seg[] }) {
  return (
    <text>
      {segs.map((s, i) =>
        s.bold ? (
          <b key={i} fg={s.fg} bg={s.bg}>
            {s.t}
          </b>
        ) : (
          <span key={i} fg={s.fg} bg={s.bg}>
            {s.t}
          </span>
        ),
      )}
    </text>
  )
}

/** Text placed at x,y; `align` positions it relative to x (left edge, centre or right edge). */
export function Label({
  x,
  y,
  segs,
  align = 'left',
  z,
}: {
  x: number
  y: number
  segs: Seg[]
  align?: 'left' | 'center' | 'right'
  z?: number
}) {
  const len = segs.reduce((n, s) => n + [...s.t].length, 0)
  const left = align === 'left' ? x : align === 'center' ? x - Math.floor(len / 2) : x - len + 1
  return (
    <Abs x={left} y={y} z={z}>
      <Line segs={segs} />
    </Abs>
  )
}

// ───────────────────────── stations ─────────────────────────

export function Station({
  x,
  y,
  w,
  h,
  border = C.border,
  children,
}: {
  x: number
  y: number
  w: number
  h: number
  border?: string
  children?: React.ReactNode
}) {
  return (
    <>
      <box
        position="absolute"
        left={x}
        top={y}
        width={w}
        height={h}
        border
        borderStyle="rounded"
        borderColor={border}
        backgroundColor={C.bg}
        zIndex={2}
      />
      {children}
    </>
  )
}

export function Port({ x, y, lit, tone = C.amber, vertical = true }: { x: number; y: number; lit?: boolean; tone?: string; vertical?: boolean }) {
  return (
    <Abs x={x} y={y} z={4}>
      <Line segs={[{ t: vertical ? '┃' : '━', fg: lit ? tone : C.faint }]} />
    </Abs>
  )
}

// ───────────────────────── wires ─────────────────────────

/** Expand orthogonal waypoints into the ordered list of cells they pass through. */
export function cellsOf(points: Pt[]): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    const dx = Math.sign(b.x - a.x)
    const dy = Math.sign(b.y - a.y)
    let x = a.x
    let y = a.y
    if (out.length === 0) out.push({ x, y })
    while (x !== b.x || y !== b.y) {
      if (x !== b.x) x += dx
      else y += dy
      out.push({ x, y })
    }
  }
  return out
}

const N = 1, E = 2, S = 4, W = 8
const GLYPH: Record<number, string> = {
  [E]: '─', [W]: '─', [E | W]: '─',
  [N]: '│', [S]: '│', [N | S]: '│',
  [E | S]: '╭', [W | S]: '╮', [E | N]: '╰', [W | N]: '╯',
  [N | S | E]: '├', [N | S | W]: '┤', [E | W | S]: '┬', [E | W | N]: '┴',
  [N | E | S | W]: '┼',
}

export interface Wire {
  id: string
  cells: Pt[]
  dashed?: boolean
}
export interface Overlay {
  wire: string
  /** cell index range [from, to] that should be lit */
  from: number
  to: number
  fg: string
}

/** Draws every wire onto one grid so crossings and joins get proper junctions. */
export function WireLayer({ wires, overlays = [], width, height }: { wires: Wire[]; overlays?: Overlay[]; width: number; height: number }) {
  // base grid is static for a given wire set: memoise by identity
  const cache = useRef<{ wires: Wire[]; bits: Uint8Array; dashed: Uint8Array } | null>(null)
  if (!cache.current || cache.current.wires !== wires) {
    const bits = new Uint8Array(width * height)
    const dashed = new Uint8Array(width * height)
    const set = (p: Pt, b: number) => {
      if (p.x >= 0 && p.y >= 0 && p.x < width && p.y < height) bits[p.y * width + p.x] |= b
    }
    for (const w of wires) {
      for (let i = 0; i < w.cells.length - 1; i++) {
        const a = w.cells[i]
        const b = w.cells[i + 1]
        if (b.x > a.x) (set(a, E), set(b, W))
        else if (b.x < a.x) (set(a, W), set(b, E))
        else if (b.y > a.y) (set(a, S), set(b, N))
        else if (b.y < a.y) (set(a, N), set(b, S))
      }
      if (w.dashed) for (const c of w.cells) dashed[c.y * width + c.x] = 1
    }
    cache.current = { wires, bits, dashed }
  }
  const { bits, dashed } = cache.current

  const color = new Array<string | undefined>(width * height)
  for (const o of overlays) {
    const w = wires.find((x) => x.id === o.wire)
    if (!w) continue
    for (let i = Math.max(0, o.from); i <= Math.min(w.cells.length - 1, o.to); i++) {
      const c = w.cells[i]
      color[c.y * width + c.x] = o.fg
    }
  }

  const rows: React.ReactNode[] = []
  for (let y = 0; y < height; y++) {
    const segs: Seg[] = []
    let run = ''
    let runFg: string | undefined
    const flush = () => {
      if (run) segs.push({ t: run, fg: runFg })
      run = ''
    }
    let any = false
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      const b = bits[i]
      let ch = ' '
      let fg: string | undefined
      if (b) {
        any = true
        ch = GLYPH[b] ?? '┼'
        if (dashed[i]) ch = ch === '─' ? '╌' : ch === '│' ? '╎' : ch
        fg = color[i] ?? C.wire
      }
      if (fg !== runFg && ch !== ' ') {
        flush()
        runFg = fg
      }
      run += ch
    }
    flush()
    if (any)
      rows.push(
        <Abs key={y} x={0} y={y} z={1}>
          <Line segs={segs} />
        </Abs>,
      )
  }
  return <>{rows}</>
}

// ───────────────────────── riders ─────────────────────────

export function Rider({
  cells,
  t,
  glyph = '▬',
  fg = C.card,
  trail = [C.muted, C.faint],
  label,
}: {
  cells: Pt[]
  t: number
  glyph?: string
  fg?: string
  trail?: string[]
  label?: string
}) {
  if (cells.length === 0) return null
  const idx = Math.round(Math.max(0, Math.min(1, t)) * (cells.length - 1))
  const head = cells[idx]
  return (
    <>
      {trail.map((color, k) => {
        const c = cells[idx - k - 1]
        return c ? (
          <Abs key={k} x={c.x} y={c.y} z={6}>
            <Line segs={[{ t: glyph, fg: color }]} />
          </Abs>
        ) : null
      })}
      <Abs x={head.x} y={head.y} z={7}>
        <Line segs={[{ t: glyph, fg }]} />
      </Abs>
      {label && <Label x={head.x} y={head.y - 1} segs={[{ t: label, fg }]} align="center" z={7} />}
    </>
  )
}

// ───────────────────────── chips + glyph helpers ─────────────────────────

export type ChipState = 'idle' | 'active' | 'running' | 'ok' | 'bad'
const chipColors: Record<ChipState, { fg: string; bg?: string; br: string }> = {
  idle: { fg: C.dim, br: C.faint },
  active: { fg: C.fg, br: C.muted },
  running: { fg: C.muted, bg: '#17201a', br: C.faint },
  ok: { fg: C.green, bg: '#15241a', br: '#2f4a37' },
  bad: { fg: C.red, bg: '#2c1615', br: '#5b2a28' },
}

export function chipSegs(label: string, state: ChipState = 'idle'): Seg[] {
  const c = chipColors[state]
  return [
    { t: '[', fg: c.br },
    { t: label, fg: c.fg, bg: c.bg },
    { t: ']', fg: c.br },
  ]
}

const RING = ['◌', '◔', '◑', '◕', '●']
export const ringGlyph = (p: number) => RING[Math.min(4, Math.max(0, Math.floor(p * 4.999)))]
const SPIN = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
export const spinGlyph = (time: number) => SPIN[Math.floor(time * 12) % SPIN.length]
const HAND = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖']
export const clockGlyph = (deg: number) => HAND[Math.round(deg / 45) % 8]

/** Blend two hex colors; used for the builders' warm-up glow. */
export function mix(a: string, b: string, t: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

/** Smoothly follow integer targets frame by frame (keyed), for sliding rows of dots. */
export function useEased() {
  const pos = useRef(new Map<number, number>())
  return (key: number, target: number, start = target) => {
    const cur = pos.current.get(key) ?? start
    const next = Math.abs(target - cur) < 0.3 ? target : cur + (target - cur) * 0.25
    pos.current.set(key, next)
    return Math.round(next)
  }
}
