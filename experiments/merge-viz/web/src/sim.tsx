import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { MergeSim } from '@core'

const SimContext = createContext<MergeSim | null>(null)

export function SimProvider({ children, paused, speed }: { children: React.ReactNode; paused: boolean; speed: number }) {
  const [sim] = useState(() => new MergeSim())
  const pausedRef = useRef(paused)
  const speedRef = useRef(speed)
  pausedRef.current = paused
  speedRef.current = speed

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      if (!pausedRef.current) sim.step(dt * speedRef.current * (reduce ? 0.5 : 1))
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [sim])

  return <SimContext.Provider value={sim}>{children}</SimContext.Provider>
}

export function useSimInstance() {
  const sim = useContext(SimContext)
  if (!sim) throw new Error('useSim must be used inside <SimProvider>')
  return sim
}

/** Re-render on every sim frame and return the live state. */
export function useSim() {
  const sim = useSimInstance()
  useSyncExternalStore(
    (cb) => sim.subscribe(cb),
    () => sim.state.frame,
  )
  return sim.state
}
