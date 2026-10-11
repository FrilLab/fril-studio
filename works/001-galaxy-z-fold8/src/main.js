import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/loaders/GLTFLoader.js'

const canvas = document.querySelector('#fold8-canvas')
const loadingScreen = document.querySelector('#loading-screen')
const loadingTitle = document.querySelector('#loading-title')
const loadingPercent = document.querySelector('#loading-percent')
const loadingBar = document.querySelector('#loading-bar')
const failureScreen = document.querySelector('#failure-screen')
const failureDetail = document.querySelector('#failure-detail')

const REQUIRED_NODES = [
  'GalaxyZFold8',
  'HingeRoot',
  'LeftBody',
  'LeftBodyPivot',
  'RightBody',
  'RightBodyPivot',
  'Screen_Main_Left',
  'Screen_Main_Right',
  'Screen_Cover',
  'CameraAssembly',
]
const MODEL_URL = './assets/model/exported/galaxy-z-fold8.glb'
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
const clearColor = new THREE.Color('#050607')

let renderer
let camera
let model
let presentation
let leftPivot
let rightPivot
let cameraAssembly
let cameraFocusLocal
let modelBoundsSize
let starfield
let distantStars
let nearStars
let baseDistance = 0.3
let targetProgress = 0
let currentProgress = 0
let lastFrameTime = 0
let failed = false

const cameraLookTarget = new THREE.Vector3()
const cameraFocusWorld = new THREE.Vector3()
const desiredCameraPosition = new THREE.Vector3()
const worldCenter = new THREE.Vector3()
const modelBox = new THREE.Box3()
const cameraSize = new THREE.Vector3()

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

function lerp(start, end, amount) {
  return start + (end - start) * amount
}

function smoothstep(value) {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}

function rangeProgress(value, start, end) {
  return clamp((value - start) / (end - start))
}

function setLoadProgress(value) {
  const percentage = Math.round(clamp(value) * 100)
  loadingPercent.textContent = `${percentage}%`
  loadingBar.style.width = `${percentage}%`
}

function showFailure(message) {
  if (failed) return
  failed = true
  console.error(`[Fril Studio / 001] ${message}`)
  loadingScreen.classList.add('is-hidden')
  failureDetail.textContent = message
  failureScreen.hidden = false
  canvas.classList.remove('is-ready')
}

function createRenderer() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setClearColor(clearColor, 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  resizeRenderer()

  const scene = new THREE.Scene()
  scene.background = clearColor

  const fill = new THREE.HemisphereLight(0xcbd7e3, 0x11151a, 1.25)
  scene.add(fill)

  const key = new THREE.DirectionalLight(0xf2f5ff, 3.2)
  key.position.set(-0.16, 0.2, 0.26)
  scene.add(key)

  const rim = new THREE.DirectionalLight(0x94aeca, 3.5)
  rim.position.set(0.18, 0.12, -0.2)
  scene.add(rim)

  const edgeFill = new THREE.DirectionalLight(0x8393a3, 0.75)
  edgeFill.position.set(0.2, -0.08, 0.12)
  scene.add(edgeFill)

  camera = new THREE.PerspectiveCamera(33, window.innerWidth / window.innerHeight, 0.01, 8)
  scene.add(camera)
  createStarfield(scene)

  presentation = new THREE.Group()
  scene.add(presentation)

  return scene
}

function resizeRenderer() {
  if (!renderer) return
  const width = window.innerWidth
  const height = window.innerHeight
  const compact = width < 700
  const pixelRatio = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2)

  renderer.setPixelRatio(pixelRatio)
  renderer.setSize(width, height, false)

  if (camera) {
    camera.aspect = width / height
    camera.fov = compact ? 39 : 33
    camera.updateProjectionMatrix()
    if (modelBoundsSize) baseDistance = calculateFitDistance(modelBoundsSize)
  }
  updateTargetProgress()
}

