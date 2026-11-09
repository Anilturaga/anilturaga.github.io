import { useEffect, useRef, useState } from 'react'
import { ReactFlow, ReactFlowProvider, useReactFlow, useNodesState } from '@xyflow/react'
import { Pause, Play } from 'lucide-react'
import { copy } from '@core'
import { SimProvider } from '@/sim'
import { Button } from '@/components/ui/button'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { initialEdges, initialNodes } from '@/flow/layout'
import { nodeTypes } from '@/flow/nodes'
import { edgeTypes } from '@/flow/edges'
import { Coming, Header, NextLane } from '@/sections'

const STAGE_W = 1250

function Flow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes)
  const { fitView } = useReactFlow()
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => fitView({ padding: 0, nodes: [{ id: 'frame' }] }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [fitView])
  return (
    <div ref={box} className="relative w-full" style={{ aspectRatio: `${STAGE_W} / 490` }}>
      <ReactFlow
        nodes={nodes}
        edges={initialEdges}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0, nodes: [{ id: 'frame' }] }}
        nodesConnectable={false}
        elementsSelectable={false}
        edgesFocusable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        minZoom={0.2}
        proOptions={{ hideAttribution: true }}
      />
    </div>
  )
}

function Controls({
  paused,
  setPaused,
  speed,
  setSpeed,
}: {
  paused: boolean
  setPaused: (p: boolean) => void
  speed: number
  setSpeed: (s: number) => void
}) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
        <span className="text-[12.5px] text-muted">{copy.footer}</span>
        <span className="text-[11px] text-dim">drag any station; the wires and packets follow</span>
      </div>
      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={() => setPaused(!paused)} id="pause" aria-pressed={paused}>
              {paused ? <Play /> : <Pause />}
              {paused ? 'Resume' : 'Pause'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Space bar also pauses</TooltipContent>
        </Tooltip>
        <ToggleGroup
          type="single"
          value={String(speed)}
          onValueChange={(v) => v && setSpeed(Number(v))}
          aria-label="Playback speed"
        >
          <ToggleGroupItem value="1" id="speed-1">
            1×
          </ToggleGroupItem>
          <ToggleGroupItem value="0.25" id="speed-quarter">
            ¼×
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </footer>
  )
}

export default function App() {
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault()
        setPaused((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  return (
    <TooltipProvider delayDuration={300}>
      <SimProvider paused={paused} speed={speed}>
        <main className="mx-auto max-w-[1320px]">
          <div className="overflow-x-auto">
            <div className="min-w-[1180px]">
              <Header />
              <ReactFlowProvider>
                <Flow />
              </ReactFlowProvider>
              <NextLane />
              <Coming />
            </div>
          </div>
          <Controls paused={paused} setPaused={setPaused} speed={speed} setSpeed={setSpeed} />
        </main>
      </SimProvider>
    </TooltipProvider>
  )
}
