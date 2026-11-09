import { copy, type SimState } from '@core'
import { Abs, C, Label, Line, Port, Rider, Station, WireLayer, mix, ringGlyph, spinGlyph, useEased, type Overlay, type Seg } from './kit'
import { BUILDER_ROWS, L, STAGE, routeCells, wires } from './layout'

const tone = { neutral: C.card, amber: C.amber, green: C.green, red: C.red }

// ───────────────────────── builders ─────────────────────────

export function Builders({ s }: { s: SimState }) {
  return (
    <>
      <Label x={2} y={0} segs={[{ t: copy.builders.title, fg: C.muted }]} />
      {s.builders.map((b, i) => {
        const row = BUILDER_ROWS[i]
        const working = b.state === 'working'
        const ready = b.state === 'ready'
        const heat = working ? 0.45 + 0.55 * b.progress : ready ? 0.3 : 0
        const bg = heat > 0 ? mix(C.surface, C.amber, heat) : C.surface
        const fg = heat > 0.5 ? '#3b2c12' : heat > 0 ? C.amber : C.dim
        const text = b.lines.map((w) => '═'.repeat(Math.max(1, Math.round(w * 3)))).join(' ').slice(0, 4).padEnd(4)
        return (
          <Abs key={i} x={0} y={row - 1}>
            <box flexDirection="column">
              <Line
                segs={[
                  { t: '   ' },
                  { t: working || b.ping > 0 ? '•' : '·', fg: working || b.ping > 0 ? C.amber : C.faint },
                  ...(b.ping > 0.05 && b.reason
                    ? [{ t: '   ' + b.reason, fg: b.reason === 'fixes' ? C.amber : C.red }]
                    : []),
                ]}
              />
              <Line
                segs={[
                  { t: '  ' },
                  { t: '[', fg: C.muted },
                  { t: '••', fg: working ? C.amber : C.muted },
                  { t: ']', fg: C.muted },
                  { t: ' ' },
                  { t: ` ${text} `, fg, bg },
                ]}
              />
            </box>
          </Abs>
        )
      })}
      <Label x={2} y={11} segs={[{ t: copy.builders.caption, fg: C.dim }]} />
    </>
  )
}

// ───────────────────────── hand-off ─────────────────────────

export function Handoff({ s }: { s: SimState }) {
  const h = L.handoff
  const inbound = s.packets.some((p) => p.route.startsWith('build:') && p.raw > 0.8)
  const outbound = s.packets.some((p) => p.route === 'handoff>integrator' && p.raw < 0.3)
  return (
    <>
      <Label
        x={h.x - 1}
        y={0}
        segs={[
          { t: copy.handoff.title, fg: C.fg, bold: true },
          { t: ' · ' + copy.handoff.sub, fg: C.muted },
        ]}
      />
      <Station x={h.x} y={h.y} w={h.w} h={h.h} />
      <Port x={h.x} y={7} lit={inbound} />
      <Port x={h.x + h.w - 1} y={7} lit={outbound} tone={C.green} />
      {s.handoff.map((slot, i) => {
        const y = h.slots[i]
        let segs: Seg[]
        if (!slot) segs = [{ t: ' ◌  ', fg: C.faint }]
        else if (slot.phase === 'entering') {
          // slide in from the wall
          const pad = Math.round((1 - slot.progress) * 2)
          segs = [{ t: ' '.repeat(Math.max(0, 2 - pad)) }, { t: '▬', fg: C.muted }]
          segs.unshift({ t: ' '.repeat(pad) })
        } else if (slot.phase === 'proving')
          segs = [{ t: ringGlyph(slot.progress), fg: C.amber }, { t: ' ' }, { t: '▬', fg: C.card }]
        else segs = [{ t: '●', fg: C.green }, { t: ' ' }, { t: '▬', fg: C.card }, { t: '•', fg: C.green }]
        return (
          <Abs key={i} x={h.slotX} y={y} z={3}>
            <Line segs={segs} />
          </Abs>
        )
      })}
      {copy.handoff.notes.map((n, i) => (
        <Label key={n} x={4} y={13 + i} segs={[{ t: n, fg: C.dim }]} />
      ))}
    </>
  )
}

// ───────────────────────── integrator ─────────────────────────

