import * as THREE from 'three'

import { Effect } from 'postprocessing'

import fragmentShader from './PixelPPEffect.glsl'

const texture = new THREE.TextureLoader().load('./dither.png')

texture.minFilter = THREE.NearestFilter
texture.magFilter = THREE.NearestFilter

export default class PixelPPEffect extends Effect {
  constructor() {
    super('PixelEffect', fragmentShader, {
      uniforms: new Map([
        ['uPixelSize', new THREE.Uniform(4.0)],
        ['uDitherMap', new THREE.Uniform(texture)],
      ]),
    })
  }
}
