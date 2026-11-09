import { Handle, Position, type NodeProps } from '@xyflow/react'
import { AnimatePresence, motion } from 'motion/react'
import { Bot, Check, X } from 'lucide-react'
import { copy, type Slot } from '@core'
import { useSim } from '@/sim'
import { cn } from '@/lib/utils'
import type { TextData } from '../layout'
import { Card, Port, Ring, Shell, TopPort } from './parts'

const spring = { type: 'spring', stiffness: 420, damping: 32 } as const

// ───────────────────────── builder ─────────────────────────

export function BuilderNode({ data }: NodeProps) {
  const { builders } = useSim()
  const b = builders[(data as { index: number }).index]
  const busy = b.state !== 'idle'
  const ready = b.state === 'ready'
  // working glows bright; a finished card waiting for a free slot cools to brown
  const heat = ready ? 0.32 : busy ? 0.55 + 0.45 * b.progress : 0
  return (
    <div className="relative flex h-[28px] items-center gap-[9px]">
      <Handle type="target" position={Position.Left} id="in" />
      <div className="relative text-muted">
        {/* antenna light */}
        <span
          className="absolute -top-[3px] left-1/2 size-[5px] -translate-x-1/2 rounded-full transition-all duration-300"
          style={{
            background: busy || b.ping > 0 ? 'var(--color-amber)' : 'transparent',
            boxShadow: b.state === 'working' ? '0 0 8px 2px color-mix(in oklab, var(--color-amber) 60%, transparent)' : 'none',
          }}
        />
        <Bot size={17} strokeWidth={1.6} />
      </div>
      <div
        className="relative flex h-[23px] w-[36px] flex-col justify-center gap-[3px] rounded-[4px] border-[1.5px] px-[6px] transition-colors duration-300"
        style={{
          borderColor: heat > 0 ? 'color-mix(in oklab, var(--color-amber) 70%, transparent)' : 'var(--color-faint)',
          background: `color-mix(in oklab, var(--color-amber) ${Math.round(heat * 78)}%, transparent)`,
          boxShadow: heat > 0.5 ? `0 0 ${10 + heat * 10}px color-mix(in oklab, var(--color-amber) 35%, transparent)` : 'none',
        }}
      >
        {b.lines.map((w, i) => (
          <motion.span
            key={i}
            className="block h-[1.5px] rounded-full"
            style={{ background: heat > 0.3 ? 'rgba(12,12,13,.55)' : 'var(--color-muted)' }}
            animate={{ width: `${w * 100}%` }}
            transition={{ duration: 0.35 }}
          />
        ))}
      </div>
      <AnimatePresence>
        {b.ping > 0.05 && b.reason && (
          <motion.span
            className="absolute -top-[13px] left-[-6px] text-[9px] font-medium"
            style={{ color: b.reason === 'fixes' ? 'var(--color-amber)' : 'var(--color-red)' }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {b.reason}
          </motion.span>
        )}
      </AnimatePresence>
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  )
}

// ───────────────────────── hand-off ─────────────────────────

function SlotView({ slot }: { slot: Slot | null }) {
  return (
    <div className="relative flex size-[36px] items-center justify-center rounded-full border-[1.5px] border-line-strong">
      <AnimatePresence mode="popLayout">
        {slot && (
          <motion.div
            key={slot.change.id}
            className="flex items-center justify-center"
            initial={{ x: -46, y: -6, rotate: -50, opacity: 0 }}
            animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
            exit={{ x: 36, opacity: 0, transition: { duration: 0.18 } }}
            transition={spring}
          >
            <Card tone={slot.phase === 'passed' ? 'neutral' : 'neutral'} pip={slot.phase === 'passed'} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {slot && slot.phase !== 'entering' && (
          <Ring
            key={`${slot.change.id}-${slot.phase}`}
            progress={slot.phase === 'passed' ? 1 : slot.progress}
            tone={slot.phase === 'passed' ? 'green' : 'amber'}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export function HandoffNode() {
  const { handoff, packets } = useSim()
  const inbound = packets.some((p) => p.route.startsWith('build:') && p.raw > 0.75)
  const outbound = packets.some((p) => p.route === 'handoff>integrator' && p.raw < 0.3)
  return (
    <Shell className="flex h-[190px] w-[96px] flex-col items-center justify-center gap-[11px] rounded-[16px]">
      <Handle type="target" position={Position.Left} id="in" />
      <Port side="left" lit={inbound} />
      {handoff.map((s, i) => (
        <SlotView key={i} slot={s} />
      ))}
      <Port side="right" lit={outbound} tone="green" />
      <Handle type="source" position={Position.Right} id="out" />
    </Shell>
  )
}

// ───────────────────────── integrator ─────────────────────────

function Plate({ side, clamped }: { side: 'top' | 'bottom'; clamped: boolean }) {
  const top = side === 'top'
  return (
    <motion.div
      className={cn('absolute left-1/2 flex -translate-x-1/2 flex-col items-center', top ? 'top-[6px]' : 'bottom-[6px] flex-col-reverse')}
      animate={{ y: clamped ? (top ? 15 : -15) : 0 }}
      transition={spring}
    >
      <div className="h-[6px] w-[50px] rounded-[2px] bg-[#3a3a40]">
        <div className="mx-auto mt-[1.5px] h-[3px] w-[34px] rounded-[1px] bg-[#55555c]" />
      </div>
      <motion.div
        className="w-[3px] bg-[#3a3a40]"
        animate={{ height: clamped ? 6 : 0 }}
        transition={spring}
      />
    </motion.div>
  )
}

export function IntegratorNode() {
  const { integrator: g } = useSim()
  const active = g.phase !== 'idle'
  const clamped = g.phase === 'clamp' || g.phase === 'step' || g.phase === 'conflict'
  const running = g.phase === 'step'
  const fast = g.change?.lane === 'fast'
  return (
    <div className="relative">
      <Shell className="h-[97px] w-[145px] overflow-visible rounded-[11px]">
        <Handle type="target" position={Position.Left} id="in" />
        <Handle type="source" position={Position.Right} id="out" />
        <Handle type="source" position={Position.Bottom} id="back" style={{ left: 12 }} />
        <Port side="left" lit={active} tone={g.tone === 'red' ? 'red' : 'amber'} />
        <Port side="right" lit={g.phase === 'release'} tone="green" />
        <Plate side="top" clamped={clamped} />
        <Plate side="bottom" clamped={clamped} />
        <div className="absolute inset-0 flex items-center justify-center gap-[7px]">
          {/* vibration ticks while a step runs */}
          {[0, 1].map((k) => (
            <motion.div
              key={k}
              className={cn('flex flex-col gap-[2px]', k === 1 && 'order-last')}
              animate={{ opacity: running ? [0.2, 0.9, 0.2] : 0 }}
              transition={{ duration: 0.4, repeat: running ? Infinity : 0 }}
            >
              {[0, 1, 2].map((r) => (
                <span key={r} className="block h-[1.5px] w-[6px] rounded bg-muted" />
              ))}
            </motion.div>
          ))}
          <AnimatePresence mode="popLayout">
            {g.change && (
              <motion.div
                key={g.change.id}
                initial={{ x: -50, opacity: 0 }}
                animate={{ x: 0, opacity: 1, scale: g.phase === 'conflict' ? [1, 1.15, 1] : 1 }}
                exit={{ x: 50, opacity: 0, transition: { duration: 0.2 } }}
                transition={spring}
              >
                <Card
                  tone={g.tone === 'red' ? 'red' : 'neutral'}
                  outline={clamped && g.tone !== 'red' ? 'amber' : undefined}
                  className="h-[9px] w-[22px]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Shell>
      <div className="absolute top-[103px] left-1/2 w-[220px] -translate-x-1/2 text-center text-[11.5px] leading-[15px]">
        <AnimatePresence mode="wait">
          {g.title && (
            <motion.div key={g.title} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ color: g.tone === 'red' ? 'var(--color-red)' : fast ? 'var(--color-amber)' : 'var(--color-muted)' }}>
                {g.title}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {g.sub && (
            <motion.div
              key={g.sub}
              className="text-dim"
              initial={{ opacity: 0, filter: 'blur(3px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(3px)' }}
              transition={{ duration: 0.18 }}
            >
              {g.sub}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ───────────────────────── main line ─────────────────────────

const DOT0 = 50
const DOT_GAP = 48

export function MainNode() {
  const { main, mainStatus, review, gate } = useSim()
  const red = mainStatus === 'red'
  const reviewing = new Set([review.change?.id, ...review.queue.map((c) => c.id)])
  return (
    <div className="relative h-[70px] w-[380px]">
      <Handle type="target" position={Position.Left} id="in" style={{ left: DOT0, top: 46 }} />
      <Handle type="source" position={Position.Bottom} id="down" style={{ left: DOT0, top: 46 }} />
      <div className="absolute top-[6px] left-[8px] text-[12.5px]">
        <span className="font-medium text-fg">{copy.main.title}</span>
        <span className="text-dim"> · </span>
        <AnimatePresence mode="wait">
          <motion.span
            key={mainStatus}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ color: red ? 'var(--color-red)' : 'var(--color-green)' }}
          >
            {red ? copy.main.red : copy.main.green}
          </motion.span>
        </AnimatePresence>
      </div>
      <div
        className="absolute top-[45.25px] right-[12px] left-0 h-[1.5px] transition-colors duration-700"
        style={{ background: red ? '#5b2a28' : '#27482f' }}
      />
      <AnimatePresence>
        {main.map((c, i) => {
          const ringed = reviewing.has(c.changeId) || (gate.phase === 'running' && i === 0)
          const color = c.status === 'red' ? 'var(--color-red)' : c.status === 'green' ? 'var(--color-green)' : 'var(--color-card)'
          return (
            <motion.div
              key={c.id}
              className="absolute top-[46px] left-0 flex size-0 items-center justify-center"
              initial={{ x: DOT0, scale: 0, opacity: 0 }}
              animate={{ x: DOT0 + i * DOT_GAP, scale: 1, opacity: 1 }}
              exit={{ x: DOT0 + (i + 1) * DOT_GAP, opacity: 0, scale: 0.6 }}
              transition={spring}
            >
              <span
                className="absolute size-[12px] rounded-full transition-colors duration-500"
                style={{ background: color }}
              />
              <AnimatePresence>
                {ringed && (
                  <motion.span
                    className="absolute size-[22px] rounded-full border-[1.5px]"
                    style={{ borderColor: reviewing.has(c.changeId) ? 'var(--color-amber)' : 'var(--color-muted)' }}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 1.3, opacity: 0 }}
                  />
                )}
              </AnimatePresence>
              {c.age < 1.2 && (
                <motion.span
                  className="absolute size-[12px] rounded-full border border-card"
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 3, opacity: 0 }}
                  transition={{ duration: 1 }}
                />
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
      {/* end cap */}
      <div className="absolute top-[35px] right-[4px] h-[22px] w-[7px] rounded-[3px] border border-line-strong bg-surface">
        <div className="absolute inset-x-[1.5px] inset-y-[4px] rounded-[2px] bg-faint" />
      </div>
    </div>
  )
}

// ───────────────────────── full gate ─────────────────────────

const TRACK = { from: 26, to: 162 }

export function GateNode() {
  const { gate } = useSim()
  const running = gate.phase === 'running'
  const done = gate.phase === 'pass' || gate.phase === 'fail'
  const x = TRACK.from + (TRACK.to - TRACK.from) * (running ? gate.progress : done ? 1 : 0)
  const tone = gate.phase === 'pass' ? 'var(--color-green)' : gate.phase === 'fail' ? 'var(--color-red)' : 'var(--color-muted)'
  const fade = done ? 1 - Math.max(0, gate.progress - 0.6) / 0.4 : 1
  return (
    <div className="relative">
      <Shell className="h-[62px] w-[190px] rounded-[10px]">
        <Handle type="target" position={Position.Left} id="in" />
        <Handle type="source" position={Position.Right} id="back" />
        <Port side="left" lit={running} tone="neutral" />
        <Port side="right" lit={gate.phase === 'fail'} tone="red" />
        {(running || done) && (
          <div style={{ opacity: fade }}>
            <div
              className="absolute top-[30px] h-[1.5px] rounded-full"
              style={{ left: TRACK.from, width: x - TRACK.from, background: tone }}
            />
            <div
              className="absolute top-[31px] flex -translate-1/2 items-center justify-center rounded-full"
              style={{
                left: x,
                width: done ? 15 : 8,
                height: done ? 15 : 8,
                background: done ? 'var(--color-bg)' : 'var(--color-card)',
                border: done ? `1.5px solid ${tone}` : 'none',
                transition: 'width .2s, height .2s',
              }}
            >
              {gate.phase === 'pass' && <span className="size-[6px] rounded-full bg-green" />}
              {gate.phase === 'fail' && <X size={9} strokeWidth={3} color="var(--color-red)" />}
            </div>
          </div>
        )}
      </Shell>
      <AnimatePresence>
        {gate.phase === 'pass' && (
          <motion.div
            className="absolute top-[22px] -right-[24px] flex size-[16px] items-center justify-center rounded-full bg-green text-bg"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
          >
            <Check size={11} strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ───────────────────────── Opus review ─────────────────────────

export function ReviewNode() {
  const { review: r } = useSim()
  const reviewing = r.phase === 'reviewing'
  return (
    <Shell className="h-[73px] w-[155px] rounded-[10px]">
      <Handle type="target" position={Position.Top} id="in" style={{ left: 50 }} />
      <Handle type="source" position={Position.Left} id="back" />
      <TopPort left={50} />
      <Port side="left" lit={r.outcome === 'fixes'} tone="amber" />
      <div className="absolute top-1/2 left-[50px] flex size-[36px] -translate-1/2 items-center justify-center rounded-full border-[1.5px] border-line-strong">
        <AnimatePresence>
          {r.change && (
            <motion.div
              key={r.change.id}
              initial={{ y: -30, opacity: 0, rotate: 90 }}
              animate={{ y: 0, opacity: r.phase === 'done' ? 1 - r.progress : 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={spring}
            >
              <Card vertical tone={r.outcome === 'fixes' ? 'amber' : 'neutral'} />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {reviewing && <Ring key="spin" progress={0.25 + 0.6 * r.progress} tone="amber" spin />}
          {r.phase === 'done' && (
            <Ring key="done" progress={1} tone={r.outcome === 'fixes' ? 'amber' : 'green'} />
          )}
        </AnimatePresence>
      </div>
    </Shell>
  )
}

// ───────────────────────── text + frame ─────────────────────────

const toneClass = { fg: 'text-fg font-medium', muted: 'text-muted', dim: 'text-dim', amber: 'text-amber' }

export function TextNode({ data }: NodeProps) {
  const d = data as TextData
  return (
    <div
      className="pointer-events-none text-[12.5px] leading-[19px] whitespace-pre"
      style={{ width: d.width, textAlign: d.align ?? 'left' }}
    >
      {d.lines.map((line, i) => (
        <div key={i}>
          {line.map((s, j) => (
            <span key={j} className={toneClass[s.tone ?? 'muted']}>
              {s.t}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

export function FrameNode() {
  return <div className="pointer-events-none h-[490px] w-[1235px]" />
}

export const nodeTypes = {
  builder: BuilderNode,
  handoff: HandoffNode,
  integrator: IntegratorNode,
  main: MainNode,
  gate: GateNode,
  review: ReviewNode,
  text: TextNode,
  frame: FrameNode,
}
