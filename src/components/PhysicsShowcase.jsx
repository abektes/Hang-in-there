import * as THREE from 'three'
import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, extend, useThree, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { BallCollider, Physics, RigidBody, interactionGroups, useRopeJoint, useSphericalJoint } from '@react-three/rapier'
import { MeshLineGeometry, MeshLineMaterial } from 'meshline'

extend({ MeshLineGeometry, MeshLineMaterial })
useGLTF.preload('https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/5huRVDzcoDwnbgrKUo1Lzs/53b6dd7d6b4ffcdbd338fa60265949e1/tag.glb')

const themes = {
  light: {
    clip: '#2a2a2a',
    lanyard: '#1a1a1a',
    lights: ['#ffffff', '#e8e8e8', '#d4d4d4'],
  },
  dark: {
    clip: '#00f3ff',
    lanyard: '#ff007f',
    lights: ['#00f3ff', '#ff007f', '#ff007f'],
  },
}

const EMBEDDED_ANCHOR = [0.5, 4, 0]
const ROPE_COLLISION = interactionGroups(1, [1])

function shiftPosition([x, y, z], embedded) {
  if (!embedded) return [x, y, z]
  return [x + EMBEDDED_ANCHOR[0], y + EMBEDDED_ANCHOR[1], z + EMBEDDED_ANCHOR[2]]
}

export default function PhysicsShowcase({ badgeTexture, variant = 'light', embedded = false }) {
  const theme = themes[variant] ?? themes.light

  return (
    <Canvas
      camera={{ position: [0, 0, 13.5], fov: 25 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      {embedded && <EmbeddedRig />}
      <ambientLight intensity={Math.PI * 0.55} />
      <Physics interpolate gravity={[0, -40, 0]} timeStep={1 / 60}>
        <Band badgeTexture={badgeTexture} theme={theme} embedded={embedded} />
      </Physics>

      <Environment blur={0.75}>
        <Lightformer intensity={12} color={theme.lights[0]} position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.2, 1]} />
        <Lightformer intensity={8} color={theme.lights[1]} position={[-3, -1, 2]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.2, 1]} />
        <Lightformer intensity={8} color={theme.lights[2]} position={[3, 1, 2]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.2, 1]} />
        <Lightformer intensity={16} color="#ffffff" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
      </Environment>
    </Canvas>
  )
}

function EmbeddedRig() {
  const { camera } = useThree()
  useEffect(() => {
    camera.position.set(-0.65, -0.55, 13.5)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

function Band({ badgeTexture, theme, embedded = false, maxSpeed = 50, minSpeed = 0 }) {
  const band = useRef()
  const clipMesh = useRef()
  const fixed = useRef()
  const j1 = useRef()
  const j2 = useRef()
  const j3 = useRef()
  const card = useRef()
  const vec = new THREE.Vector3()
  const ang = new THREE.Vector3()
  const rot = new THREE.Vector3()
  const dir = new THREE.Vector3()

  const segmentProps = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 }
  const { nodes, materials } = useGLTF('https://assets.vercel.com/image/upload/contentful/image/e5382hct74si/5huRVDzcoDwnbgrKUo1Lzs/53b6dd7d6b4ffcdbd338fa60265949e1/tag.glb')
  const cardScaleY = 1.25

  const layout = useMemo(
    () => ({
      fixed: shiftPosition([0, 0, 0], embedded),
      j1: shiftPosition([0.5, 0, 0], embedded),
      j2: shiftPosition([1, 0, 0], embedded),
      j3: shiftPosition([1.5, 0, 0], embedded),
      card: shiftPosition([2, 0, 0], embedded),
    }),
    [embedded]
  )

  const { width, height } = useThree((state) => state.size)
  const [curve] = useState(() => {
    const c = new THREE.CatmullRomCurve3([
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

  useEffect(() => {
    if (!badgeTexture) return
    badgeTexture.flipY = false
    badgeTexture.anisotropy = 16
    badgeTexture.needsUpdate = true
  }, [badgeTexture])

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1])
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 1.5, 0]])

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab'
      return () => { document.body.style.cursor = 'auto' }
    }
  }, [hovered, dragged])

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(vec).sub(state.camera.position).normalize()
      vec.add(dir.multiplyScalar(state.camera.position.length()))
      ;[card, j1, j2, j3, fixed].forEach((ref) => ref.current?.wakeUp())
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z })
    }

    if (fixed.current && band.current && j3.current && j2.current && j1.current && card.current) {
      ;[j1, j2].forEach((ref) => {
        if (!ref.current) return
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation())
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())))
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        )
      })

      if (clipMesh.current) {
        clipMesh.current.getWorldPosition(curve.points[0])
      } else {
        curve.points[0].copy(j3.current.translation())
      }
      curve.points[1].copy(j2.current.lerped)
      curve.points[2].copy(j1.current.lerped)
      curve.points[3].copy(fixed.current.translation())
      band.current.geometry.setPoints(curve.getPoints(32))

      ang.copy(card.current.angvel())
      rot.copy(card.current.rotation())
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z })
    }
  })

  return (
    <>
      <RigidBody ref={fixed} {...segmentProps} type="fixed" position={layout.fixed} />
      <RigidBody position={layout.j1} ref={j1} {...segmentProps}>
        <BallCollider args={[0.1]} collisionGroups={ROPE_COLLISION} />
      </RigidBody>
      <RigidBody position={layout.j2} ref={j2} {...segmentProps}>
        <BallCollider args={[0.1]} collisionGroups={ROPE_COLLISION} />
      </RigidBody>
      <RigidBody position={layout.j3} ref={j3} {...segmentProps}>
        <BallCollider args={[0.1]} collisionGroups={ROPE_COLLISION} />
      </RigidBody>
      <RigidBody position={layout.card} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
        <group
          scale={2.25}
          position={[0, -0.95, -0.05]}
          onPointerOver={() => hover(true)}
          onPointerOut={() => hover(false)}
          onPointerUp={(e) => (e.target.releasePointerCapture(e.pointerId), drag(false))}
          onPointerDown={(e) => {
            e.target.setPointerCapture(e.pointerId)
            drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
          }}>
          <mesh geometry={nodes.card.geometry} scale={[1, cardScaleY, 1]} position={[0, (1 - cardScaleY) * 0.9, 0]}>
            <meshPhysicalMaterial
              map={badgeTexture}
              clearcoat={0.6}
              clearcoatRoughness={0.1}
              roughness={0.35}
              metalness={0.15}
            />
          </mesh>
          <mesh
            ref={clipMesh}
            geometry={nodes.clip.geometry}
            material={materials.metal}
            material-roughness={0.2}
            material-metalness={0.85}
            material-color={theme.clip}
          />
          <mesh geometry={nodes.clamp.geometry} material={materials.metal} material-roughness={0.2} material-metalness={0.85} material-color={theme.clip} />
        </group>
      </RigidBody>

      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color={theme.lanyard}
          depthTest={false}
          resolution={[width, height]}
          lineWidth={1}
        />
      </mesh>
    </>
  )
}
