// Cell layout for the terminal stage. Stations are boxes at these cells; every
// wire is a list of orthogonal waypoints expanded into cells, and every sim
// route id maps onto one of those cell paths.

import type { Pt, RouteId } from '@core'
import { cellsOf, type Wire } from './kit'

export const STAGE = { w: 118, h: 24 }
export const BUILDER_ROWS = [3, 5, 7, 9]
export const RAIL = { x: 0, y: 22, right: 116 }

export const L = {
  builder: { bot: 2, card: 7, cardW: 6, out: 13 },
  handoff: { x: 23, y: 2, w: 12, h: 11, slots: [4, 7, 10], slotX: 27 },
  integrator: { x: 48, y: 4, w: 18, h: 7, mid: 7, cx: 56 },
  main: { x: 66, y: 7, dot0: 70, gap: 6, end: 113 },
  gate: { x: 86, y: 12, w: 28, h: 3, track: [88, 111] as const },
  review: { x: 63, y: 16, w: 18, h: 5, slot: 70 },
}

const P = (x: number, y: number): Pt => ({ x, y })
const into = (row: number) => [P(RAIL.x, RAIL.y), P(RAIL.x, row), P(L.builder.bot - 1, row)]

const routes: Record<string, Pt[]> = {}
BUILDER_ROWS.forEach((row, i) => {
  routes[`build:${i}`] = [P(L.builder.out + 1, row), P(18, row), P(18, 7), P(L.handoff.x - 1, 7)]
  routes[`return:integrator:${i}`] = [P(L.integrator.x - 1, 9), P(44, 9), P(44, RAIL.y), ...into(row)]
  routes[`return:review:${i}`] = [P(L.review.x - 1, 18), P(46, 18), P(46, RAIL.y), ...into(row)]
  routes[`return:gate:${i}`] = [P(L.gate.x + L.gate.w, 13), P(RAIL.right, 13), P(RAIL.right, RAIL.y), ...into(row)]
})
routes['handoff>integrator'] = [P(L.handoff.x + L.handoff.w, 7), P(L.integrator.x - 1, 7)]
routes['integrator>main'] = [P(L.integrator.x + L.integrator.w, 7), P(L.main.dot0, 7)]
routes['main>review'] = [P(L.main.dot0, 8), P(L.main.dot0, L.review.y - 1)]
const mainToGate = [P(L.main.dot0, 8), P(L.main.dot0, 13), P(L.gate.x - 1, 13)]

/** cells for every sim route */
export const routeCells = Object.fromEntries(Object.entries(routes).map(([k, v]) => [k, cellsOf(v)])) as Record<
  RouteId,
  Pt[]
>

/** static wires (drawn once); main line itself is drawn by its station */
export const wires: Wire[] = [
  ...Object.entries(routeCells)
    .filter(([id]) => id !== 'integrator>main')
    .map(([id, cells]) => ({ id, cells })),
  { id: 'main>gate', cells: cellsOf(mainToGate) },
]
