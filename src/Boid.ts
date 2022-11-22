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

  private baseMaxForce = 0.008
  private baseMaxSpeed = 0.1
  private maxForce = 0.05
  private maxSpeed = 0.2

  get rotation(): Euler {
    const quaternion = new Quaternion()
    const rotation = new Euler()

    const baseDirection = new Vector3(0, 0, -1)
    const direction = new Vector3().copy(this.velocity).normalize()

    quaternion.setFromUnitVectors(baseDirection, direction)

    rotation.setFromQuaternion(quaternion)

    return rotation
  }

  constructor(private boundsStart: Vector3, private boundsEnd: Vector3) {
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

      if (other !== this && d < this.perceptionRadius) {
        steering.add(other.velocity)
        total++
      }
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

      if (other !== this && d < this.perceptionRadius) {
        steering.add(other.position)
        total++
      }
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

      if (other !== this && d < this.perceptionRadius) {
        const diff = new Vector3().subVectors(this.position, other.position)

        diff.normalize()
        diff.divideScalar(d)
        steering.add(diff)
        total++
      }
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
      .multiplyScalar(this.maxForce / 100)

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

  update(): void {
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
  ): void {
    this.alignFactor = alignFactor
    this.cohereFactor = cohereFactor
    this.separateFactor = separateFactor
    this.avoidanceFactor = avoidanceFactor
  }

  setPerceptionRadius(perceptionRadius: number): void {
    this.perceptionRadius = perceptionRadius
  }

  setLimits(maxSpeedFactor: number, maxForceFactor: number): void {
    this.maxSpeed = this.baseMaxSpeed * maxSpeedFactor
    this.maxForce = this.baseMaxForce * maxForceFactor
  }

  getVelocity(): Vector3 {
    return this.velocity.clone()
  }
}
