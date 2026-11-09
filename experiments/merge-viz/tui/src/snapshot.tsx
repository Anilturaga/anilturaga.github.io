// Dev tool: render the TUI headlessly at given sim times and write an HTML
// file per frame (colored cells) so frames can be inspected or screenshotted.
//   bun run src/snapshot.tsx <outDir> 2 4.5 8 ...
import { testRender } from '@opentui/react/test-utils'
import { useSyncExternalStore } from 'react'
import { mkdirSync, writeFileSync } from 'node:fs'
import { MergeSim } from '@core'
import { App, MIN } from './app'

const [outDir = 'snapshots', ...times] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const sim = new MergeSim()

function Live() {
  useSyncExternalStore((cb) => sim.subscribe(cb), () => sim.state.frame)
  return <App sim={sim} paused={false} speed={1} size={{ width: MIN.w, height: MIN.h }} />
}

const t = await testRender(<Live />, { width: MIN.w, height: MIN.h })
const hex = (c: { buffer: Record<string, number> }) => {
  const b = c.buffer
  return b[3] === 0 ? null : '#' + [b[0], b[1], b[2]].map((v) => Math.round(v * (v <= 1 ? 255 : 1)).toString(16).padStart(2, '0')).join('')
}
for (const target of (times.length ? times : ['3']).map(Number)) {
  while (sim.state.time < target) {
    sim.step(1 / 30)
    await t.renderOnce()
  }
  await t.renderOnce()
  await t.renderOnce()
  const frame = t.captureSpans()
  const rows = frame.lines
    .map((l: any) =>
      l.spans
        .map((s: any) => {
          const fg = hex(s.fg) ?? '#e8e8ea'
          const bg = hex(s.bg)
          const txt = s.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')
          return `<span style="color:${fg};${bg ? `background:${bg};` : ''}${s.attributes & 1 ? 'font-weight:700;' : ''}">${txt}</span>`
        })
        .join(''),
    )
    .join('\n')
  writeFileSync(
    `${outDir}/t${target}.html`,
    `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#0c0c0d"><pre style="margin:0;padding:8px;font:14px/17px 'DejaVu Sans Mono',monospace">${rows}</pre>`,
  )
  writeFileSync(`${outDir}/t${target}.txt`, t.captureCharFrame())
}
await t.dispose()
process.exit(0)
