import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import type { Tone } from '@core'

// Small building blocks shared by the station nodes.

export const toneColor: Record<Tone, string> = {
  neutral: 'var(--color-card)',
  amber: 'var(--color-amber)',
  green: 'var(--color-green)',
  red: 'var(--color-red)',
}

/** Vertical connector port on a station's left/right wall. */
export function Port({ side, lit, tone = 'amber' }: { side: 'left' | 'right'; lit?: boolean; tone?: Tone }) {
  return (
    <div
      className={cn(
        'absolute top-1/2 h-[34px] w-[7px] -translate-y-1/2 rounded-[3px] border border-line-strong bg-surface',
        side === 'left' ? '-left-[4px]' : '-right-[4px]',
      )}
    >
      <div
        className="absolute inset-x-[1.5px] inset-y-[6px] rounded-[2px] transition-colors duration-300"
        style={{ background: lit ? toneColor[tone] : 'var(--color-faint)' }}
      />
    </div>
  )
}

/** Horizontal port on a station's top wall. */
export function TopPort({ left }: { left: number }) {
  return (
    <div
      className="absolute -top-[4px] h-[7px] w-[30px] -translate-x-1/2 rounded-[3px] border border-line-strong bg-surface"
      style={{ left }}
    >
      <div className="absolute inset-x-[6px] inset-y-[1.5px] rounded-[2px] bg-faint" />
    </div>
  )
}

/** A change, drawn as a small card. */
export function Card({
  tone = 'neutral',
  outline,
  pip,
  vertical,
  className,
}: {
  tone?: Tone
  outline?: Tone
  pip?: boolean
  vertical?: boolean
  className?: string
}) {
  return (
    <div
      className={cn('relative rounded-[3px]', vertical ? 'h-[15px] w-[11px]' : 'h-[11px] w-[17px]', className)}
      style={{
        background: toneColor[tone],
        boxShadow: outline ? `0 0 0 2px var(--color-bg), 0 0 0 3.5px ${toneColor[outline]}` : undefined,
      }}
    >
      {pip && <span className="absolute -top-[3px] -right-[3px] size-[6px] rounded-full bg-green" />}
    </div>
  )
}

/** Progress ring drawn with a conic gradient (no SVG). */
export function Ring({
  progress,
  tone,
  size = 34,
  spin,
}: {
  progress: number
  tone: Tone
  size?: number
  spin?: boolean
}) {
  return (
    <motion.div
      className="ring pointer-events-none absolute"
      style={
        {
          width: size,
          height: size,
          '--p': progress,
          '--ring-color': toneColor[tone],
          animation: spin ? 'spin 1.1s linear infinite' : undefined,
        } as React.CSSProperties
      }
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.15 }}
      transition={{ duration: 0.25 }}
    />
  )
}

/** Station shell: rounded rectangle with the house border. */
export function Shell({
  className,
  children,
  style,
}: {
  className?: string
  children?: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <div className={cn('relative rounded-[12px] border-[1.5px] border-line-strong bg-bg', className)} style={style}>
      {children}
    </div>
  )
}
