import { useEffect, useReducer, useRef, useState } from 'react'
import { MergeSim } from '@core'
import { C } from './kit'
import { STAGE } from './layout'
import { Coming, Footer, Header, NextLane, Rule } from './sections'
import { Builders, Gate, Handoff, Integrator, MainLine, Packets, Review, Wiring } from './stations'

export const MIN = { w: STAGE.w + 2, h: 44 }

/** Drive the shared sim at ~30fps and re-render on every step. */
export function useSimLoop(sim: MergeSim, paused: boolean, speed: number, fps = 30) {
  const [, bump] = useReducer((x: number) => x + 1, 0)
  const cfg = useRef({ paused, speed })
  cfg.current = { paused, speed }
  useEffect(() => {
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const dt = (now - last) / 1000
      last = now
      if (!cfg.current.paused) sim.step(dt * cfg.current.speed)
      bump()
    }, 1000 / fps)
    return () => clearInterval(id)
  }, [sim, fps])
}

export function Stage({ sim }: { sim: MergeSim }) {
  const s = sim.state
  return (
    <box position="relative" width={STAGE.w} height={STAGE.h} marginLeft={1} flexShrink={0}>
      <Wiring s={s} />
      <Builders s={s} />
      <Handoff s={s} />
      <Integrator s={s} />
      <MainLine s={s} />
      <Gate s={s} />
      <Review s={s} />
      <Packets s={s} />
    </box>
  )
}

export function App({
  sim,
  paused,
  speed,
  size,
}: {
  sim: MergeSim
  paused: boolean
  speed: number
  size: { width: number; height: number }
}) {
  if (size.width < MIN.w || size.height < MIN.h) {
    return (
      <box padding={1} backgroundColor={C.bg} width="100%" height="100%">
        <text fg={C.muted}>
          Make the terminal at least {MIN.w}×{MIN.h} (now {size.width}×{size.height}).
        </text>
      </box>
    )
  }
  return (
    <box flexDirection="column" backgroundColor={C.bg} width="100%" height="100%" paddingTop={1}>
      <Header sim={sim} />
      <Stage sim={sim} />
      <Rule />
      <NextLane s={sim.state} />
      <Rule />
      <Coming />
      <Footer paused={paused} speed={speed} />
    </box>
  )
}

/** Self-contained root: owns the sim and the loop; keys are wired by the caller. */
export function Root({
  size,
  controls,
}: {
  size: { width: number; height: number }
  controls: { paused: boolean; speed: number }
}) {
  const [sim] = useState(() => new MergeSim())
  useSimLoop(sim, controls.paused, controls.speed)
  return <App sim={sim} paused={controls.paused} speed={controls.speed} size={size} />
}
