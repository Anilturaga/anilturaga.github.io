import { copy, type CheckState, type MergeSim, type SimState } from '@core'
import { Abs, C, Label, Line, Rider, cellsOf, chipSegs, clockGlyph, useEased, type ChipState, type Seg } from './kit'

export function Header({ sim }: { sim: MergeSim }) {
  return (
    <box height={2} flexShrink={0} flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1}>
      <Line
        segs={[
          { t: copy.header.live, fg: C.green },
          { t: ' · ' + copy.header.subtitle, fg: C.dim },
        ]}
      />
      <Line
        segs={[
          { t: copy.header.clock + ' ', fg: C.dim },
          { t: '(', fg: C.muted },
          { t: clockGlyph(sim.clockAngle), fg: C.fg },
          { t: ')', fg: C.muted },
        ]}
      />
    </box>
  )
}

export function Rule() {
  return (
    <box height={1} flexShrink={0} paddingLeft={1}>
      <Line segs={[{ t: '─'.repeat(116), fg: C.faint }]} />
    </box>
  )
}

/** A dashed chain of chips: ╌╌[a]╌›[b]╌›[c] — returns segments and each chip's centre column. */
function chain(labels: readonly string[], states: ChipState[], lead = 0): { segs: Seg[]; centers: number[]; width: number } {
  const segs: Seg[] = []
  const centers: number[] = []
  let x = 0
  if (lead) {
    segs.push({ t: '╌'.repeat(lead), fg: C.faint })
    x += lead
  }
  labels.forEach((l, i) => {
    if (i > 0) {
      segs.push({ t: '╌›', fg: C.faint })
      x += 2
    }
    segs.push(...chipSegs(l, states[i]))
    centers.push(x + Math.floor((l.length + 2) / 2))
    x += l.length + 2
  })
  return { segs, centers, width: x }
}

const checkChip: Record<CheckState, ChipState> = { idle: 'idle', running: 'running', ok: 'ok', bad: 'bad' }

export function NextLane({ s }: { s: SimState }) {
  const n = s.next
  const eased = useEased()
  const X0 = 6
  const AFTER = 66
  const GAP = 5
  const steps = chain(
    copy.next.steps,
    copy.next.steps.map((_, i) => (n.step === i ? 'active' : 'idle')),
    4,
  )
  const pushX = X0 + steps.centers[steps.centers.length - 1]
  const travel = s.packets.find((p) => p.route === 'next:push>after')
  const travelCells = cellsOf([
    { x: pushX, y: 1 },
    { x: AFTER, y: 1 },
    { x: AFTER, y: 2 },
  ])
  const afterW = GAP * 9 + 3
  // one eased x per commit so dots and their labels slide together
  const xs = n.commits.map((c, i) => eased(c.id, AFTER + i * GAP, AFTER))
  return (
    <box height={6} flexShrink={0} position="relative">
      <Label x={1} y={0} segs={[{ t: copy.next.eyebrow, fg: C.muted }, { t: ' · ' + copy.next.id, fg: C.dim }]} />
      {n.step >= 0 && <Label x={X0 + steps.centers[n.step] - 1} y={1} segs={[{ t: '▄▄', fg: C.muted }]} />}
      {travel && <Rider cells={travelCells} t={travel.t} glyph="▄" fg={C.muted} />}
      <Abs x={X0} y={2}>
        <Line segs={[...steps.segs, { t: '╌'.repeat(AFTER - X0 - steps.width - 2), fg: C.faint }]} />
      </Abs>
      <Label x={X0 + 4 + Math.floor((steps.width - 4) / 2)} y={3} align="center" segs={[{ t: copy.next.beforeTitle, fg: C.fg }]} />
      {copy.next.beforeNotes.map((t, i) => (
        <Label key={t} x={X0 + 4 + Math.floor((steps.width - 4) / 2)} y={4 + i} align="center" segs={[{ t, fg: C.dim }]} />
      ))}

      {/* after.sh commit line */}
      <Label x={AFTER - 1} y={2} segs={[{ t: '─'.repeat(afterW), fg: C.wire }, { t: '┃', fg: C.border }]} />
      {n.commits.map((c, i) => {
        const x = xs[i]
        return (
          <Abs key={c.id} x={x - (i === 0 ? 1 : 0)} y={2} z={2}>
            <Line
              segs={
                i === 0
                  ? [{ t: '(', fg: C.border }, { t: '●', fg: c.culprit ? C.red : C.card }, { t: ')', fg: C.border }]
                  : [{ t: '●', fg: c.culprit ? C.red : '#b9b9be' }]
              }
            />
          </Abs>
        )
      })}
      {n.commits.map((c, i) =>
        c.culprit ? <Label key={'l' + c.id} x={xs[i]} y={1} align="center" segs={[{ t: copy.next.culprit, fg: C.red }]} /> : null,
      )}
      <Label
        x={AFTER}
        y={3}
        segs={[
          { t: '╰╌ ', fg: C.faint },
          { t: copy.next.afterTitle, fg: C.fg, bold: true },
          { t: ' · ' + copy.next.afterSub, fg: C.muted },
        ]}
      />
      <Abs x={AFTER + 3} y={4}>
        <Line segs={copy.next.checks.flatMap((c, i) => [...chipSegs(c, checkChip[n.checks[i]]), { t: ' ' }])} />
      </Abs>
      <Label x={AFTER + 3} y={5} segs={[{ t: copy.next.afterNote, fg: C.dim }]} />
    </box>
  )
}

export function Coming() {
  return (
    <box flexDirection="column" paddingLeft={1} flexShrink={0} gap={0}>
      <Line segs={[{ t: copy.coming.eyebrow, fg: C.muted }, { t: ' · ' + copy.coming.sub, fg: C.dim }]} />
      {copy.coming.items.map((item) => {
        const c = chain(item.steps, item.steps.map(() => 'idle'))
        const tail: Seg[] =
          'tail' in item && item.tail
            ? [{ t: '   ' + '⊠'.repeat(item.tail.crosses) + ' ', fg: C.dim }, { t: item.tail.label, fg: C.dim }]
            : []
        return (
          <box key={item.id} flexDirection="column" flexShrink={0}>
            <Line
              segs={[
                { t: item.id + ' ', fg: C.muted },
                { t: item.title, fg: C.dim },
                ...('note' in item ? [{ t: ' · ' + item.note, fg: C.faint }] : []),
              ]}
            />
            <box paddingLeft={4}>
              <Line segs={[...c.segs, ...tail]} />
            </box>
          </box>
        )
      })}
    </box>
  )
}

export function Footer({ paused, speed }: { paused: boolean; speed: number }) {
  const key = (k: string, label: string, on: boolean): Seg[] => [
    { t: ` ${k} `, fg: on ? C.bg : C.fg, bg: on ? C.fg : C.surface },
    { t: ' ' + label + '  ', fg: on ? C.fg : C.dim },
  ]
  return (
    <box height={1} flexDirection="row" justifyContent="space-between" paddingLeft={1} paddingRight={1} marginTop={1} flexShrink={0}>
      <Line segs={[{ t: copy.footer, fg: C.muted }]} />
      <Line
        segs={[
          ...key('space', paused ? 'Resume' : 'Pause', paused),
          ...key('1', '1×', speed === 1),
          ...key('2', '¼×', speed === 0.25),
          ...key('q', 'quit', false),
        ]}
      />
    </box>
  )
}
