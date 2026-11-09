import { createCliRenderer } from '@opentui/core'
import { createRoot, useKeyboard, useRenderer, useTerminalDimensions } from '@opentui/react'
import { useState } from 'react'
import { Root } from './app'

function Main() {
  const size = useTerminalDimensions()
  const renderer = useRenderer()
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(1)
  useKeyboard((key) => {
    if (key.name === 'space' || key.name === 'p') setPaused((p) => !p)
    else if (key.name === '1') setSpeed(1)
    else if (key.name === '2' || key.name === '4') setSpeed(0.25)
    else if (key.name === 'q' || key.name === 'escape') {
      renderer.destroy()
      process.exit(0)
    }
  })
  return <Root size={size} controls={{ paused, speed }} />
}

const renderer = await createCliRenderer({ exitOnCtrlC: true, targetFps: 30 })
createRoot(renderer).render(<Main />)
