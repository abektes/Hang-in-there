import * as THREE from 'three'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import { SURFACE_UNIFORMS, surfaceClock, surfaceGlsl } from '../utils/badgeSurface'
import { getSurface } from '../data/badgeStyles'

extend({ MeshLineGeometry, MeshLineMaterial })

const TAG_GLB =
  'https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/5huRVDzcoDwnbgrKUo1Lzs/53b6dd7d6b4ffcdbd338fa60265949e1/tag.glb'
const STEEL = '#aeb3ba'

// Card-body coordinates of the ring (tag.glb "clip", scaled 2.25 and offset -1.2):
// it spans y 1.32–1.57 and z -0.12–0.02. The band drops in front of the top bar,
// passes through the opening, and ends behind the bottom bar, so no cut edge shows.
const BAND_PATH = [
  [0, 1.335, -0.11],
  [0, 1.47, 0.03],
  [0, 1.72, 0.03],
]
const GATHER_LENGTH = 0.6
const GATHERED_WIDTH = 0.68

// ACES (the R3F default) greys the white stock and pushes the orange toward
// red; Neutral keeps brand colors true while still rolling off the gloss.
const GL_OPTIONS = { antialias: true, alpha: true, toneMapping: THREE.NeutralToneMapping }

useGLTF.preload(TAG_GLB)

function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

function createHemTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 32, 64)
  ctx.fillStyle = '#cfcfcf'
  ctx.fillRect(0, 0, 32, 5)
  ctx.fillRect(0, 59, 32, 5)
  ctx.fillStyle = '#e6e6e6'
  ctx.fillRect(0, 8, 18, 2)
  ctx.fillRect(0, 54, 18, 2)
  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.anisotropy = 8
  return texture
}

// The print layer (premultiplied) sits over the live surface shader; glow is
// added as emission so the pattern stays lit on the shaded side of the card,
// and it brightens toward grazing angles like a foil overprint.
function injectBadgeSurface(shader, uniforms, surface) {
  Object.assign(shader.uniforms, uniforms)
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${SURFACE_UNIFORMS}\n${surfaceGlsl(surface)}`)
    .replace(
      '#include <map_fragment>',
      `vec3 badgeBase;
      vec3 badgeGlowColor;
      badgeSurface(vMapUv, badgeBase, badgeGlowColor);
      vec4 badgeArt = texture2D(map, vMapUv);
      diffuseColor.rgb *= badgeBase * (1.0 - badgeArt.a) + badgeArt.rgb;`
    )
    .replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
      float badgeFacing = 1.0 - abs(dot(normalize(vViewPosition), normal));
      totalEmissiveRadiance += badgeGlowColor * (1.0 + badgeFacing * 0.6) * (1.0 - badgeArt.a);`
    )
}

function usePrefersReducedMotion() {
  const [reduceMotion, setReduceMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduceMotion(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduceMotion
}

/**
 * Port of Vercel’s finishing-touches sandbox (ym3p7h)
 * https://codesandbox.io/p/sandbox/ym3p7h
 * Swing comes from the offset drop + Rapier rope — not a scripted loop.
 */
export default function PhysicsShowcase({ badgeTexture, surface, lanyard, fallback }) {
  const reduceMotion = usePrefersReducedMotion()

  return (
    <Canvas
      camera={{ position: [0, 0, 13], fov: 25 }}
      dpr={[1, 2]}
      gl={GL_OPTIONS}
      style={{ background: 'transparent', touchAction: 'none' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      fallback={fallback}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[-4, 6, 6]} intensity={150} decay={2} />
      <directionalLight position={[4, -2, -6]} intensity={0.9} color="#ffe6d2" />
      <Physics interpolate gravity={[0, -40, 0]} timeStep={1 / 60}>
        <Band
          badgeTexture={badgeTexture}
          surface={surface}
          lanyard={lanyard}
          reduceMotion={reduceMotion}
        />
      </Physics>
      {/* Lights only — raycast off so Lightformers never steal card drag hits */}
      <Environment resolution={512} environmentIntensity={0.7}>
        <Lightformer form="rect" intensity={2.4} color="white" position={[-4, 5, 6]} scale={[7, 4, 1]} target={[0, 0, 0]} raycast={() => null} />
        <Lightformer form="rect" intensity={1.2} color="#fff4ea" position={[5, 1, 5]} scale={[3, 8, 1]} target={[0, 0, 0]} raycast={() => null} />
        <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} raycast={() => null} />
        <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} raycast={() => null} />
        <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} raycast={() => null} />
        <Lightformer intensity={3} color="white" position={[-10, 0, 8]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} raycast={() => null} />
        <Lightformer form="ring" intensity={1.5} color={getSurface(surface).accent} position={[6, -4, -8]} scale={6} target={[0, 0, 0]} raycast={() => null} />
      </Environment>
    </Canvas>
  )
}

