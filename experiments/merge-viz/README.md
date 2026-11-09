# merge-viz

Two renderings of the same animated merge-pipeline visualizer (after
[this clip](https://x.com/kitlangton/status/2119850759886102572)):

- `web/`: React + **React Flow** (custom nodes and edges), **motion** for the
  transitions, and **shadcn/ui** components (Button, ToggleGroup, Tooltip) on Tailwind v4.
  It builds to one self-contained HTML file that is published as a Claude artifact.
- `tui/`: the same diagram in a terminal, using **OpenTUI** through its React
  reconciler (`@opentui/react`).

Both renderers drive one shared simulation in `core/`.

```
core/   pure TypeScript, no DOM, no terminal
  sim.ts       MergeSim: stations, changes, packets, seeded RNG, step(dt)
  copy.ts      every on-screen word (swap these to describe your own pipeline)
  geometry.ts  polyline helpers
web/    React Flow renderer        npm i && npm run dev | npm run build
tui/    OpenTUI renderer           bun i && bun start   (needs a 120×44 terminal)
```

## How the pieces fit

The sim knows the **topology** but nothing about pixels or cells. Anything
that moves is a `Packet` with a named route (`build:2`, `handoff>integrator`,
`return:gate:1`, …) and a 0..1 progress. Each renderer maps route names to
its own geometry:

| | web | tui |
|---|---|---|
| station | custom React Flow node | `<Station>` box at a cell |
| route geometry | the edge's live SVG path, computed by React Flow from handle positions | orthogonal waypoints expanded into cells |
| packet position | `path.getPointAtLength(t · length)` | `cells[round(t · (n-1))]` |
| motion streak | fading ghost cards behind the head | dimmer glyphs on the previous cells |
| lit return trail | dash-array overlay on the edge path | colored overlay on the wire grid |

Nothing is a hand-drawn SVG. Web wires are React Flow edges, so you can
drag any station and its wires and the packets on them re-route. Rings are
CSS conic gradients and icons come from lucide.

## What is animated (read frame by frame from the clip)

- **builders**: the antenna lights and the card glows amber while the builder
  works. A finished card cools to brown while it waits for a free slot, then
  tumbles along its curve into hand-off.
- **hand-off**: 3 slots. Each card runs a "fast proof" ring (amber); when it
  passes, the ring turns green and the card gets a green pip. The oldest
  passed card leaves first.
- **integrator**: one branch at a time. The plates clamp in, the ports light,
  tick marks vibrate, and the caption steps through *compile on Linux →
  clippy + tests → static → push* (or *fast lane · no tests → merge*).
  Some changes fail with *conflict · to its builder*.
- **main**: the newest commit enters on the left and older ones slide right.
  Rings mark commits waiting for or under review, and the gate's checkpoint.
  The status changes between *green* and *red, main-red task filed*.
- **full gate**: runs on a schedule. A dot moves along the track and ends in
  a green ✓ or a red ✗; a ✗ sends a *main-red* packet back.
- **Opus review**: risky or retried landings drop in, a spinner runs, and
  sometimes *fixes* goes back to the builder.
- **return rail**: conflict, fixes and main-red packets travel the bottom loop
  into the builder that wrote the change, lighting the path behind them.
  That builder then reworks the change.
- **NEXT · b4017**: a block hops merge → compile → fmt → guard → push, then
  drops onto the after.sh line. The five checks run at once and a failure
  marks that dot as the *culprit*.
- **clock**: one turn per loop (18 s ≈ an hour). **COMING** is a static roadmap.

## OpenTUI: composing components

`@opentui/react` gives you React function components over `<box>` and
`<text>`, laid out with Yoga flexbox, so composition works like React DOM.
`tui/src/kit.tsx` is a small, domain-free kit built that way:

- `<Abs>` places a child absolutely, in cells.
- `<Line>` draws one row of colored segments.
- `<Label>` is text aligned left, center or right of a point.
- `<Station>` is a filled box with rounded borders. Boxes are transparent by
  default, so the fill hides the wires behind it.
- `<Port>` is a connector glyph on a station wall.
- `<WireLayer>` draws all wires onto one grid of N/E/S/W bits, so joins and
  crossings get the right junction (`├ ┬ ┴ ┼ ╭ ╯`).
- `<Rider>` is a glyph moving along a wire, with a trail.
- `chipSegs`, `ringGlyph`, `spinGlyph` and `useEased` are small helpers;
  `useEased` slides dots between cells.

`tui/src/stations.tsx` builds the diagram from those pieces. For drawing that
flexbox can't express, OpenTUI also lets you subclass a core renderable and
register it with `extend()`.

`bun run snapshot` renders frames headlessly, using OpenTUI's test renderer
and `captureSpans`, to colored HTML for review.

## Controls

Web: **Pause**, **1× / ¼×**, space bar; drag stations.
TUI: `space` pause, `1` / `2` speed, `q` quit.