function seededRandom(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function createStarLayer({ count, depth, size, opacity, seed, color }) {
  const random = seededRandom(seed)
  const positions = new Float32Array(count * 3)

  for (let index = 0; index < count; index += 1) {
    const offset = index * 3
    positions[offset] = (random() - 0.5) * 4.8
    positions[offset + 1] = (random() - 0.5) * 3.2
    positions[offset + 2] = (random() - 0.5) * 0.16
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

  const material = new THREE.PointsMaterial({
    color,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geometry, material)
  points.position.z = depth
  points.renderOrder = -1
  return points
}

function createStarfield(scene) {
  starfield = new THREE.Group()
  starfield.name = 'FrilStarfield'
  distantStars = createStarLayer({
    count: 240,
    depth: -2.4,
    size: 0.0027,
    opacity: 0.28,
    seed: 1701,
    color: '#9eafc1',
  })
  nearStars = createStarLayer({
    count: 52,
    depth: -1.45,
    size: 0.0032,
    opacity: 0.22,
    seed: 803,
    color: '#d0d6dc',
  })

  starfield.add(distantStars, nearStars)
  scene.add(starfield)
}

function calculateFitDistance(size) {
  const verticalFov = THREE.MathUtils.degToRad(camera.fov)
  const halfHeightAtUnitDepth = Math.tan(verticalFov / 2)
  const aspect = Math.max(camera.aspect, 0.25)
  const heightDistance = size.y / (2 * halfHeightAtUnitDepth * 0.66)
  const widthDistance = size.x / (2 * halfHeightAtUnitDepth * aspect * 0.86)
  return Math.max(heightDistance, widthDistance, size.z * 5, 0.18)
}

function validateRuntimeNodes(root) {
  const nodes = new Map(REQUIRED_NODES.map((name) => [name, root.getObjectByName(name)]))
  const missing = [...nodes.entries()].filter(([, node]) => !node).map(([name]) => name)

  for (const name of ['Screen_Main_Left', 'Screen_Main_Right', 'Screen_Cover']) {
    const node = nodes.get(name)
    let hasMesh = false
    node?.traverse((child) => {
      if (child.isMesh) hasMesh = true
    })
    if (!hasMesh) missing.push(`${name} mesh`)
  }

  if (missing.length) {
    throw new Error(`The GLB is missing required runtime nodes: ${missing.join(', ')}.`)
  }

  if (
    nodes.get('LeftBody').parent !== nodes.get('LeftBodyPivot') ||
    nodes.get('RightBody').parent !== nodes.get('RightBodyPivot') ||
    nodes.get('LeftBodyPivot').parent !== nodes.get('HingeRoot') ||
    nodes.get('RightBodyPivot').parent !== nodes.get('HingeRoot')
  ) {
    throw new Error('The GLB runtime hierarchy does not preserve the hinge-centered body pivots.')
  }

  console.info(
    `[Fril Studio / 001] Runtime nodes resolved: ${REQUIRED_NODES.join(', ')}; ` +
    'body pivots, screens, and camera assembly are available in the generated GLB.',
  )
  return nodes
}

function prepareModel(gltf) {
  model = gltf.scene.getObjectByName('GalaxyZFold8')
  if (!model) throw new Error('The generated GLB is missing its GalaxyZFold8 asset root.')

  // The exported asset has width on X, thickness on Y, and height on Z. Rotate
  // only the asset root so Three.js uses Y-up while preserving its child pivots.
  model.rotation.x = Math.PI / 2
  model.updateMatrixWorld(true)
  const nodes = validateRuntimeNodes(model)
  leftPivot = nodes.get('LeftBodyPivot')
  rightPivot = nodes.get('RightBodyPivot')
  cameraAssembly = nodes.get('CameraAssembly')

  model.updateMatrixWorld(true)
  modelBox.setFromObject(model)
  modelBox.getCenter(worldCenter)
  modelBox.getSize(cameraSize)
  model.position.sub(worldCenter)
  modelBoundsSize = cameraSize.clone()

  leftPivot.rotation.set(0, 0, 0)
  rightPivot.rotation.set(0, 0, 0)
  presentation.add(model)
  model.updateMatrixWorld(true)

  const cameraBounds = new THREE.Box3().setFromObject(cameraAssembly)
  if (cameraBounds.isEmpty()) throw new Error('The generated GLB camera assembly has no geometry.')
  cameraFocusLocal = cameraAssembly.worldToLocal(cameraBounds.getCenter(new THREE.Vector3()))

  baseDistance = calculateFitDistance(modelBoundsSize)
  // Blender's hinge axis exports as the model's local Z axis.
  leftPivot.rotation.z = Math.PI
  model.updateMatrixWorld(true)
  updateTargetProgress()

  canvas.classList.add('is-ready')
  loadingScreen.classList.add('is-hidden')
  requestAnimationFrame(animate)
}

function updateTargetProgress() {
  const maxScroll = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0)
  targetProgress = maxScroll > 0 ? clamp(window.scrollY / maxScroll) : 0
}

function updateExperience(deltaSeconds, elapsedSeconds) {
  if (!model) return

  if (reducedMotion.matches) {
    currentProgress = targetProgress
  } else {
    const damping = 8.5
    currentProgress += (targetProgress - currentProgress) * (1 - Math.exp(-damping * deltaSeconds))
  }

  const progress = currentProgress
  const unfold = smoothstep(rangeProgress(progress, 0.18, 0.405))
  const foldRadians = Math.PI * (1 - unfold)
  leftPivot.rotation.z = foldRadians
  // The opposite leaf keeps its independent runtime pivot and stays still.

  const productMotion = smoothstep(rangeProgress(progress, 0.4, 0.6))
  const cameraTurn = smoothstep(rangeProgress(progress, 0.57, 0.70))
  const displayReturn = smoothstep(rangeProgress(progress, 0.72, 0.88))

  let yaw = lerp(0, 0.06, unfold)
  yaw = lerp(yaw, 0.22, productMotion)
  yaw = lerp(yaw, Math.PI, cameraTurn)
  yaw = lerp(yaw, 0, displayReturn)

  const pitch = reducedMotion.matches ? 0 : 0.025 * Math.sin(productMotion * Math.PI)
  presentation.rotation.set(pitch, yaw, 0)
  presentation.position.y = reducedMotion.matches ? 0 : Math.sin(elapsedSeconds * 0.65) * 0.0011
  presentation.updateMatrixWorld(true)

  const starDrift = reducedMotion.matches ? 0 : elapsedSeconds
  distantStars.rotation.z = starDrift * 0.00042
  nearStars.rotation.z = -starDrift * 0.00058

  cameraLookTarget.set(0, 0, 0)
  cameraAssembly.localToWorld(cameraFocusWorld.copy(cameraFocusLocal))
  cameraLookTarget.lerp(cameraFocusWorld, cameraTurn * (1 - displayReturn))

  const closeDistance = Math.max(modelBoundsSize.y * 1.0, 0.1)
  const displayDistance = Math.max(baseDistance * 0.84, baseDistance * 0.78)
  let distance = lerp(baseDistance, closeDistance, cameraTurn)
  distance = lerp(distance, displayDistance, displayReturn)

  const outro = smoothstep(rangeProgress(progress, 0.94, 1))
  distance = lerp(distance, baseDistance * 1.12, outro)
  const cameraX = reducedMotion.matches ? 0 : 0.025
  const cameraY = reducedMotion.matches ? 0 : 0.012
  desiredCameraPosition.set(
    cameraLookTarget.x + cameraX * distance,
    cameraLookTarget.y + cameraY * distance,
    cameraLookTarget.z + distance,
  )

  const cameraDamping = reducedMotion.matches ? 1 : 1 - Math.exp(-5.5 * deltaSeconds)
  camera.position.lerp(desiredCameraPosition, cameraDamping)
  camera.lookAt(cameraLookTarget)

  const outroDim = 1 - outro * 0.48
  canvas.style.opacity = String(outroDim)
}

function animate(timestamp) {
  if (failed || !renderer) return

  const elapsedSeconds = timestamp / 1000
  const deltaSeconds = lastFrameTime
    ? Math.min((timestamp - lastFrameTime) / 1000, 0.05)
    : 1 / 60
  lastFrameTime = timestamp

  updateExperience(deltaSeconds, elapsedSeconds)
  renderer.render(activeScene, camera)
  requestAnimationFrame(animate)
}

let activeScene
try {
  activeScene = createRenderer()
} catch (error) {
  showFailure(`WebGL could not start in this browser. ${error instanceof Error ? error.message : ''}`.trim())
}

if (activeScene) {
  const manager = new THREE.LoadingManager()
  manager.onProgress = (_url, loaded, total) => {
    if (total > 0) setLoadProgress(loaded / total)
  }
  manager.onError = (url) => {
    showFailure(`A required file could not be loaded: ${url}`)
  }

  const loader = new GLTFLoader(manager)
  loadingTitle.textContent = 'LOADING'
  loader.load(
    MODEL_URL,
    (gltf) => {
      try {
        prepareModel(gltf)
      } catch (error) {
        showFailure(error instanceof Error ? error.message : 'The GLB could not be prepared.')
      }
    },
    (event) => {
      if (event.total > 0) setLoadProgress(event.loaded / event.total)
    },
    (error) => {
      const detail = error instanceof Error ? error.message : 'Check the GLB URL and try again.'
      showFailure(`The Fold8 GLB failed to load. ${detail}`)
    },
  )
}

window.addEventListener('scroll', updateTargetProgress, { passive: true })
window.addEventListener('resize', resizeRenderer, { passive: true })
reducedMotion.addEventListener?.('change', () => {
  if (reducedMotion.matches) currentProgress = targetProgress
})
