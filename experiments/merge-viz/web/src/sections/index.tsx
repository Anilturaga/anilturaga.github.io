import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { X } from 'lucide-react'
import { copy, type CheckState } from '@core'
import { useSim, useSimInstance } from '@/sim'
import { cn } from '@/lib/utils'

const spring = { type: 'spring', stiffness: 380, damping: 32 } as const

// ───────────────────────── shared bits ─────────────────────────

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="text-[12px] tracking-[0.06em] text-muted uppercase">{children}</div>
}

/** Dashed connector with a CSS arrowhead. */
function Arrow({ width = 14 }: { width?: number }) {
  return (
    <span className="relative inline-flex shrink-0 items-center" style={{ width: width + 5 }}>
      <span className="h-0 grow border-t border-dashed border-faint" />
      <span className="size-0 border-y-[3px] border-l-[5px] border-y-transparent border-l-faint" />
    </span>
  )
}

function Chip({ children, active, className }: { children: React.ReactNode; active?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'dashed-chip relative inline-flex h-[20px] shrink-0 items-center px-[7px] text-[11px] whitespace-nowrap transition-colors duration-200',
        active ? 'border-muted text-fg' : 'text-dim',
        className,
      )}
    >
      {children}
    </span>
  )
}

// ───────────────────────── header ─────────────────────────

export function Header() {
  const sim = useSimInstance()
  useSim()
  return (
    <header className="flex items-start justify-between pb-1">
      <div className="text-[12px] tracking-[0.06em]">
        <span className="text-green">{copy.header.live}</span>
        <span className="text-dim"> · {copy.header.subtitle}</span>
      </div>
      <div className="flex items-center gap-2 pt-3 text-[12px] text-dim">
        {copy.header.clock}
        <span className="relative inline-block size-[18px] rounded-full border-[1.5px] border-muted" aria-hidden>
          <span
            className="absolute top-1/2 left-1/2 h-[1.5px] w-[6.5px] origin-left rounded bg-fg"
            style={{ transform: `translateY(-50%) rotate(${sim.clockAngle - 90}deg)` }}
          />
          <span className="absolute top-1/2 left-1/2 size-[3px] -translate-1/2 rounded-full bg-fg" />
        </span>
      </div>
    </header>
  )
}

// ───────────────────────── NEXT · b4017 ─────────────────────────

const checkStyle: Record<CheckState, string> = {
  idle: 'text-dim',
  running: 'text-muted bg-[length:200%_100%] bg-[linear-gradient(90deg,transparent,rgba(127,211,148,.16),transparent)] [animation:shimmer_1.1s_linear_infinite]',
  ok: 'text-green/80 bg-green/10 border-green/30',
  bad: 'text-red bg-red/15 border-red/40',
}

const AFTER_GAP = 58