function Band({
  badgeTexture,
  surface,
  lanyard,
  reduceMotion = false,
  angularDamping = 2,
  linearDamping = 2,
  lineWidth = 1,
  bandSegments = 96,
  maxSpeed = 50,
  minSpeed = 10,
}) {
  const band = useRef()
  const fixed = useRef()
  const j1 = useRef()
  const j2 = useRef()
  const j3 = useRef()
  const card = useRef()
  const vec = useRef(new THREE.Vector3())
  const ang = useRef(new THREE.Vector3())
  const rot = useRef(new THREE.Vector3())
  const dir = useRef(new THREE.Vector3())
  const cardQuat = useRef(new THREE.Quaternion())
  const [hemTexture] = useState(createHemTexture)
  const surfaceUniforms = useRef({
    uBadgeTime: { value: surfaceClock.time },
    uBadgeEnergy: { value: 0 },
    uBadgeLine: { value: 1 },
  })
  const energy = useRef(0)
  // Each surface compiles to its own program; the cache key keeps three.js
  // from reusing the previous style's shader after a switch.
  const onBadgeCompile = useCallback((shader) => injectBadgeSurface(shader, surfaceUniforms.current, surface), [surface])
  const badgeProgramKey = useCallback(() => `badge-surface-${surface}`, [surface])

  useEffect(() => () => hemTexture.dispose(), [hemTexture])

  // Same props as the sandbox — swing is from the horizontal drop settle
  const segmentProps = {
    type: 'dynamic',
    canSleep: true,
    colliders: false,
    angularDamping: reduceMotion ? 8 : angularDamping,
    linearDamping: reduceMotion ? 8 : linearDamping,
  }

  const { nodes, materials } = useGLTF(TAG_GLB)
  const { width, height } = useThree((state) => state.size)
  const [curve] = useState(() => {
    const c = new THREE.CatmullRomCurve3(
      Array.from({ length: BAND_PATH.length + 3 }, () => new THREE.Vector3())
    )
    c.curveType = 'chordal'
    return c
  })
  const [dragged, drag] = useState(false)
  const [hovered, hover] = useState(false)

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.45, 0]])

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab'
      return () => {
        document.body.style.cursor = 'auto'
      }
    }
  }, [hovered, dragged])

  useFrame((state, delta) => {
    if (dragged) {
      vec.current.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.current.copy(vec.current).sub(state.camera.position).normalize()
      vec.current.add(dir.current.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp())
      card.current?.setNextKinematicTranslation({
        x: vec.current.x - dragged.x,
        y: vec.current.y - dragged.y,
        z: vec.current.z - dragged.z,
      })
    }

    if (fixed.current) {
      // Fix most of the jitter when over-pulling the card (sandbox)
      ;[j1, j2].forEach((ref) => {
        if (!ref.current) return
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation())
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())))
        ref.current.lerped.lerp(
          ref.current.translation(),
          Math.min(1, delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed)))
        )
      })

      // j3 sits inside the ring, so card-fixed points replace it: the band
      // leaves the ring along the card's own axis instead of kinking at the joint.
      const t = card.current.translation()
      const r = card.current.rotation()
      cardQuat.current.set(r.x, r.y, r.z, r.w)
      BAND_PATH.forEach(([x, y, z], index) => {
        curve.points[index].set(x, y, z).applyQuaternion(cardQuat.current).add(t)
      })
      curve.points[BAND_PATH.length].copy(j2.current.lerped)
      curve.points[BAND_PATH.length + 1].copy(j1.current.lerped)
      curve.points[BAND_PATH.length + 2].copy(fixed.current.translation())

      const gather = Math.min(0.35, GATHER_LENGTH / curve.getLength())
      band.current.geometry.setPoints(curve.getPoints(bandSegments), (progress) =>
        progress >= gather
          ? 1
          : GATHERED_WIDTH + (1 - GATHERED_WIDTH) * smoothstep(progress / gather)
      )

      // Swinging the badge stirs the field: it flows faster and the index
      // lines brighten, then settle back once the card comes to rest.
      const lv = card.current.linvel()
      const av = card.current.angvel()
      const speed = Math.hypot(lv.x, lv.y, lv.z) + 0.35 * Math.hypot(av.x, av.y, av.z)
      const target = reduceMotion ? 0 : Math.min(1, speed / 6)
      energy.current += (target - energy.current) * Math.min(1, delta * (target > energy.current ? 6 : 1.2))
      if (!reduceMotion) surfaceClock.time += delta * (0.35 + energy.current * 2.2)
      surfaceUniforms.current.uBadgeTime.value = surfaceClock.time
      surfaceUniforms.current.uBadgeEnergy.value = energy.current

      // Tilt it back towards the screen
      ang.current.copy(card.current.angvel())
      rot.current.copy(card.current.rotation())
      card.current.setAngvel({
        x: ang.current.x,
        y: ang.current.y - rot.current.y * 0.25,
        z: ang.current.z,
      })
    }
  })

  const cardMap = badgeTexture ?? materials.base.map

  function startDrag(e) {
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    drag(new THREE.Vector3().copy(e.point).sub(vec.current.copy(card.current.translation())))
  }

  function endDrag(e) {
    e.stopPropagation()
    e.target.releasePointerCapture(e.pointerId)
    drag(false)
  }

  return (
    <>
      <group position={[0, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[reduceMotion ? 0 : 0.12, -1, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[reduceMotion ? 0 : 0.24, -2, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[reduceMotion ? 0 : 0.36, -3, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[reduceMotion ? 0 : 0.36, -4.45, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? 'kinematicPosition' : 'dynamic'}
        >
          <CuboidCollider args={[0.8, 1.125, 0.01]} />
          <group scale={2.25} position={[0, -1.2, -0.05]}>
            <mesh
              geometry={nodes.card.geometry}
              onPointerOver={() => hover(true)}
              onPointerOut={() => hover(false)}
              onPointerDown={startDrag}
              onPointerUp={endDrag}
            >
              {/* Laminated PVC: the shader is the printed stock, under a glossy
                  clearcoat with a faint holographic film. */}
              {badgeTexture ? (
                <meshPhysicalMaterial
                  key={`badge-${surface}`}
                  map={cardMap}
                  onBeforeCompile={onBadgeCompile}
                  customProgramCacheKey={badgeProgramKey}
                  roughness={0.5}
                  metalness={0}
                  specularIntensity={0.4}
                  iridescence={0.22}
                  iridescenceIOR={1.4}
                  iridescenceThicknessRange={[260, 680]}
                  clearcoat={1}
                  clearcoatRoughness={0.05}
                />
              ) : (
                <meshPhysicalMaterial
                  key="model"
                  map={cardMap}
                  roughness={0.45}
                  metalness={0}
                  clearcoat={1}
                  clearcoatRoughness={0.1}
                />
              )}
            </mesh>
            <mesh geometry={nodes.clip.geometry} onPointerDown={startDrag} onPointerUp={endDrag}>
              <meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.28} />
            </mesh>
            <mesh geometry={nodes.clamp.geometry} onPointerDown={startDrag} onPointerUp={endDrag}>
              <meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.34} />
            </mesh>
          </group>
        </RigidBody>
      </group>
      <mesh ref={band} raycast={() => null}>
        <meshLineGeometry />
        <meshLineMaterial
          color={lanyard}
          map={hemTexture}
          useMap={1}
          repeat={[36, 1]}
          resolution={[width, height]}
          lineWidth={lineWidth}
        />
      </mesh>
    </>
  )
}
