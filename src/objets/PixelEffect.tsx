import { useMemo } from 'react'

import PixelPPEffect from '../effects/PixelPPEffect'

export default function PixelEffect() {
  const effect = useMemo(() => new PixelPPEffect(), [])

  return <primitive object={effect} />
}