export function NextLane() {
  const { next } = useSim()
  const cycle = next.commits[0]?.id ?? 0
  const travelling = next.step === -1
  return (
    <section className="border-t border-line pt-3 pb-4">
      <Eyebrow>
        {copy.next.eyebrow} <span className="text-dim">· {copy.next.id}</span>
      </Eyebrow>
      <LayoutGroup>
        <div className="mt-4 flex items-start">
          {/* before push */}
          <div className="flex w-[640px] shrink-0 flex-col items-center">
            <div className="flex items-center pl-[150px]">
              <span className="w-[40px] border-t border-dashed border-faint" />
              {copy.next.steps.map((s, i) => (
                <span key={s} className="flex items-center">
                  {i > 0 && <Arrow width={8} />}
                  <span className="relative">
                    <Chip active={next.step === i}>{s}</Chip>
                    {next.step === i && (
                      <motion.span
                        layoutId={`next-block-${cycle}`}
                        className="absolute -top-[12px] left-1/2 h-[8px] w-[14px] -translate-x-1/2 rounded-[2px] bg-muted"
                        transition={spring}
                      />
                    )}
                  </span>
                </span>
              ))}
              <span className="w-[80px] border-t border-dashed border-faint" />
            </div>
            <div className="mt-2 pl-[100px] text-center text-[12.5px] leading-[19px]">
              <div className="text-fg/85">{copy.next.beforeTitle}</div>
              {copy.next.beforeNotes.map((n) => (
                <div key={n} className="text-dim">
                  {n}
                </div>
              ))}
            </div>
          </div>

          {/* after.sh line */}
          <div className="relative min-w-0 grow">
            <div className="relative h-[20px]" style={{ width: AFTER_GAP * 9 + 30 }}>
              <div className="absolute top-[9.5px] right-[6px] left-0 h-[1.5px] bg-wire" />
              {travelling && (
                <motion.span
                  layoutId={`next-block-${cycle}`}
                  className="absolute top-[6px] left-[-7px] h-[8px] w-[14px] rounded-[2px] bg-muted"
                  transition={spring}
                />
              )}
              <AnimatePresence initial={false}>
                {next.commits.map((c, i) => (
                  <motion.div
                    key={c.id}
                    className="absolute top-[10px] left-0 flex size-0 items-center justify-center"
                    initial={{ x: 0, scale: 0 }}
                    animate={{ x: i * AFTER_GAP, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={spring}
                  >
                    <span
                      className="absolute size-[11px] rounded-full transition-colors duration-300"
                      style={{ background: c.culprit ? 'var(--color-red)' : '#b9b9be' }}
                    />
                    {i === 0 && (
                      <span className="absolute size-[30px] rounded-full border border-line-strong" />
                    )}
                    <AnimatePresence>
                      {c.culprit && (
                        <motion.span
                          className="absolute -top-[19px] text-[9.5px] text-red"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          {copy.next.culprit}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="absolute top-0 right-0 h-[20px] w-[7px] rounded-[3px] border border-line-strong bg-surface" />
            </div>
            <div className="relative mt-[2px] pl-[36px]">
              {/* L connector from the newest commit down to the checks */}
              <span className="absolute top-0 left-0 h-[38px] w-[30px] rounded-bl-[6px] border-b border-l border-dashed border-faint" />
              <div className="text-[12.5px] leading-[19px]">
                <span className="font-medium text-fg">{copy.next.afterTitle}</span>
                <span className="text-muted"> · {copy.next.afterSub}</span>
              </div>
              <div className="mt-[3px] flex gap-[6px]">
                {copy.next.checks.map((c, i) => (
                  <Chip key={c} className={checkStyle[next.checks[i]]}>
                    {c}
                  </Chip>
                ))}
              </div>
              <div className="mt-[3px] text-[12.5px] leading-[19px] text-dim">{copy.next.afterNote}</div>
            </div>
          </div>
        </div>
      </LayoutGroup>
    </section>
  )
}

// ───────────────────────── COMING ─────────────────────────

export function Coming() {
  return (
    <section className="border-t border-line pt-3 pb-3">
      <Eyebrow>
        {copy.coming.eyebrow} <span className="text-dim">· {copy.coming.sub}</span>
      </Eyebrow>
      <div className="mt-3 flex flex-col gap-[14px]">
        {copy.coming.items.map((item) => (
          <div key={item.id} className="flex items-start gap-3">
            <div className="w-[290px] shrink-0 text-[12.5px] leading-[19px]">
              <div>
                <span className="text-muted">{item.id}</span> <span className="text-dim">{item.title}</span>
              </div>
              {'note' in item && <div className="text-faint">{item.note}</div>}
            </div>
            <div className="flex items-center pt-[1px] opacity-80">
              {item.steps.map((s, i) => (
                <span key={s} className="flex items-center">
                  {i > 0 && <Arrow />}
                  <span className="relative">
                    {'stackedFirst' in item && i === 0 && (
                      <>
                        <span className="dashed-chip absolute -top-[6px] left-[6px] h-[20px] w-[calc(100%-6px)] opacity-60" />
                        <span className="dashed-chip absolute -top-[3px] left-[3px] h-[20px] w-[calc(100%-3px)] opacity-80" />
                      </>
                    )}
                    <Chip className="bg-bg">{s}</Chip>
                  </span>
                </span>
              ))}
              {'tail' in item && item.tail && (
                <span className="ml-7 flex items-center gap-[3px] text-[11px] text-dim">
                  {Array.from({ length: item.tail.crosses }, (_, k) => (
                    <span key={k} className="dashed-chip flex size-[16px] items-center justify-center rounded-[3px]">
                      <X size={12} strokeWidth={1.5} />
                    </span>
                  ))}
                  <span className="ml-2">{item.tail.label}</span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
