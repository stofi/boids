import { Suspense } from 'react'

import { Canvas } from '@react-three/fiber'

import { Leva } from 'leva'

import Scene from './objets/Scene'

//window has #debug
const isDebug = window.location.hash === '#debug'

export default function Experience() {
  return (
    <>
      <Leva hidden={!isDebug} />
      <Canvas
        flat={false}
        shadows={true}
        dpr={1}
        camera={{
          position: [5, 5, 5],
          near: 0.75,
        }}
      >
        <color args={['skyblue']} attach='background' />
        <Suspense>
          <Scene />
        </Suspense>
      </Canvas>
    </>
  )
}
