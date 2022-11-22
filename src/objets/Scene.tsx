import * as THREE from 'three'
import { useMemo, useRef } from 'react'

import { Environment, OrbitControls } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

import { useControls } from 'leva'

import Boid from '../Boid'

const boidGeometry = new THREE.SphereGeometry(0.1, 8, 8)
const boidMaterial = new THREE.MeshStandardMaterial({ color: 'yellow' })

const boidFrontGeometry = new THREE.ConeGeometry(0.1, 0.2, 8)
const boidFrontMaterial = new THREE.MeshStandardMaterial({ color: 'red' })

const boundsMaterial = new THREE.MeshStandardMaterial({
  color: 'white',
  transparent: true,
  opacity: 0.1,
  roughness: 0,
})

const dim = 80
const boundsStart = new THREE.Vector3(-dim, -dim, -dim)
const boundsEnd = new THREE.Vector3(dim, dim, dim)

const randomInBounds = () => {
  return new THREE.Vector3(
    Math.random() * (boundsEnd.x - boundsStart.x) + boundsStart.x,
    Math.random() * (boundsEnd.y - boundsStart.y) + boundsStart.y,
    Math.random() * (boundsEnd.z - boundsStart.z) + boundsStart.z,
  ).multiplyScalar(0.25)
}

export default function Scene() {
  const count = 300
  const obstacles = useRef<THREE.Mesh[]>([])

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

  const lerpedCameraPosition = useRef(new THREE.Vector3(0, 0, 0))
  const lerpedCameraLookAt = useRef(new THREE.Vector3(0, 0, 0))

  const boidMeshes = (startI: number) => (
    <group>
      {boids.map((boid, i) => (
        <mesh
          geometry={boidGeometry}
          material={boidMaterial}
          key={i}
          position={boid.position}
          rotation={boid.rotation}
          ref={(ref) => ref && (boidRefs.current[startI + i] = ref)}
        >
          <mesh
            geometry={boidFrontGeometry}
            material={boidFrontMaterial}
            rotation-x={-Math.PI / 2}
            position-z={-0.15}
          />
        </mesh>
      ))}
    </group>
  )
  const n = 1

  const repeatedBoidMeshes = useMemo(
    () => (
      <group>
        {/* position in n^3 grid */}
        {new Array(n ** 3).fill(null).map((_, i) => {
          const size = boundsEnd.clone().sub(boundsStart)
          const offset = size.clone().divideScalar(2).add(boundsStart)
          const x = i % n
          const y = Math.floor((i / n) % n)
          const z = Math.floor(i / n ** 2)

          const position = new THREE.Vector3(
            x * size.x - offset.x,
            y * size.y - offset.y,
            z * size.z - offset.z,
          )

          return (
            <group key={i} position={position}>
              {boidMeshes(i * count)}
            </group>
          )
        })}
      </group>
    ),
    [],
  )

  const {
    alignmentWeight,
    cohesionWeight,
    separationWeight,
    avoidanceWeight,
    maxSpeed,
    maxForce,
    perceptionRadius,
    freeCamera,
  } = useControls({
    alignmentWeight: { value: 1, min: 0, max: 10, label: 'Alignment' },
    cohesionWeight: { value: 1, min: 0, max: 10, label: 'Cohesion' },
    separationWeight: { value: 2, min: 0, max: 10, label: 'Separation' },
    avoidanceWeight: { value: 3, min: 0, max: 10, label: 'Avoidance' },
    maxSpeed: { value: 2, min: 0, max: 10, label: 'Max Speed' },
    maxForce: { value: 1, min: 0, max: 10, label: 'Max Force' },
    perceptionRadius: {
      value: 6,
      min: 0,
      max: 50,
      label: 'Perception',
    },
    freeCamera: false,
  })
  const time = useRef(0)
  const cameraIndex = useRef(0)

  useFrame((state) => {
    boids.forEach((boid, i) => {
      boid.setFactors(
        alignmentWeight,
        cohesionWeight,
        separationWeight,
        avoidanceWeight,
      )
      boid.setLimits(maxSpeed, maxForce)
      boid.setPerceptionRadius(perceptionRadius)

      boid.flock(boids)
      boid.avoid(obstacles.current)
    })

    boids.forEach((boid, i) => {
      boid.edges()
      boid.update()

      new Array(n ** 3).fill(null).forEach((_, j) => {
        boidRefs.current[j * count + i].position.copy(boid.position)
        boidRefs.current[j * count + i].rotation.copy(boid.rotation)
      })

      if (i == cameraIndex.current) {
        lerpedCameraPosition.current.lerp(boid.position, 0.01)

        lerpedCameraLookAt.current.lerp(
          boid.position.clone().add(boid.getVelocity()),
          0.01,
        )
      }
    })

    if (!freeCamera) {
      state.camera.position.copy(lerpedCameraPosition.current)
      state.camera.lookAt(lerpedCameraLookAt.current)
    }

    time.current += 1

    if (time.current % 1000 == 0) {
      time.current = 0
      cameraIndex.current = Math.floor(Math.random() * count)
    }
  })

  return (
    <>
      <OrbitControls makeDefault />

      {/* <directionalLight />

      <hemisphereLight intensity={0.5} args={['lightblue', 'lightgreen']} /> */}

      <Environment preset='sunset' background={false}></Environment>

      {repeatedBoidMeshes}

      {/* Obstacle */}
      <mesh
        ref={(ref) => ref && (obstacles.current[0] = ref)}
        position={[dim - 12, -dim + 15, -dim + 12]}
        rotation-y={Math.PI / 4}
      >
        <meshStandardMaterial color='black' roughness={0.1} />
        <boxGeometry args={[2, 30, 10]} />
      </mesh>

      {/* Bounds */}
      <mesh
        ref={(ref) => ref && (obstacles.current[1] = ref)}
        position-x={-dim}
        material={boundsMaterial}
      >
        <boxGeometry args={[1, 2 * dim, 2 * dim]} />
      </mesh>
      <mesh
        ref={(ref) => ref && (obstacles.current[2] = ref)}
        position-x={dim}
        material={boundsMaterial}
      >
        <boxGeometry args={[1, 2 * dim, 2 * dim]} />
      </mesh>
      <mesh
        ref={(ref) => ref && (obstacles.current[3] = ref)}
        position-y={-dim}
      >
        <boxGeometry args={[2 * dim, 1, 2 * dim]} />
        <meshStandardMaterial
          color='YellowGreen'
          metalness={0}
          roughness={0.9}
        />
      </mesh>
      <mesh
        ref={(ref) => ref && (obstacles.current[4] = ref)}
        position-y={dim}
        material={boundsMaterial}
      >
        <boxGeometry args={[2 * dim, 1, 2 * dim]} />
      </mesh>
      <mesh
        ref={(ref) => ref && (obstacles.current[5] = ref)}
        position-z={-dim}
        material={boundsMaterial}
      >
        <boxGeometry args={[2 * dim, 2 * dim, 1]} />
      </mesh>
      <mesh
        ref={(ref) => ref && (obstacles.current[6] = ref)}
        position-z={dim}
        material={boundsMaterial}
      >
        <boxGeometry args={[2 * dim, 2 * dim, 1]} />
      </mesh>

      {/* Sphere Obstacle */}

      <mesh
        ref={(ref) => ref && (obstacles.current[7] = ref)}
        position={[8 - dim / 2, -dim - 18, -dim / 2]}
      >
        <sphereGeometry args={[32, 16, 16]} />
        <meshStandardMaterial
          color='YellowGreen'
          metalness={0}
          roughness={0.9}
        />
      </mesh>

      <mesh
        ref={(ref) => ref && (obstacles.current[8] = ref)}
        position={[-14, dim - 25, 0]}
        rotation-z={Math.PI / 2}
      >
        <boxGeometry args={[2, 10, 2 * dim]} />
        <meshStandardMaterial color='BurlyWood' metalness={0} roughness={0.9} />
      </mesh>
      <mesh
        ref={(ref) => ref && (obstacles.current[9] = ref)}
        position={[0, -dim + 20, 15]}
        rotation-y={Math.PI / 3}
        rotation-x={Math.PI / 3}
      >
        <meshStandardMaterial color='BurlyWood' metalness={0} roughness={0.9} />
        <boxGeometry args={[2, 20, 2 * dim]} />
      </mesh>
      <mesh
        ref={(ref) => ref && (obstacles.current[10] = ref)}
        position={[0, dim - 15, -dim + 12]}
        rotation-z={Math.PI / 2}
        rotation-y={Math.PI / 2}
      >
        <boxGeometry args={[2, 10, 2 * dim]} />
        <meshStandardMaterial color='BurlyWood' metalness={0} roughness={0.9} />
      </mesh>

      {/* torus */}
    </>
  )
}