export function Integrator({ s }: { s: SimState }) {
  const g = s.integrator
  const b = L.integrator
  const clamped = g.phase === 'clamp' || g.phase === 'step' || g.phase === 'conflict'
  const running = g.phase === 'step'
  const red = g.tone === 'red'
  const flick = running && Math.floor(s.time * 8) % 2 === 0
  const plate = '▀▀▀▀▀▀'
  return (
    <>
      <Label
        x={b.cx}
        y={1}
        align="center"
        segs={[
          { t: copy.integrator.title, fg: C.fg, bold: true },
          { t: ' · ' + copy.integrator.sub, fg: C.muted },
        ]}
      />
      <Label x={b.cx} y={2} align="center" segs={[{ t: copy.integrator.stats, fg: C.amber }]} />
      <Station x={b.x} y={b.y} w={b.w} h={b.h} />
      <Port x={b.x} y={b.mid} lit={g.phase !== 'idle'} tone={red ? C.red : C.amber} />
      <Port x={b.x + b.w - 1} y={b.mid} lit={g.phase === 'release'} tone={C.green} />
      {/* clamp plates + rods */}
      <Label x={b.cx - 3} y={clamped ? b.y + 2 : b.y + 1} z={3} segs={[{ t: plate, fg: '#55555c' }]} />
      <Label x={b.cx - 3} y={clamped ? b.y + 4 : b.y + 5} z={3} segs={[{ t: '▄▄▄▄▄▄', fg: '#55555c' }]} />
      {clamped && (
        <>
          <Label x={b.cx} y={b.y + 1} z={3} segs={[{ t: '┃', fg: '#3a3a40' }]} />
          <Label x={b.cx} y={b.y + 5} z={3} segs={[{ t: '┃', fg: '#3a3a40' }]} />
        </>
      )}
      {g.change && (
        <Label
          x={b.cx - 4}
          y={b.mid}
          z={3}
          segs={[
            { t: flick ? '≡ ' : '  ', fg: C.muted },
            { t: clamped && !red ? '⟦' : ' ', fg: C.amber },
            { t: '▬▬', fg: red ? C.red : C.card },
            { t: clamped && !red ? '⟧' : ' ', fg: C.amber },
            { t: flick ? ' ≡' : '  ', fg: C.muted },
          ]}
        />
      )}
      {g.title && (
        <Label
          x={b.cx}
          y={b.y + b.h}
          align="center"
          segs={[{ t: g.title, fg: red ? C.red : g.change?.lane === 'fast' ? C.amber : C.muted }]}
        />
      )}
      {g.sub && <Label x={b.cx} y={b.y + b.h + 1} align="center" segs={[{ t: g.sub, fg: C.dim }]} />}
    </>
  )
}

// ───────────────────────── main line ─────────────────────────

export function MainLine({ s }: { s: SimState }) {
  const m = L.main
  const eased = useEased()
  const red = s.mainStatus === 'red'
  const reviewing = new Set([s.review.change?.id, ...s.review.queue.map((c) => c.id)])
  const lineColor = red ? '#5b2a28' : '#27482f'
  return (
    <>
      <Label
        x={m.x + 1}
        y={m.y - 2}
        segs={[
          { t: copy.main.title, fg: C.fg, bold: true },
          { t: ' · ', fg: C.dim },
          { t: red ? copy.main.red : copy.main.green, fg: red ? C.red : C.green },
        ]}
      />
      <Label x={m.x} y={m.y} z={2} segs={[{ t: '━'.repeat(m.end - m.x), fg: lineColor }]} />
      <Label x={m.end} y={m.y} z={3} segs={[{ t: '┃', fg: C.border }]} />
      {s.main.map((c, i) => {
        const x = eased(c.id, m.dot0 + i * m.gap, m.dot0)
        if (x >= m.end - 1) return null
        const fg = c.status === 'red' ? C.red : c.status === 'green' ? C.green : C.card
        const ring = reviewing.has(c.changeId) ? C.amber : s.gate.phase === 'running' && i === 0 ? C.muted : undefined
        const fresh = c.age < 0.5
        return (
          <Abs key={c.id} x={x - 1} y={m.y} z={4}>
            <Line
              segs={[
                { t: ring ? '(' : '━', fg: ring ?? lineColor },
                { t: fresh ? '◉' : '●', fg },
                { t: ring ? ')' : '━', fg: ring ?? lineColor },
              ]}
            />
          </Abs>
        )
      })}
    </>
  )
}

