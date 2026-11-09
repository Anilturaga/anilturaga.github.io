// Renderer-agnostic simulation of the merge pipeline.
//
// The sim knows the *topology* (stations and named routes between them) but
// nothing about pixels or terminal cells. Moving things are `Packet`s that
// carry a route name and a 0..1 progress; each renderer maps a route name to
// its own geometry (an SVG path in React Flow, a polyline of cells in the TUI).

import { copy } from './copy'

// ───────────────────────────── types ─────────────────────────────

export type Tone = 'neutral' | 'amber' | 'green' | 'red'

export type ReturnSource = 'integrator' | 'gate' | 'review'

/** Every route a packet can travel. Renderers must provide geometry for each. */
export type RouteId =
  | `build:${number}` // builder i → hand-off
  | 'handoff>integrator'
  | 'integrator>main'
  | 'main>review'
  | `return:${ReturnSource}:${number}` // source → bottom rail → builder i
  | 'next:push>after' // NEXT row: push step → after.sh line

export interface Change {
  id: number
  builder: number
  lane: 'normal' | 'fast'
  risky: boolean
  retry: number
  willConflict: boolean
  breaksMain: boolean
  needsFixes: boolean
}

export interface Packet {
  id: number
  route: RouteId
  /** 0..1 along the route (eased by the sim already) */
  t: number
  /** raw linear progress, for renderers that want their own easing */
  raw: number
  dur: number
  kind: 'card' | 'chip'
  tone: Tone
  /** small green "passed" pip on the card */
  pip?: boolean
  label?: string
  changeId?: number
  /** rotation hint in degrees for the tumbling card effect */
  spin: number
  onArrive: () => void
}

export type BuilderState = 'idle' | 'working' | 'ready'
export interface Builder {
  index: number
  state: BuilderState
  progress: number
  dur: number
  /** widths (0..1) of the "code lines" drawn on the builder's card */
  lines: number[]
  /** set while reworking something that came back */
  reason?: 'conflict' | 'fixes' | 'main-red'
  /** brief flash when something arrives (0..1, decays) */
  ping: number
  retry: number
}

export interface Slot {
  change: Change
  phase: 'entering' | 'proving' | 'passed'
  progress: number
  dur: number
  passedAt: number
}

export interface Integrator {
  change?: Change
  phase: 'idle' | 'entering' | 'clamp' | 'step' | 'release' | 'conflict'
  progress: number
  stepIndex: number
  /** caption under the box */
  title: string
  sub: string
  tone: Tone
}

export interface Commit {
  id: number
  changeId: number
  builder: number
  status: 'landed' | 'green' | 'red'
  breaksMain: boolean
  /** fresh commits pulse in */
  age: number
}

export interface Gate {
  phase: 'idle' | 'running' | 'pass' | 'fail'
  progress: number
  timer: number
  interval: number
}

export interface Review {
  change?: Change
  phase: 'idle' | 'reviewing' | 'done'
  progress: number
  dur: number
  queue: Change[]
  outcome?: 'ok' | 'fixes'
}

export type CheckState = 'idle' | 'running' | 'ok' | 'bad'
export interface NextRow {
  /** index of the pre-push step the block sits on, -1 when travelling to after.sh */
  step: number
  stepProgress: number
  /** after.sh commit line, newest first */
  commits: { id: number; culprit: boolean; age: number }[]
  checks: CheckState[]
  checkTimers: number[]
  running: boolean
  pending: boolean
}

export interface SimState {
  time: number
  builders: Builder[]
  handoff: (Slot | null)[]
  integrator: Integrator
  main: Commit[]
  mainStatus: 'green' | 'red'
  gate: Gate
  review: Review
  packets: Packet[]
  next: NextRow
  /** increments on every step; cheap change detection for renderers */
  frame: number
}

export interface SimOptions {
  seed?: number
  builders?: number
  slots?: number
  mainLength?: number
  afterLength?: number
  /** seconds of animation for one "hour" (one clock revolution) */
  loopSeconds?: number
}

