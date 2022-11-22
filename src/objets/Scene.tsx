import * as THREE from 'three'
import { useMemo, useRef } from 'react'

import { Environment, OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

import { useControls } from 'leva'

import Boid from '../Boid'

const boidGeometry = new THREE.SphereGeometry(0.1, 8, 8)
const boidMaterial = new THREE.MeshBasicMaterial({ color: 'yellow' })

const boidFrontGeometry = new THREE.ConeGeometry(0.1, 0.2, 8)
const boidFrontMaterial = new THREE.MeshBasicMaterial({ color: 'red' })

const boundsMaterial = new THREE.MeshBasicMaterial({
  color: 'red',
  opacity: 0.1,
  transparent: true,
})

const boundsStart = new THREE.Vector3(-20, -20, -20)
const boundsEnd = new THREE.Vector3(20, 20, 20)

const randomInBounds = () => {
  return new THREE.Vector3(
    Math.random() * (boundsEnd.x - boundsStart.x) + boundsStart.x,
    Math.random() * (boundsEnd.y - boundsStart.y) + boundsStart.y,
    Math.random() * (boundsEnd.z - boundsStart.z) + boundsStart.z,
  )
}

export default function Scene() {
  const count = 100

  const boids = useMemo(
    () =>
      new Array(count).fill(null).map(() => {
        const position = randomInBounds()

        const b = new Boid(boundsStart, boundsEnd)
        b.position.copy(position)

        return b
      }),
    [count],
  )

  const boidRefs = useRef<THREE.Mesh[]>([])

  const boidMeshes = useMemo(
    () => (
      <group>
        {boids.map((boid, i) => (
          <mesh
            geometry={boidGeometry}
            material={boidMaterial}
            key={i}
            position={boid.position}
            rotation={boid.rotation}
            ref={(ref) => ref && (boidRefs.current[i] = ref)}
          >
            <mesh
              geometry={boidFrontGeometry}
              material={boidFrontMaterial}
              rotation-x={-Math.PI / 2}
              position-z={-0.15}
            />
            {/* <mesh
              scale={10 * boid.perceptionRadius}
              geometry={boidGeometry}
              material={boundsMaterial}
            ></mesh> */}
          </mesh>
        ))}
      </group>
    ),
    [boids],
  )

  const {
    alignmentWeight,
    cohesionWeight,
    separationWeight,
    maxSpeed,
    maxForce,
    perceptionRadius,
  } = useControls({
    alignmentWeight: { value: 1, min: 0, max: 10, label: 'Alignment' },
    cohesionWeight: { value: 1, min: 0, max: 10, label: 'Cohesion' },
    separationWeight: { value: 1, min: 0, max: 10, label: 'Separation' },
    maxSpeed: { value: 1, min: 0, max: 10, label: 'Max Speed' },
    maxForce: { value: 1, min: 0, max: 10, label: 'Max Force' },
    perceptionRadius: { value: 3, min: 0, max: 10, label: 'Perception Radius' },
  })

  useFrame(({ clock }) => {
    const delta = clock.getDelta()

    boids.forEach((boid, i) => {
      boid.setFactors(alignmentWeight, cohesionWeight, separationWeight)
      boid.setLimits(maxSpeed, maxForce)
      boid.setPerceptionRadius(perceptionRadius)
      boid.edges()
      boid.flock(boids)
    })

    boids.forEach((boid, i) => {
      boid.update()
      boidRefs.current[i].position.copy(boid.position)
      boidRefs.current[i].rotation.copy(boid.rotation)
    })
  })

  return (
    <>
      <OrbitControls makeDefault />

      {/* <directionalLight />

      <hemisphereLight intensity={0.5} args={['lightblue', 'lightgreen']} /> */}

      <Environment preset='sunset' background={false}></Environment>

      {boidMeshes}
    </>
  )
}
