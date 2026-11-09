import type { Edge, Node } from '@xyflow/react'
import { copy } from '@core'

// Layout spec in flow units. Nodes are positioned here; every edge path is
// *computed* by React Flow from the live handle positions, so dragging a
// station re-routes its wires and the packets riding on them.

export const RAIL = { x: 30, y: 498, right: 1232, reviewExit: 650 }
const BUILDER_ROWS = [105, 156, 207, 258]

type TextLine = { t: string; tone?: 'fg' | 'muted' | 'dim' | 'amber' }[]
export type TextData = { lines: TextLine[]; align?: 'left' | 'center' | 'right'; width?: number }

const text = (id: string, x: number, y: number, data: TextData): Node => ({
  id,
  type: 'text',
  position: { x, y },
  data,
  draggable: false,
  selectable: false,
})

export const initialNodes: Node[] = [
  // invisible frame so fitView always frames the whole stage, rails included
  { id: 'frame', type: 'frame', position: { x: 10, y: 50 }, data: {}, draggable: false, selectable: false },

  text('t-builders', 52, 66, { lines: [[{ t: copy.builders.title, tone: 'muted' }]] }),
  ...BUILDER_ROWS.map(
    (y, i): Node => ({ id: `builder-${i}`, type: 'builder', position: { x: 60, y }, data: { index: i } }),
  ),
  text('t-builders-cap', 52, 300, { lines: [[{ t: copy.builders.caption, tone: 'dim' }]] }),

  text('t-handoff', 262, 66, {
    lines: [[{ t: copy.handoff.title, tone: 'fg' }, { t: ' · ' + copy.handoff.sub, tone: 'muted' }]],
  }),
  { id: 'handoff', type: 'handoff', position: { x: 332, y: 102 }, data: {} },
  text('t-handoff-notes', 230, 332, {
    lines: copy.handoff.notes.map((t) => [{ t, tone: 'dim' as const }]),
    align: 'center',
    width: 300,
  }),

  text('t-integrator', 548, 90, {
    lines: [
      [{ t: copy.integrator.title, tone: 'fg' }, { t: ' · ' + copy.integrator.sub, tone: 'muted' }],
      [{ t: copy.integrator.stats, tone: 'amber' }],
    ],
    align: 'center',
    width: 400,
  }),
  { id: 'integrator', type: 'integrator', position: { x: 675, y: 148 }, data: {} },

  { id: 'main', type: 'main', position: { x: 820, y: 150 }, data: {} },

  text('t-gate', 905, 236, {
    lines: [
      [{ t: copy.gate.title, tone: 'fg' }, { t: ' · ' + copy.gate.sub, tone: 'muted' }],
      [{ t: copy.gate.note, tone: 'dim' }],
    ],
    align: 'right',
    width: 305,
  }),
  { id: 'gate', type: 'gate', position: { x: 1020, y: 285 }, data: {} },

  { id: 'review', type: 'review', position: { x: 820, y: 365 }, data: {} },
  text('t-review', 990, 372, {
    lines: [[{ t: copy.review.title, tone: 'fg' }], ...copy.review.notes.map((t) => [{ t, tone: 'dim' as const }])],
  }),

  text('t-rail', 170, 508, { lines: [[{ t: copy.rail, tone: 'dim' }]] }),
]

const wire = (
  id: string,
  source: string,
  target: string,
  shape: 'bezier' | 'straight' | 'step',
  sourceHandle = 'out',
  targetHandle = 'in',
): Edge => ({
  id,
  source,
  target,
  sourceHandle,
  targetHandle,
  type: 'wire',
  data: { shape },
})

type ReturnGuide = { x?: number; y?: number }
const returnEdge = (source: 'integrator' | 'gate' | 'review', i: number, guides: ReturnGuide[]): Edge => ({
  id: `return:${source}:${i}`,
  source,
  target: `builder-${i}`,
  sourceHandle: 'back',
  targetHandle: 'in',
  type: 'return',
  data: { guides },
})

export const initialEdges: Edge[] = [
  ...BUILDER_ROWS.map((_, i) => wire(`build:${i}`, `builder-${i}`, 'handoff', 'bezier')),
  wire('handoff>integrator', 'handoff', 'integrator', 'straight'),
  wire('integrator>main', 'integrator', 'main', 'straight'),
  wire('main>review', 'main', 'review', 'straight', 'down'),
  wire('main>gate', 'main', 'gate', 'step', 'down'),
  ...BUILDER_ROWS.flatMap((_, i) => [
    returnEdge('integrator', i, [{ y: RAIL.y }, { x: RAIL.x }]),
    returnEdge('review', i, [{ x: RAIL.reviewExit }, { y: RAIL.y }, { x: RAIL.x }]),
    returnEdge('gate', i, [{ x: RAIL.right }, { y: RAIL.y }, { x: RAIL.x }]),
  ]),
]