// ───────────────────────────── helpers ─────────────────────────────

export const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
export const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ───────────────────────────── engine ─────────────────────────────

export class MergeSim {
  readonly state: SimState
  readonly opts: Required<SimOptions>
  private rand: () => number
  private ids = 1
  private listeners = new Set<() => void>()
  private changes = new Map<number, Change>()

  constructor(options: SimOptions = {}) {
    this.opts = {
      seed: 4017,
      builders: 4,
      slots: 3,
      mainLength: 7,
      afterLength: 10,
      loopSeconds: 18,
      ...options,
    }
    this.rand = mulberry32(this.opts.seed)
    const o = this.opts
    this.state = {
      time: 0,
      frame: 0,
      builders: Array.from({ length: o.builders }, (_, i) => ({
        index: i,
        state: 'idle' as BuilderState,
        progress: 0,
        dur: 1,
        lines: this.randomLines(),
        ping: 0,
        retry: 0,
      })),
      handoff: Array.from({ length: o.slots }, () => null),
      integrator: { phase: 'idle', progress: 0, stepIndex: 0, title: '', sub: '', tone: 'neutral' },
      main: [],
      mainStatus: 'red',
      gate: { phase: 'idle', progress: 0, timer: 1.5, interval: 5.5 },
      review: { phase: 'idle', progress: 0, dur: 2.4, queue: [] },
      packets: [],
      next: {
        step: 0,
        stepProgress: 0,
        commits: [],
        checks: copy.next.checks.map(() => 'idle' as CheckState),
        checkTimers: copy.next.checks.map(() => 0),
        running: false,
        pending: false,
      },
    }
    this.seed()
  }

