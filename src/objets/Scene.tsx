import * as THREE from 'three'
import { useMemo, useRef } from 'react'

import { Environment, OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'

import { useControls } from 'leva'

import Boids from './Boids'
import PixelEffect from './PixelEffect'

export default function Scene() {
  return (
    <>
      <OrbitControls makeDefault />

      {/* <directionalLight />

      <hemisphereLight intensity={0.5} args={['lightblue', 'lightgreen']} /> */}

      <Environment preset='sunset' background={false}></Environment>
      {/* <EffectComposer>
        <PixelEffect />
      </EffectComposer> */}

      <Boids count={400} bounds={50} />
    </>
  )
}
