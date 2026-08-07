import * as THREE from 'three'

// 얼굴 데칼. 사진을 볼의 로컬 좌표계에 정사영으로 투영한다.
// 로컬이라 공을 돌려도 얼굴은 그 자리에 붙어 있고, 프래그먼트에서
// normalize(position)을 쓰므로 깨지면 조각나고 눌리면 같이 구겨진다.
// wakbboolball-3d 레퍼런스 v2의 hookFace/makeFaceTexture 이식.

export interface FaceUniforms {
  map: { value: THREE.Texture | null }
  on: { value: number }
  /** 붙일 당시의 볼 회전 — 이 축을 정면으로 본다 */
  mat: { value: THREE.Matrix3 }
  scale: { value: number }
  bright: { value: number }
  contrast: { value: number }
}

export const createFaceUniforms = (): FaceUniforms => ({
  map: { value: null },
  on: { value: 0 },
  mat: { value: new THREE.Matrix3() },
  scale: { value: 0.9 },
  // 레퍼런스 기본값(0.34)은 흰 왁스 위 기준이라 사진이 너무 어둡게 눌린다.
  // 말랑이 위에 반투명하게 얹는 용도라 노출을 올리고 대비는 낮춘다.
  bright: { value: 0.62 },
  contrast: { value: 1.12 },
})

/** 지금 보이는 면에 얼굴을 붙인다 */
export const aimFace = (face: FaceUniforms, quaternion: THREE.Quaternion): void => {
  face.mat.value.setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(quaternion))
}

/**
 * 재질 셰이더에 얼굴 투영을 끼워 넣는다.
 * expBias: 얼굴 영역 노출 보정(클레이는 왁스보다 밝게 받아 1.9 정도).
 */
export const hookFace = (
  mat: THREE.Material,
  face: FaceUniforms,
  strength: { value: number },
  expBias: number,
): void => {
  mat.onBeforeCompile = sh => {
    sh.uniforms.faceMap = face.map
    sh.uniforms.faceOn = face.on
    sh.uniforms.faceMat = face.mat
    sh.uniforms.faceScale = face.scale
    sh.uniforms.faceStrength = strength
    sh.uniforms.faceExposure = face.bright
    sh.uniforms.faceContrast = face.contrast
    sh.uniforms.faceExpBias = { value: expBias }

    sh.vertexShader = `varying vec3 vFaceDir;\n${sh.vertexShader}`.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n  vFaceDir = normalize( position );',
    )

    sh.fragmentShader = `
uniform sampler2D faceMap;
uniform float faceOn;
uniform mat3 faceMat;
uniform float faceScale;
uniform float faceStrength;
uniform float faceExposure;
uniform float faceContrast;
uniform float faceExpBias;
varying vec3 vFaceDir;
float gFaceW;
${sh.fragmentShader}`
      .replace('#include <color_fragment>', `#include <color_fragment>
      gFaceW = 0.0;
      if ( faceOn > 0.5 && faceStrength > 0.001 ) {
        vec3 fd = faceMat * normalize( vFaceDir );
        if ( fd.z > 0.01 ) {
          vec2 fuv = fd.xy / faceScale * 0.5 + 0.5;
          if ( fuv.x > 0.0 && fuv.x < 1.0 && fuv.y > 0.0 && fuv.y < 1.0 ) {
            vec4 fc = texture2D( faceMap, fuv );
            gFaceW = smoothstep( 0.01, 0.26, fd.z ) * fc.a * faceStrength;
            vec3 fcol = clamp( ( fc.rgb - 0.5 ) * faceContrast + 0.5, 0.0, 1.0 );
            diffuseColor.rgb = mix( diffuseColor.rgb, fcol, gFaceW );
          }
        }
      }`)
      // 얼굴이 씻겨 나가는 원인은 알베도가 아니라 광택이다. 얼굴 영역만 매트하게.
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix( roughnessFactor, 0.88, gFaceW * 0.92 );`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      #if defined( USE_CLEARCOAT ) || defined( CLEARCOAT )
        material.clearcoat = mix( material.clearcoat, 0.03, gFaceW * 0.95 );
      #endif`)
      // 잉크는 흰 왁스보다 빛을 덜 되쏜다. 얼굴 영역만 노출을 낮춰 하얗게 뜨는 걸 막는다.
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
      {
        float fe = mix( 1.0, clamp( faceExposure * faceExpBias, 0.02, 2.0 ), gFaceW );
        reflectedLight.directDiffuse    *= fe;
        reflectedLight.indirectDiffuse  *= fe;
        reflectedLight.directSpecular   *= mix( 1.0, 0.22, gFaceW );
        reflectedLight.indirectSpecular *= mix( 1.0, 0.12, gFaceW );
      }`)
  }
  mat.needsUpdate = true
}

const FACE_SIZE = 512

/** 가운데를 꽉 채우고 가장자리는 눕혀서 "인쇄된" 느낌으로 만든다 */
export const makeFaceTexture = (img: HTMLImageElement): THREE.CanvasTexture => {
  const c = document.createElement('canvas')
  c.width = c.height = FACE_SIZE
  const g = c.getContext('2d')!
  const iw = img.naturalWidth || img.width
  const ih = img.naturalHeight || img.height
  const r = Math.max(FACE_SIZE / iw, FACE_SIZE / ih)
  const w = iw * r
  const h = ih * r

  g.filter = 'contrast(1.06) saturate(1.14)'
  g.drawImage(img, (FACE_SIZE - w) / 2, (FACE_SIZE - h) / 2, w, h)
  g.filter = 'none'

  g.globalCompositeOperation = 'destination-in'
  const rg = g.createRadialGradient(
    FACE_SIZE / 2, FACE_SIZE / 2, FACE_SIZE * 0.2,
    FACE_SIZE / 2, FACE_SIZE / 2, FACE_SIZE * 0.5,
  )
  rg.addColorStop(0, 'rgba(0,0,0,1)')
  rg.addColorStop(0.7, 'rgba(0,0,0,1)')
  rg.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = rg
  g.fillRect(0, 0, FACE_SIZE, FACE_SIZE)
  g.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
