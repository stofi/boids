import { Euler, Quaternion, Raycaster, Vector3 } from 'three'

const raycaster = new Raycaster()

export default class Boid {
  public position = new Vector3()

  private velocity = new Vector3()
  private lerpVelocity = new Vector3()
  private acceleration = new Vector3()

  public perceptionRadius = 5

  private alignFactor = 1
  private cohereFactor = 1
  private separateFactor = 1
  private avoidanceFactor = 1
  private keepToCenterFactor = 1

  private baseMaxForce = 0.008
  private baseMaxSpeed = 0.1
  private maxForce = 0.05
  private maxSpeed = 0.2

  private checkFov = true

  get rotation(): Euler {
    const quaternion = new Quaternion()
    const rotation = new Euler()

    const baseDirection = new Vector3(0, 0, -1)
    const direction = new Vector3().copy(this.velocity).normalize()

    quaternion.setFromUnitVectors(baseDirection, direction)

    rotation.setFromQuaternion(quaternion)

    return rotation
  }

  constructor(
    private boundsStart: Vector3,
    private boundsEnd: Vector3,
    private type = 'boid',
  ) {
    this.velocity = new Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
    )
      .normalize()
      .multiplyScalar(this.maxSpeed)
  }

  edges(): void {
    const compare = (dim: 'x' | 'y' | 'z') => {
      if (this.position[dim] > this.boundsEnd[dim]) {
        this.position[dim] = this.boundsStart[dim]
        debugger
      } else if (this.position[dim] < this.boundsStart[dim]) {
        this.position[dim] = this.boundsEnd[dim]
        debugger
      }
    }
    compare('x')
    compare('y')
    compare('z')
  }

  align(boids: Boid[]): Vector3 {
    const steering = new Vector3()
    let total = 0

    for (const other of boids) {
      const d = this.position.distanceTo(other.position)
      if (!this.isNeighborValid(other)) continue

      steering.add(other.velocity)
      total++
    }

    if (total > 0) {
      steering.divideScalar(total)
      steering.sub(this.velocity)
      steering.clampLength(0, this.maxForce)
    }
    steering.multiplyScalar(this.alignFactor)

    return steering
  }

  cohere(boids: Boid[]): Vector3 {
    const steering = new Vector3()
    let total = 0

    for (const other of boids) {
      const d = this.position.distanceTo(other.position)

      if (!this.isNeighborValid(other)) continue

      steering.add(other.position)
      total++
    }

    if (total > 0) {
      steering.divideScalar(total)
      steering.sub(this.position)
      steering.sub(this.velocity)
      steering.clampLength(0, this.maxForce)
    }
    steering.multiplyScalar(this.cohereFactor)

    return steering
  }

  separate(boids: Boid[]): Vector3 {
    const steering = new Vector3()
    let total = 0

    for (const other of boids) {
      const d = this.position.distanceTo(other.position)
      if (!this.isNeighborValid(other, true)) continue

      const diff = new Vector3().subVectors(this.position, other.position)

      diff.normalize()
      diff.divideScalar(d)
      steering.add(diff)
      total++
    }

    if (total > 0) {
      steering.divideScalar(total)
      steering.sub(this.velocity)
      steering.clampLength(0, this.maxForce)
    }

    steering.multiplyScalar(this.separateFactor)

    return steering
  }

  addRandomForce(): void {
    const force = new Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
    )
      .normalize()
      .multiplyScalar(this.maxForce / 1000)

    this.acceleration.add(force)
  }

  flock(boids: Boid[]): void {
    this.acceleration.add(this.separate(boids))
    this.acceleration.add(this.align(boids))
    this.acceleration.add(this.cohere(boids))
    this.addRandomForce()
  }

  doAvoid(position: Vector3, normal: Vector3): void {
    const steering = new Vector3()
    const distance = position.distanceTo(this.position)
    if (distance >= this.perceptionRadius) return

    let scale = 1 - distance / this.perceptionRadius
    scale = Math.min(Math.max(scale, 0), 1)
    scale = Math.pow(scale, 2)

    const cross = new Vector3().crossVectors(normal, this.velocity)

    const avoidAngle = (Math.PI / 180) * 30

    // rotate normal by avoidAngle around position in the plane of the cross product
    const avoidNormal = new Vector3()
      .copy(normal)
      .applyAxisAngle(cross, avoidAngle)

    steering.add(avoidNormal)
    steering.sub(this.velocity)
    // steering.clampLength(0, this.maxForce)
    steering.multiplyScalar(this.avoidanceFactor * scale)

    this.acceleration.add(steering)
  }
  avoid(obstacles: THREE.Mesh[]): void {
    raycaster.set(this.position, this.getVelocity().normalize())
    const intersects = raycaster.intersectObjects(obstacles, true)

    if (intersects.length > 0) {
      const intersect = intersects[0]
      if (intersect.distance > this.perceptionRadius) return
      const normal = intersect.face?.normal

      if (normal) {
        this.doAvoid(intersect.point, normal)
      }
    }
  }

  keepToCenter(): void {
    const center = new Vector3()
    center.add(this.boundsStart)
    center.add(this.boundsEnd)
    center.divideScalar(2)

    const distance = center.distanceTo(this.position)
    const maxDistance = this.boundsEnd.distanceTo(this.boundsStart) / 2

    // find the shortest axis
    const axes = ['x', 'y', 'z'] as const

    const axis = axes.reduce(
      (acc, dim) => {
        const d = this.boundsEnd[dim] - this.boundsStart[dim]

        if (d < acc.d) {
          acc.d = d
          acc.dim = dim
        }

        return acc
      },
      { d: Infinity, dim: null as null | typeof axes[number] },
    )

    const minDistance = axis.dim
      ? this.boundsEnd[axis.dim] - this.boundsStart[axis.dim]
      : 1

    let factor = distance / minDistance

    const minClamp = 0.25
    factor -= minClamp
    factor = Math.min(Math.max(factor, 0), 1)
    factor /= 1 - minClamp
    factor = Math.pow(factor, 2)

    const steering = new Vector3()
      .subVectors(center, this.position)
      .normalize()
      .multiplyScalar(factor * 2)

    steering.multiplyScalar(this.keepToCenterFactor)

    this.acceleration.add(steering)
  }

  update(delta?: number): void {
    this.position.add(this.lerpVelocity)
    this.velocity.add(this.acceleration)
    this.acceleration.multiplyScalar(0)
    this.velocity.setLength(this.maxSpeed)
    this.lerpVelocity.lerp(this.velocity, 0.9)
  }

  setFactors(
    alignFactor: number,
    cohereFactor: number,
    separateFactor: number,
    avoidanceFactor: number,
    keepToCenterFactor: number,
  ): void {
    this.alignFactor = alignFactor
    this.cohereFactor = cohereFactor
    this.separateFactor = separateFactor
    this.avoidanceFactor = avoidanceFactor
    this.keepToCenterFactor = keepToCenterFactor
  }

  setPerceptionRadius(perceptionRadius: number): void {
    this.perceptionRadius = perceptionRadius
  }

  setLimits(maxSpeedFactor: number, maxForceFactor: number): void {
    this.maxSpeed = this.baseMaxSpeed * maxSpeedFactor
    this.maxForce = this.baseMaxForce * maxForceFactor
  }

  setBounds(boundsStart: Vector3, boundsEnd: Vector3): void {
    this.boundsStart = boundsStart
    this.boundsEnd = boundsEnd
  }

  getVelocity(): Vector3 {
    return this.velocity.clone()
  }

  isInFieldOfView(other: Boid, maxAngleDeg: number): boolean {
    const maxAngle = (Math.PI / 180) * maxAngleDeg

    const relativePosition = new Vector3().subVectors(
      other.position,
      this.position,
    )
    const angle = this.velocity.angleTo(relativePosition)

    return angle < maxAngle
  }

  isNeighborValid(other: Boid, skipType = false): boolean {
    const d = this.position.distanceTo(other.position)
    if (!skipType && other.type !== this.type) return false
    if (other === this) return false
    if (d >= this.perceptionRadius) return false
    if (this.checkFov && this.isInFieldOfView(other, 45)) return false

    return true
  }
}
