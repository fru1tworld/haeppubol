import * as THREE from 'three'

export const pastelColor = (): THREE.Color =>
  new THREE.Color().setHSL(Math.random(), 0.4 + Math.random() * 0.3, 0.7 + Math.random() * 0.2)