  /** Pre-populate so the first frame already looks like a busy night. */
  private seed() {
    const s = this.state
    for (let i = 0; i < this.opts.mainLength; i++) {
      const red = i === 1
      s.main.push({
        id: this.ids++,
        changeId: -1,
        builder: i % this.opts.builders,
        status: red ? 'red' : 'landed',
        breaksMain: red,
        age: 99,
      })
    }
    for (let i = 0; i < this.opts.afterLength; i++) {
      s.next.commits.push({ id: this.ids++, culprit: i === 5, age: 99 })
    }
    // a couple of cards already in flight
    s.handoff[0] = this.makeSlot(this.newChange(1), 'proving', 0.55)
    s.handoff[1] = this.makeSlot(this.newChange(2), 'passed', 1)
    s.builders[1].state = 'working'
    s.builders[1].progress = 0.4
    s.builders[1].dur = 2.5
    s.builders[3].state = 'working'
    s.builders[3].progress = 0.1
    s.builders[3].dur = 3.2
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  get clockAngle() {
    return ((this.state.time / this.opts.loopSeconds) % 1) * 360
  }

  // ── public driver ──
  step(dt: number) {
    if (dt <= 0) return
    // integrate in small slices so slow frames don't skip state transitions
    let left = Math.min(dt, 0.25)
    while (left > 0) {
      const d = Math.min(left, 1 / 120)
      this.tick(d)
      left -= d
    }
    this.state.frame++
    for (const l of this.listeners) l()
  }

  // ── internals ──
  private randomLines() {
    const n = 1 + Math.floor(this.rand() * 3)
    return Array.from({ length: n }, () => 0.3 + this.rand() * 0.6)
  }

  private newChange(builder: number, retry = 0): Change {
    const r = this.rand
    const c: Change = {
      id: this.ids++,
      builder,
      lane: r() < 0.3 ? 'fast' : 'normal',
      risky: r() < 0.3,
      retry,
      willConflict: retry === 0 && r() < 0.14,
      breaksMain: retry === 0 && r() < 0.18,
      needsFixes: r() < 0.45,
    }
    this.changes.set(c.id, c)
    return c
  }

  private makeSlot(change: Change, phase: Slot['phase'], progress = 0): Slot {
    return { change, phase, progress, dur: 1.6 + this.rand() * 1.4, passedAt: phase === 'passed' ? -1 : 0 }
  }

  private emit(p: Omit<Packet, 'id' | 't' | 'raw' | 'spin'> & { spin?: number }) {
    this.state.packets.push({ ...p, id: this.ids++, t: 0, raw: 0, spin: p.spin ?? 0 })
  }

  private sendBack(source: ReturnSource, change: { builder: number; id?: number }, reason: Builder['reason']) {
    const tone: Tone = reason === 'fixes' ? 'amber' : 'red'
    const label =
      reason === 'fixes' ? copy.packets.fixes : reason === 'conflict' ? copy.packets.conflict : copy.packets.mainRed
    this.emit({
      route: `return:${source}:${change.builder}`,
      dur: 3.2,
      kind: 'chip',
      tone,
      label,
      changeId: change.id,
      onArrive: () => {
        const b = this.state.builders[change.builder]
        b.ping = 1
        b.reason = reason
        b.retry++
        if (b.state === 'idle') this.startWork(b, 1.4 + this.rand())
      },
    })
  }

  private startWork(b: Builder, dur: number) {
    b.state = 'working'
    b.progress = 0
    b.dur = dur
    b.lines = this.randomLines()
  }

  private tick(dt: number) {
    const s = this.state
    s.time += dt

    this.tickPackets(dt)
    this.tickBuilders(dt)
    this.tickHandoff(dt)
    this.tickIntegrator(dt)
    this.tickGate(dt)
    this.tickReview(dt)
    this.tickNext(dt)
    for (const c of s.main) c.age += dt
    for (const c of s.next.commits) c.age += dt
  }

  private tickPackets(dt: number) {
    const s = this.state
    const done: Packet[] = []
    for (const p of s.packets) {
      p.raw = clamp01(p.raw + dt / p.dur)
      p.t = easeInOut(p.raw)
      if (p.raw >= 1) done.push(p)
    }
    if (done.length) {
      s.packets = s.packets.filter((p) => p.raw < 1)
      for (const p of done) p.onArrive()
    }
  }

  private tickBuilders(dt: number) {
    const s = this.state
    for (const b of s.builders) {
      b.ping = Math.max(0, b.ping - dt * 1.5)
      if (b.state === 'idle') {
        if (this.rand() < dt * 0.1) this.startWork(b, 2 + this.rand() * 2.5)
        continue
      }
      if (b.state === 'working') {
        b.progress = clamp01(b.progress + dt / b.dur)
        // code lines grow while working
        if (this.rand() < dt * 2) b.lines = this.randomLines()
        if (b.progress >= 1) b.state = 'ready'
        continue
      }
      // ready: wait for a free hand-off slot, reserving it immediately
      const slotIndex = s.handoff.findIndex((x) => x === null)
      const inbound = s.packets.filter((p) => p.route.startsWith('build:')).length
      const free = s.handoff.filter((x) => x === null).length
      if (slotIndex >= 0 && free > inbound) {
        const change = this.newChange(b.index, b.retry)
        b.state = 'idle'
        b.reason = undefined
        b.retry = 0
        this.emit({
          route: `build:${b.index}`,
          dur: 1.1,
          kind: 'card',
          tone: 'neutral',
          changeId: change.id,
          spin: this.rand() < 0.5 ? -35 : 35,
          onArrive: () => {
            const i = s.handoff.findIndex((x) => x === null)
            if (i >= 0) s.handoff[i] = this.makeSlot(change, 'entering')
          },
        })
      }
    }
  }

  private tickHandoff(dt: number) {
    const s = this.state
    for (const slot of s.handoff) {
      if (!slot) continue
      if (slot.phase === 'entering') {
        slot.progress = clamp01(slot.progress + dt / 0.45)
        if (slot.progress >= 1) {
          slot.phase = 'proving'
          slot.progress = 0
        }
      } else if (slot.phase === 'proving') {
        slot.progress = clamp01(slot.progress + dt / slot.dur)
        if (slot.progress >= 1) {
          slot.phase = 'passed'
          slot.passedAt = s.time
        }
      }
    }
    // integrator takes one branch at a time, oldest pass first
    const integratorBusy =
      s.integrator.phase !== 'idle' || s.packets.some((p) => p.route === 'handoff>integrator')
    if (integratorBusy) return
    let pick = -1
    for (let i = 0; i < s.handoff.length; i++) {
      const sl = s.handoff[i]
      if (sl?.phase === 'passed' && (pick < 0 || sl.passedAt < s.handoff[pick]!.passedAt)) pick = i
    }
    if (pick < 0) return
    const slot = s.handoff[pick]!
    s.handoff[pick] = null
    this.emit({
      route: 'handoff>integrator',
      dur: 1.0,
      kind: 'card',
      tone: 'neutral',
      pip: true,
      changeId: slot.change.id,
      onArrive: () => {
        const g = s.integrator
        g.change = slot.change
        g.phase = 'entering'
        g.progress = 0
        g.stepIndex = 0
        const lane = copy.lanes[slot.change.lane]
        g.title = lane.title
        g.sub = ''
        g.tone = 'amber'
      },
    })
  }

  private tickIntegrator(dt: number) {
    const s = this.state
    const g = s.integrator
    if (g.phase === 'idle' || !g.change) return
    const lane = copy.lanes[g.change.lane]
    const durations = { entering: 0.35, clamp: 0.35, step: 0.75, release: 0.35, conflict: 0.9 }
    g.progress = clamp01(g.progress + dt / durations[g.phase as keyof typeof durations])
    if (g.progress < 1) return
    g.progress = 0
    switch (g.phase) {
      case 'entering':
        g.phase = 'clamp'
        break
      case 'clamp':
        g.phase = 'step'
        g.stepIndex = 0
        g.sub = lane.steps[0]
        break
      case 'step': {
        if (g.change.willConflict && g.stepIndex === 0) {
          g.phase = 'conflict'
          g.title = copy.lanes.conflict.title
          g.sub = copy.lanes.conflict.sub
          g.tone = 'red'
          break
        }
        if (g.stepIndex + 1 < lane.steps.length) {
          g.stepIndex++
          g.sub = lane.steps[g.stepIndex]
        } else {
          g.phase = 'release'
        }
        break
      }
      case 'conflict': {
        const change = g.change
        this.sendBack('integrator', change, 'conflict')
        this.resetIntegrator()
        break
      }
      case 'release': {
        const change = g.change
        this.resetIntegrator()
        this.emit({
          route: 'integrator>main',
          dur: 0.7,
          kind: 'card',
          tone: 'neutral',
          changeId: change.id,
          onArrive: () => this.land(change),
        })
        break
      }
    }
  }

  private resetIntegrator() {
    const g = this.state.integrator
    g.change = undefined
    g.phase = 'idle'
    g.progress = 0
    g.title = ''
    g.sub = ''
    g.tone = 'neutral'
  }

  private land(change: Change) {
    const s = this.state
    s.main.unshift({
      id: this.ids++,
      changeId: change.id,
      builder: change.builder,
      status: 'landed',
      breaksMain: change.breaksMain,
      age: 0,
    })
    if (s.main.length > this.opts.mainLength) s.main.length = this.opts.mainLength
    if (change.risky || change.retry > 0) {
      s.review.queue.push(change)
    }
  }

  private tickGate(dt: number) {
    const s = this.state
    const gate = s.gate
    if (gate.phase === 'idle') {
      gate.timer -= dt
      if (gate.timer <= 0) {
        gate.phase = 'running'
        gate.progress = 0
      }
      return
    }
    if (gate.phase === 'running') {
      gate.progress = clamp01(gate.progress + dt / 2.6)
      if (gate.progress < 1) return
      const culprit = s.main.find((c) => c.status === 'landed' && c.breaksMain)
      if (culprit) {
        gate.phase = 'fail'
        culprit.status = 'red'
        s.mainStatus = 'red'
        this.sendBack('gate', { builder: culprit.builder, id: culprit.changeId }, 'main-red')
      } else {
        gate.phase = 'pass'
        for (const c of s.main) if (c.status === 'landed') c.status = 'green'
        s.mainStatus = 'green'
      }
      gate.progress = 0
      return
    }
    // pass / fail result is shown briefly
    gate.progress = clamp01(gate.progress + dt / 0.9)
    if (gate.progress >= 1) {
      gate.phase = 'idle'
      gate.progress = 0
      gate.timer = gate.interval
    }
  }

  private tickReview(dt: number) {
    const s = this.state
    const r = s.review
    if (r.phase === 'idle') {
      const busy = s.packets.some((p) => p.route === 'main>review')
      if (!busy && r.queue.length) {
        const change = r.queue.shift()!
        this.emit({
          route: 'main>review',
          dur: 0.9,
          kind: 'card',
          tone: 'neutral',
          changeId: change.id,
          onArrive: () => {
            r.change = change
            r.phase = 'reviewing'
            r.progress = 0
            r.dur = 2 + this.rand() * 1.2
          },
        })
      }
      return
    }
    if (r.phase === 'reviewing') {
      r.progress = clamp01(r.progress + dt / r.dur)
      if (r.progress >= 1) {
        r.phase = 'done'
        r.progress = 0
        r.outcome = r.change!.needsFixes ? 'fixes' : 'ok'
        if (r.outcome === 'fixes') this.sendBack('review', r.change!, 'fixes')
      }
      return
    }
    r.progress = clamp01(r.progress + dt / 0.6)
    if (r.progress >= 1) {
      r.phase = 'idle'
      r.change = undefined
      r.outcome = undefined
      r.progress = 0
    }
  }

  private tickNext(dt: number) {
    const s = this.state
    const n = s.next
    const steps = copy.next.steps.length
    if (n.step >= 0) {
      n.stepProgress = clamp01(n.stepProgress + dt / 0.55)
      if (n.stepProgress >= 1) {
        n.stepProgress = 0
        if (n.step + 1 < steps) n.step++
        else {
          n.step = -1
          this.emit({
            route: 'next:push>after',
            dur: 0.6,
            kind: 'card',
            tone: 'neutral',
            onArrive: () => {
              n.commits.unshift({ id: this.ids++, culprit: false, age: 0 })
              if (n.commits.length > this.opts.afterLength) n.commits.length = this.opts.afterLength
              this.startChecks()
              n.step = 0
              n.stepProgress = 0
            },
          })
        }
      }
    }
    if (n.running) {
      let allDone = true
      n.checkTimers = n.checkTimers.map((t, i) => {
        if (n.checks[i] !== 'running') return t
        const left = t - dt
        if (left <= 0) {
          // tests fail occasionally, the rest rarely
          const p = copy.next.checks[i] === 'tests' ? 0.16 : 0.03
          n.checks[i] = this.rand() < p ? 'bad' : 'ok'
        } else allDone = false
        return left
      })
      if (allDone) {
        n.running = false
        if (n.checks.includes('bad') && n.commits[0]) n.commits[0].culprit = true
      }
    } else if (n.checks.some((c) => c !== 'idle')) {
      // fade results back to idle after a moment
      n.checkTimers = n.checkTimers.map((t) => t - dt)
      if (n.checkTimers.every((t) => t < -1.2)) n.checks = n.checks.map(() => 'idle')
    }
  }

  private startChecks() {
    const n = this.state.next
    n.running = true
    n.checks = n.checks.map(() => 'running')
    n.checkTimers = n.checkTimers.map(() => 0.6 + this.rand() * 1.8)
  }
}
