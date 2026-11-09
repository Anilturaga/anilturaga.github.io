// Record the real OpenTUI output to video.
//
//   bun run src/record.tsx [out.mp4] [seconds]
//
// 1. Drives <App> through OpenTUI's headless test renderer at 30 fps, following
//    a short script of key presses (pause, ¼×, 1×), and captures every frame's
//    cells with their colors (captureSpans).
// 2. Draws those cells as HTML in a terminal-window frame and screenshots each
//    one with Playwright (Chromium).
// 3. Encodes the screenshots with ffmpeg.
import { testRender } from '@opentui/react/test-utils'
import { useSyncExternalStore } from 'react'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { MergeSim } from '@core'
import { App, MIN } from './app'

const out = resolve(process.argv[2] ?? 'merge-viz-tui.mp4')
const SECONDS = Number(process.argv[3] ?? 26)
const FPS = 30

// what the "viewer" presses, in video seconds
const script: { at: number; paused?: boolean; speed?: number }[] = [
  { at: 13, paused: true },
  { at: 14.6, paused: false },
  { at: 16, speed: 0.25 },
  { at: 21.5, speed: 1 },
]

const sim = new MergeSim()
const controls = { paused: false, speed: 1 }
let tick = 0
const subs = new Set<() => void>()
const bump = () => {
  tick++
  for (const s of subs) s()
}

function Live() {
  useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => tick,
  )
  return <App sim={sim} paused={controls.paused} speed={controls.speed} size={{ width: MIN.w, height: MIN.h }} />
}

const t = await testRender(<Live />, { width: MIN.w, height: MIN.h })

type RGBA = { buffer: ArrayLike<number> }
const hex = (c: RGBA) => {
  const b = c.buffer
  if (b[3] === 0) return null
  const to = (v: number) => Math.round(v <= 1 ? v * 255 : v).toString(16).padStart(2, '0')
  return '#' + to(b[0]) + to(b[1]) + to(b[2])
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const frames: string[] = []
const total = Math.round(SECONDS * FPS)
for (let i = 0; i < total; i++) {
  const now = i / FPS
  for (const s of script) {
    if (Math.abs(now - s.at) < 0.5 / FPS) Object.assign(controls, s.paused === undefined ? {} : { paused: s.paused }, s.speed === undefined ? {} : { speed: s.speed })
  }
  if (!controls.paused) sim.step(controls.speed / FPS)
  bump()
  await t.renderOnce()
  const frame = t.captureSpans()
  frames.push(
    frame.lines
      .map((l) =>
        l.spans
          .map((s) => {
            const fg = hex(s.fg) ?? '#e8e8ea'
            const bg = hex(s.bg)
            const style = `color:${fg};${bg && bg !== '#0c0c0d' ? `background:${bg};` : ''}${s.attributes & 1 ? 'font-weight:700;' : ''}`
            return `<span style="${style}">${esc(s.text)}</span>`
          })
          .join(''),
      )
      .join('\n'),
  )
}
await t.dispose()
console.log(`captured ${frames.length} OpenTUI frames`)

// ── draw + screenshot ──
const work = join(tmpdir(), `merge-viz-rec-${process.pid}`)
rmSync(work, { recursive: true, force: true })
mkdirSync(join(work, 'png'), { recursive: true })
writeFileSync(join(work, 'frames.json'), JSON.stringify(frames))
writeFileSync(
  join(work, 'shoot.cjs'),
  `
const { chromium } = require('playwright')
const frames = require(${JSON.stringify(join(work, 'frames.json'))})
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1060, height: 860 }, deviceScaleFactor: 2 })
  await p.setContent(\`<!doctype html><meta charset="utf-8">
  <style>
    body{margin:0;background:#050506;display:grid;place-items:center;height:100vh}
    .win{border-radius:12px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 0 1px #26262b;background:#0c0c0d}
    .bar{height:30px;display:flex;align-items:center;gap:8px;padding:0 12px;background:#161618;border-bottom:1px solid #222226;font:12px 'DejaVu Sans',sans-serif;color:#8b8b92}
    .bar i{width:11px;height:11px;border-radius:50%;display:inline-block}
    .bar span{flex:1;text-align:center;margin-right:50px}
    pre{margin:0;padding:10px 12px 12px;font:14px/17px 'DejaVu Sans Mono',monospace;color:#e8e8ea}
  </style>
  <div class="win"><div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span>merge-viz/tui — bun start — opentui</span></div><pre id="t"></pre></div>\`)
  const el = await p.$('.win')
  for (let i = 0; i < frames.length; i++) {
    await p.evaluate((h) => { document.getElementById('t').innerHTML = h }, frames[i])
    await el.screenshot({ path: ${JSON.stringify(join(work, 'png'))} + '/f' + String(i).padStart(5, '0') + '.png' })
  }
  await b.close()
})()
`,
)
const shoot = spawnSync('node', [join(work, 'shoot.cjs')], { stdio: 'inherit' })
if (shoot.status !== 0) throw new Error('screenshot step failed')

// ── encode ──
const ff = spawnSync(
  'ffmpeg',
  ['-y', '-v', 'error', '-framerate', String(FPS), '-i', join(work, 'png', 'f%05d.png'),
   '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', out],
  { stdio: 'inherit' },
)
if (ff.status !== 0) throw new Error('ffmpeg failed')
rmSync(work, { recursive: true, force: true })
console.log('wrote', out)
process.exit(0)
