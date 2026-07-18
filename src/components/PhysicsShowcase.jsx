import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, useGLTF } from '@react-three/drei'
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'
import { useControls } from 'leva'

extend({ MeshLineGeometry, MeshLineMaterial })

const TAG_GLB =
  'https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/5huRVDzcoDwnbgrKUo1Lzs/53b6dd7d6b4ffcdbd338fa60265949e1/tag.glb'
const ELSEVIER_ORANGE = '#FF6C00'

useGLTF.preload(TAG_GLB)

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
export default function PhysicsShowcase({ badgeTexture }) {
  const reduceMotion = usePrefersReducedMotion()

  // Leva panel (same as Vercel sandbox) — play with Rapier live
  const { debug, gravity, angularDamping, linearDamping, lineWidth, bandSegments, maxSpeed, minSpeed } = useControls('Badge physics', {
    debug: false,
    gravity: { value: -40, min: -80, max: 0, step: 1 },
    angularDamping: { value: 2, min: 0, max: 10, step: 0.1 },
    linearDamping: { value: 2, min: 0, max: 10, step: 0.1 },
    lineWidth: { value: 1, min: 0.2, max: 3, step: 0.1 },
    bandSegments: { value: 96, min: 32, max: 192, step: 8 },
    maxSpeed: { value: 50, min: 1, max: 100, step: 1 },
    minSpeed: { value: 10, min: 1, max: 50, step: 1 },
  })

  return (
    <Canvas
      camera={{ position: [0, 0, 13], fov: 25 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent', touchAction: 'none' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ambientLight intensity={Math.PI} />
      <Physics debug={debug} interpolate gravity={[0, gravity, 0]} timeStep={1 / 60}>
        <Band
          badgeTexture={badgeTexture}
          reduceMotion={reduceMotion}
          angularDamping={angularDamping}
          linearDamping={linearDamping}
          lineWidth={lineWidth}
          bandSegments={bandSegments}
          maxSpeed={maxSpeed}
          minSpeed={minSpeed}
        />
      </Physics>
      {/* Lights only — raycast off so Lightformers never steal card drag hits */}
      <Environment blur={0.75}>
        <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} raycast={() => null} />
        <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} raycast={() => null} />
        <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} raycast={() => null} />
        <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} raycast={() => null} />
      </Environment>
    </Canvas>
  )
}

function Band({
  badgeTexture,
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
  const clipAnchor = useRef(new THREE.Vector3())
  const cardQuat = useRef(new THREE.Quaternion())

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
  // Extra control point at the clip so the MeshLine end tucks into the metal (hides end triangles)
  const [curve] = useState(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ])
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
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        )
      })

      // Tuck band end into the clip hole (joint anchor on card is [0, 1.45, 0];
      // push a bit further in so MeshLine's end triangles sit inside the metal)
      const t = card.current.translation()
      const r = card.current.rotation()
      cardQuat.current.set(r.x, r.y, r.z, r.w)
      clipAnchor.current.set(0, 1.35, 0).applyQuaternion(cardQuat.current).add(t)

      curve.points[0].copy(clipAnchor.current)
      curve.points[1].copy(j3.current.translation())
      curve.points[2].copy(j2.current.lerped)
      curve.points[3].copy(j1.current.lerped)
      curve.points[4].copy(fixed.current.translation())
      band.current.geometry.setPoints(curve.getPoints(bandSegments))

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
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
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
              <meshPhysicalMaterial
                map={cardMap}
                map-anisotropy={16}
                clearcoat={1}
                clearcoatRoughness={0.15}
                roughness={0.3}
                metalness={0.5}
              />
            </mesh>
            <mesh
              geometry={nodes.clip.geometry}
              material={materials.metal}
              material-roughness={0.3}
              onPointerDown={startDrag}
              onPointerUp={endDrag}
            />
            <mesh
              geometry={nodes.clamp.geometry}
              material={materials.metal}
              onPointerDown={startDrag}
              onPointerUp={endDrag}
            />
          </group>
        </RigidBody>
      </group>
      <mesh ref={band} raycast={() => null}>
        <meshLineGeometry />
        <meshLineMaterial
          color={ELSEVIER_ORANGE}
          depthTest={false}
          resolution={[width, height]}
          lineWidth={lineWidth}
        />
      </mesh>
    </>
  )
}
