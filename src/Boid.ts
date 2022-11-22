import { Euler, Quaternion, Vector3 } from 'three'

export default class Boid {
  public position = new Vector3()

  private velocity = new Vector3()
  private acceleration = new Vector3()

  public perceptionRadius = 5

  private alignFactor = 1
  private cohereFactor = 1
  private separateFactor = 1

  private baseMaxForce = 0.01
  private baseMaxSpeed = 0.15
  private maxForce = 0.01
  private maxSpeed = 0.15

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
      } else if (this.position[dim] < this.boundsStart[dim]) {
        this.position[dim] = this.boundsEnd[dim]
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
      steering.setLength(this.maxSpeed)
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
      steering.setLength(this.maxSpeed)
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
      steering.setLength(this.maxSpeed)
      steering.sub(this.velocity)
      steering.clampLength(0, this.maxForce)
    }

    steering.multiplyScalar(this.separateFactor)

    return steering
  }

  flock(boids: Boid[]): void {
    this.acceleration.add(this.separate(boids))
    this.acceleration.add(this.align(boids))
    this.acceleration.add(this.cohere(boids))
  }

  update(): void {
    this.position.add(this.velocity)
    this.velocity.add(this.acceleration)
    this.acceleration.multiplyScalar(0)
    this.velocity.setLength(this.maxSpeed)
  }

  setFactors(
    alignFactor: number,
    cohereFactor: number,
    separateFactor: number,
  ): void {
    this.alignFactor = alignFactor
    this.cohereFactor = cohereFactor
    this.separateFactor = separateFactor
  }

  setPerceptionRadius(perceptionRadius: number): void {
    this.perceptionRadius = perceptionRadius
  }

  setLimits(maxSpeedFactor: number, maxForceFactor: number): void {
    this.maxSpeed = this.baseMaxSpeed * maxSpeedFactor
    this.maxForce = this.baseMaxForce * maxForceFactor
  }
}