// ───────────────────────── full gate ─────────────────────────

export function Gate({ s }: { s: SimState }) {
  const g = L.gate
  const gate = s.gate
  const [from, to] = g.track
  const running = gate.phase === 'running'
  const done = gate.phase === 'pass' || gate.phase === 'fail'
  const x = Math.round(from + (to - from) * (running ? gate.progress : 1))
  const fg = gate.phase === 'pass' ? C.green : gate.phase === 'fail' ? C.red : C.muted
  return (
    <>
      <Label
        x={g.x + g.w - 1}
        y={g.y - 2}
        align="right"
        segs={[
          { t: copy.gate.title, fg: C.fg, bold: true },
          { t: ' · ' + copy.gate.sub, fg: C.muted },
        ]}
      />
      <Label x={g.x + g.w - 1} y={g.y - 1} align="right" segs={[{ t: copy.gate.note, fg: C.dim }]} />
      <Station x={g.x} y={g.y} w={g.w} h={g.h} />
      <Port x={g.x} y={g.y + 1} lit={running} tone={C.card} />
      <Port x={g.x + g.w - 1} y={g.y + 1} lit={gate.phase === 'fail'} tone={C.red} />
      {(running || done) && (
        <Label
          x={from}
          y={g.y + 1}
          z={3}
          segs={[
            { t: '━'.repeat(Math.max(0, x - from)), fg },
            { t: gate.phase === 'pass' ? '✓' : gate.phase === 'fail' ? '✗' : '●', fg: done ? fg : C.card },
          ]}
        />
      )}
    </>
  )
}

// ───────────────────────── Opus review ─────────────────────────

export function Review({ s }: { s: SimState }) {
  const r = s.review
  const b = L.review
  const reviewing = r.phase === 'reviewing'
  return (
    <>
      <Station x={b.x} y={b.y} w={b.w} h={b.h} />
      <Port x={b.slot} y={b.y} vertical={false} lit={s.packets.some((p) => p.route === 'main>review')} tone={C.card} />
      <Port x={b.x} y={b.y + 2} lit={r.outcome === 'fixes'} />
      <Label
        x={b.slot - 2}
        y={b.y + 2}
        z={3}
        segs={
          r.change
            ? [
                { t: reviewing ? spinGlyph(s.time) : r.outcome === 'fixes' ? '!' : '✓', fg: reviewing || r.outcome === 'fixes' ? C.amber : C.green },
                { t: ' ' },
                { t: '▮', fg: r.outcome === 'fixes' ? C.amber : C.card },
                { t: reviewing ? ' ' + Math.round(r.progress * 100) + '%' : '', fg: C.dim },
              ]
            : [{ t: '  ◌', fg: C.faint }]
        }
      />
      <Label x={b.x + b.w + 2} y={b.y} segs={[{ t: copy.review.title, fg: C.fg, bold: true }]} />
      {copy.review.notes.map((n, i) => (
        <Label key={n} x={b.x + b.w + 2} y={b.y + 1 + i} segs={[{ t: n, fg: C.dim }]} />
      ))}
    </>
  )
}

// ───────────────────────── wires + packets ─────────────────────────

export function Wiring({ s }: { s: SimState }) {
  const overlays: Overlay[] = s.packets
    .filter((p) => p.route.startsWith('return:'))
    .map((p) => ({ wire: p.route, from: 0, to: Math.round(p.t * (routeCells[p.route].length - 1)), fg: mix(C.bg, tone[p.tone], 0.6) }))
  return (
    <>
      <WireLayer wires={wires} overlays={overlays} width={STAGE.w} height={STAGE.h} />
      <Label x={12} y={STAGE.h - 1} segs={[{ t: copy.rail, fg: C.dim }]} />
    </>
  )
}

export function Packets({ s }: { s: SimState }) {
  return (
    <>
      {s.packets
        .filter((p) => !p.route.startsWith('next:'))
        .map((p) => {
          const cells = routeCells[p.route]
          if (!cells) return null
          return p.kind === 'chip' ? (
            <Rider key={p.id} cells={cells} t={p.t} glyph="■" fg={tone[p.tone]} trail={[]} label={p.label} />
          ) : (
            <Rider key={p.id} cells={cells} t={p.t} fg={p.pip ? C.fg : C.card} />
          )
        })}
    </>
  )
}
