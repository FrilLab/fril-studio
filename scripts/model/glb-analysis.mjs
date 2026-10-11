import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'

const GLB_MAGIC = 0x46546c67
const JSON_CHUNK = 0x4e4f534a
const BINARY_CHUNK = 0x004e4942
const TEXTURE_SLOTS = [
  'baseColorTexture',
  'metallicRoughnessTexture',
  'normalTexture',
  'occlusionTexture',
  'emissiveTexture',
]

function multiplyMatrices(left, right) {
  const result = new Array(16).fill(0)
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1) {
        result[column * 4 + row] += left[index * 4 + row] * right[column * 4 + index]
      }
    }
  }
  return result
}

function composeTransform(node) {
  if (node.matrix) return node.matrix

  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1]
  const [sx, sy, sz] = node.scale ?? [1, 1, 1]
  const [tx, ty, tz] = node.translation ?? [0, 0, 0]
  const x2 = x + x
  const y2 = y + y
  const z2 = z + z
  const xx = x * x2
  const xy = x * y2
  const xz = x * z2
  const yy = y * y2
  const yz = y * z2
  const zz = z * z2
  const wx = w * x2
  const wy = w * y2
  const wz = w * z2

  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ]
}

function transformPoint(matrix, [x, y, z]) {
  const w = matrix[3] * x + matrix[7] * y + matrix[11] * z + matrix[15]
  const divisor = w === 0 ? 1 : w
  return [
    (matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12]) / divisor,
    (matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13]) / divisor,
    (matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14]) / divisor,
  ]
}

function transformBounds(bounds, matrix) {
  if (!bounds?.min || !bounds?.max) return null
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]

  for (let mask = 0; mask < 8; mask += 1) {
    const corner = [0, 1, 2].map((axis) => (mask & (1 << axis) ? bounds.max[axis] : bounds.min[axis]))
    const point = transformPoint(matrix, corner)
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], point[axis])
      max[axis] = Math.max(max[axis], point[axis])
    }
  }

  return { min, max }
}

function unionBounds(target, addition) {
  if (!addition) return target
  if (!target) return { min: [...addition.min], max: [...addition.max] }
  for (let axis = 0; axis < 3; axis += 1) {
    target.min[axis] = Math.min(target.min[axis], addition.min[axis])
    target.max[axis] = Math.max(target.max[axis], addition.max[axis])
  }
  return target
}

function cleanNumber(value) {
  return Number.isFinite(value) ? Number(value.toPrecision(8)) : null
}

function cleanVector(values) {
  return values.map(cleanNumber)
}

function describeBounds(bounds) {
  if (!bounds) return null
  const dimensions = bounds.min.map((minimum, axis) => bounds.max[axis] - minimum)
  const sortedDimensions = [...dimensions].sort((left, right) => right - left)
  const longest = sortedDimensions[0] || 0
  return {
    min: cleanVector(bounds.min),
    max: cleanVector(bounds.max),
    dimensions: cleanVector(dimensions),
    sortedDimensions: cleanVector(sortedDimensions),
    normalizedSortedDimensions: longest > 0
      ? cleanVector(sortedDimensions.map((dimension) => dimension / longest))
      : null,
    units: 'unknown',
    confidence: 'measured',
    method: 'POSITION accessor min/max corners transformed by the node world matrix; rotated local bounds are conservative box estimates',
  }
}

function parseGlb(buffer) {
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error('Input is not a binary glTF (GLB) file.')
  }

  const version = buffer.readUInt32LE(4)
  const declaredLength = buffer.readUInt32LE(8)
  if (declaredLength > buffer.length) throw new Error('GLB header length exceeds the file size.')

  let offset = 12
  let document
  let binary
  while (offset + 8 <= declaredLength) {
    const chunkLength = buffer.readUInt32LE(offset)
    const chunkType = buffer.readUInt32LE(offset + 4)
    const chunkStart = offset + 8
    const chunkEnd = chunkStart + chunkLength
    if (chunkEnd > declaredLength) throw new Error('GLB chunk extends beyond the declared file length.')
    if (chunkType === JSON_CHUNK) {
      document = JSON.parse(buffer.toString('utf8', chunkStart, chunkEnd).replace(/[\u0000\s]+$/u, ''))
    } else if (chunkType === BINARY_CHUNK) {
      binary = buffer.subarray(chunkStart, chunkEnd)
    }
    offset = chunkEnd
  }

  if (!document) throw new Error('GLB contains no JSON document chunk.')
  return { document, binary, version, declaredLength }
}

function imageSize(bytes, mimeType) {
  if (!bytes) return null
  if (mimeType === 'image/png' && bytes.length >= 24) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
  }

  if (mimeType === 'image/jpeg') {
    let offset = 2
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) break
      const marker = bytes[offset + 1]
      const segmentLength = bytes.readUInt16BE(offset + 2)
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) }
      }
      if (segmentLength < 2) break
      offset += segmentLength + 2
    }
  }

  if (mimeType === 'image/webp' && bytes.length >= 30 && bytes.toString('ascii', 12, 16) === 'VP8X') {
    return {
      width: 1 + bytes.readUIntLE(24, 3),
      height: 1 + bytes.readUIntLE(27, 3),
    }
  }

  return null
}

function getImageBytes(image, bufferViews, binary) {
  if (Number.isInteger(image.bufferView) && binary) {
    const view = bufferViews[image.bufferView]
    if (!view) return null
    const start = view.byteOffset ?? 0
    return binary.subarray(start, start + view.byteLength)
  }
  if (image.uri?.startsWith('data:')) {
    const separator = image.uri.indexOf(',')
    if (separator < 0) return null
    return Buffer.from(image.uri.slice(separator + 1), image.uri.slice(0, separator).endsWith(';base64') ? 'base64' : 'utf8')
  }
  return null
}

function makeNodeHierarchy(document, activeSceneIndex) {
  const parents = new Array(document.nodes?.length ?? 0).fill(null)
  for (const [parentIndex, node] of (document.nodes ?? []).entries()) {
    for (const childIndex of node.children ?? []) parents[childIndex] = parentIndex
  }

  const worldMatrices = new Array(document.nodes?.length ?? 0)
  const visiting = new Set()
  function worldMatrix(index) {
    if (worldMatrices[index]) return worldMatrices[index]
    if (visiting.has(index)) throw new Error(`Node hierarchy contains a cycle at node ${index}.`)
    visiting.add(index)
    const local = composeTransform(document.nodes[index])
    const parentIndex = parents[index]
    worldMatrices[index] = parentIndex === null ? local : multiplyMatrices(worldMatrix(parentIndex), local)
    visiting.delete(index)
    return worldMatrices[index]
  }

  const scene = document.scenes?.[activeSceneIndex] ?? document.scenes?.[0]
  const activeNodes = new Set()
  const activeRoots = scene?.nodes ?? []
  const stack = [...activeRoots]
  while (stack.length) {
    const index = stack.pop()
    if (activeNodes.has(index)) continue
    activeNodes.add(index)
    stack.push(...(document.nodes[index]?.children ?? []))
  }

  const nodes = (document.nodes ?? []).map((node, index) => {
    const local = composeTransform(node)
    const localScale = node.scale ?? [1, 1, 1]
    const largestScale = Math.max(...localScale.map(Math.abs))
    const smallestScale = Math.min(...localScale.map(Math.abs))
    return {
      index,
      name: node.name ?? `Node_${index}`,
      path: (() => {
        const path = [node.name ?? `Node_${index}`]
        let parent = parents[index]
        while (parent !== null) {
          path.unshift(document.nodes[parent].name ?? `Node_${parent}`)
          parent = parents[parent]
        }
        return path
      })(),
      parent: parents[index],
      children: node.children ?? [],
      mesh: node.mesh ?? null,
      activeInDefaultScene: activeNodes.has(index),
      localTransform: {
        matrix: node.matrix ? cleanVector(node.matrix) : null,
        translation: cleanVector(node.translation ?? [0, 0, 0]),
        rotation: cleanVector(node.rotation ?? [0, 0, 0, 1]),
        scale: cleanVector(localScale),
      },
      worldMatrix: cleanVector(worldMatrix(index)),
      nonUniformScale: largestScale - smallestScale > Math.max(1, largestScale) * 1e-4,
      extras: node.extras ?? null,
    }
  })

  return { nodes, parents, activeNodes, activeRoots, worldMatrices, scene }
}

function namedComponentBounds(nodeRecords, matchExpression, allMeshBounds, { matchPath = true, excludePath = null } = {}) {
  const matchingNodes = nodeRecords.filter((node) => {
    const path = node.path.join('/')
    const matchTarget = matchPath ? path : node.name
    return node.includedInAnalysis && !excludePath?.test(path) && matchExpression.test(matchTarget) && node.worldBounds
  })
  if (!matchingNodes.length) {
    return { status: 'unavailable', confidence: 'unavailable', reason: 'No named mesh nodes matched the component query.' }
  }
  const bounds = matchingNodes.reduce((union, node) => unionBounds(union, node.worldBounds), null)
  const dimensions = bounds.min.map((minimum, axis) => bounds.max[axis] - minimum)
  const bodyLongestDimension = Math.max(...allMeshBounds.dimensions)
  const componentLongestDimension = Math.max(...dimensions)
  return {
    status: 'available',
    confidence: 'approximate',
    method: 'Bounds union of meshes selected by node-name keywords; not a verified product datum.',
    matchedNodes: matchingNodes.map((node) => ({ index: node.index, name: node.name, path: node.path })),
    bounds: describeBounds(bounds),
    longestExtentToBodyLongestExtent: bodyLongestDimension > 0
      ? cleanNumber(componentLongestDimension / bodyLongestDimension)
      : null,
  }
}

function materialTextureReferences(material) {
  const slots = {}
  for (const slot of TEXTURE_SLOTS) {
    const textureIndex = material[slot]?.index
    if (Number.isInteger(textureIndex)) slots[slot] = textureIndex
  }
  const baseColorTexture = material.pbrMetallicRoughness?.baseColorTexture?.index
  if (Number.isInteger(baseColorTexture)) slots.baseColorTexture = baseColorTexture
  const metallicRoughness = material.pbrMetallicRoughness?.metallicRoughnessTexture?.index
  if (Number.isInteger(metallicRoughness)) slots.metallicRoughnessTexture = metallicRoughness
  return slots
}

export async function analyzeGlb(inputPath, { rootName = null } = {}) {
  const absolutePath = resolve(inputPath)
  const buffer = await readFile(absolutePath)
  const { document, binary, version, declaredLength } = parseGlb(buffer)
  const activeSceneIndex = Number.isInteger(document.scene) ? document.scene : 0
  const hierarchy = makeNodeHierarchy(document, activeSceneIndex)
  const selectedNodeIndices = new Set(hierarchy.activeNodes)
  let selection = { rootName: null, nodeIndices: [...selectedNodeIndices].sort((a, b) => a - b), status: 'full-active-scene' }
  if (rootName) {
    const candidates = hierarchy.nodes.filter((node) => node.activeInDefaultScene && node.name === rootName)
    if (candidates.length !== 1) {
      throw new Error(`Expected exactly one active node named "${rootName}", found ${candidates.length}.`)
    }
    selectedNodeIndices.clear()
    const stack = [candidates[0].index]
    while (stack.length) {
      const index = stack.pop()
      if (selectedNodeIndices.has(index) || !hierarchy.activeNodes.has(index)) continue
      selectedNodeIndices.add(index)
      stack.push(...(document.nodes[index]?.children ?? []))
    }
    selection = { rootName, nodeIndices: [...selectedNodeIndices].sort((a, b) => a - b), status: 'selected-active-subtree' }
  }
  const selectedMeshIndices = new Set([...selectedNodeIndices]
    .map((index) => document.nodes[index]?.mesh)
    .filter(Number.isInteger))
  const selectedAnimationCount = (document.animations ?? []).filter((animation) =>
    (animation.channels ?? []).some((channel) => selectedNodeIndices.has(channel.target?.node)),
  ).length
  const accessors = document.accessors ?? []
  const meshRecords = (document.meshes ?? []).map((mesh, meshIndex) => {
    let vertexCount = 0
    let triangleCount = 0
    const primitiveDetails = (mesh.primitives ?? []).map((primitive, primitiveIndex) => {
      const positionAccessorIndex = primitive.attributes?.POSITION
      const positionAccessor = Number.isInteger(positionAccessorIndex) ? accessors[positionAccessorIndex] : null
      const indexAccessor = Number.isInteger(primitive.indices) ? accessors[primitive.indices] : null
      const count = indexAccessor?.count ?? positionAccessor?.count ?? 0
      const mode = primitive.mode ?? 4
      const triangles = mode === 4
        ? Math.floor(count / 3)
        : mode === 5 || mode === 6
          ? Math.max(0, count - 2)
          : 0
      vertexCount += positionAccessor?.count ?? 0
      triangleCount += triangles
      return {
        index: primitiveIndex,
        mode,
        positionAccessor: positionAccessorIndex ?? null,
        positionCount: positionAccessor?.count ?? null,
        indexAccessor: primitive.indices ?? null,
        indexCount: indexAccessor?.count ?? null,
        triangleCount: triangles,
        material: primitive.material ?? null,
        attributes: Object.keys(primitive.attributes ?? {}),
        bounds: positionAccessor?.min && positionAccessor?.max
          ? { min: cleanVector(positionAccessor.min), max: cleanVector(positionAccessor.max) }
          : null,
      }
    })
    return {
      index: meshIndex,
      name: mesh.name ?? `Mesh_${meshIndex}`,
      primitiveCount: primitiveDetails.length,
      vertexCount,
      triangleCount,
      primitives: primitiveDetails,
    }
  })

  const sceneBounds = { bounds: null }
  const documentSceneBounds = { bounds: null }
  const nodeRecords = hierarchy.nodes.map((node) => {
    const gltfNode = document.nodes[node.index]
    let worldBounds = null
    if (hierarchy.activeNodes.has(node.index) && Number.isInteger(gltfNode.mesh)) {
      const mesh = document.meshes?.[gltfNode.mesh]
      for (const primitive of mesh?.primitives ?? []) {
        const accessor = accessors[primitive.attributes?.POSITION]
        if (accessor?.min && accessor?.max) {
          worldBounds = unionBounds(worldBounds, transformBounds({ min: accessor.min, max: accessor.max }, hierarchy.worldMatrices[node.index]))
        }
      }
      documentSceneBounds.bounds = unionBounds(documentSceneBounds.bounds, worldBounds)
      if (selectedNodeIndices.has(node.index)) sceneBounds.bounds = unionBounds(sceneBounds.bounds, worldBounds)
    }
    return { ...node, includedInAnalysis: selectedNodeIndices.has(node.index), worldBounds: describeBounds(worldBounds) }
  })
  const overallBounds = describeBounds(sceneBounds.bounds)

  const bufferViews = document.bufferViews ?? []
  const images = (document.images ?? []).map((image, index) => {
    const imageBytes = getImageBytes(image, bufferViews, binary)
    const mimeType = image.mimeType ?? (image.uri?.match(/^data:([^;,]+)/u)?.[1] ?? null)
    const dimensions = imageSize(imageBytes, mimeType)
    return {
      index,
      name: image.name ?? null,
      uri: image.uri ?? null,
      mimeType,
      bytes: imageBytes?.length ?? (bufferViews[image.bufferView]?.byteLength ?? null),
      dimensions,
      status: dimensions ? 'measured' : image.uri ? 'external-or-unparsed' : 'unavailable',
    }
  })
  const textures = (document.textures ?? []).map((texture, index) => ({
    index,
    name: texture.name ?? null,
    sourceImage: texture.source ?? texture.extensions?.KHR_texture_basisu?.source ?? null,
    sampler: texture.sampler ?? null,
  }))
  const selectedMaterialIndices = new Set([...selectedMeshIndices]
    .flatMap((meshIndex) => document.meshes[meshIndex]?.primitives ?? [])
    .map((primitive) => primitive.material)
    .filter(Number.isInteger))
  const materials = (document.materials ?? []).map((material, index) => ({
    index,
    name: material.name ?? `Material_${index}`,
    includedInAnalysis: selectedMaterialIndices.has(index),
    baseColorFactor: material.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1],
    metallicFactor: material.pbrMetallicRoughness?.metallicFactor ?? 1,
    roughnessFactor: material.pbrMetallicRoughness?.roughnessFactor ?? 1,
    alphaMode: material.alphaMode ?? 'OPAQUE',
    alphaCutoff: material.alphaCutoff ?? null,
    doubleSided: material.doubleSided ?? false,
    textureSlots: materialTextureReferences(material),
    extensions: Object.keys(material.extensions ?? {}),
  }))
  const selectedTextureIndices = new Set([...selectedMaterialIndices]
    .flatMap((index) => Object.values(materialTextureReferences(document.materials[index] ?? {})))
    .filter(Number.isInteger))
  const selectedImageIndices = new Set([...selectedTextureIndices]
    .map((textureIndex) => document.textures?.[textureIndex]?.source ?? document.textures?.[textureIndex]?.extensions?.KHR_texture_basisu?.source)
    .filter(Number.isInteger))

  const visibleMeshNodes = nodeRecords.filter((node) => node.includedInAnalysis && Number.isInteger(node.mesh))
  const semantic = {
    pivots: nodeRecords.filter((node) => node.includedInAnalysis && /pivot|hinge(root)?/iu.test(node.name)).map(({ index, name, path, mesh }) => ({ index, name, path, mesh })),
    screens: nodeRecords.filter((node) => node.includedInAnalysis && /screen|display/iu.test(node.name)).map(({ index, name, path, mesh, worldBounds }) => ({ index, name, path, mesh, bounds: worldBounds })),
    cameraComponents: nodeRecords.filter((node) => node.includedInAnalysis && /camera|lens|flash/iu.test(node.name)).map(({ index, name, path, mesh, worldBounds }) => ({ index, name, path, mesh, bounds: worldBounds })),
    semanticNames: nodeRecords.filter((node) => node.includedInAnalysis && /^(AssetRoot|GalaxyZFold8|HingeRoot|LeftBodyPivot|RightBodyPivot|LeftBody|RightBody|Screen_Main_Left|Screen_Main_Right|Screen_Cover|CameraAssembly)$/u.test(node.name)).map((node) => node.name),
    replaceableSurfaceCandidates: visibleMeshNodes.filter((node) => /screen|display/iu.test(node.path.join('/'))).map((node) => ({ name: node.name, path: node.path, bounds: node.worldBounds })),
  }

  const selectedMeshRecords = meshRecords.filter((mesh) => selectedMeshIndices.has(mesh.index))
  const meshNames = new Set(selectedMeshRecords.map((mesh) => mesh.name))
  const attributeNames = new Set(selectedMeshRecords.flatMap((mesh) => mesh.primitives.flatMap((primitive) => primitive.attributes)))
  const nonUniformScaleWarnings = nodeRecords.filter((node) => node.includedInAnalysis && node.nonUniformScale).map(({ index, name, path, localTransform }) => ({ index, name, path, scale: localTransform.scale }))
  const stats = {
    nodeCount: selectedNodeIndices.size,
    activeSceneNodeCount: selectedNodeIndices.size,
    meshCount: selectedMeshIndices.size,
    activeMeshNodeCount: visibleMeshNodes.length,
    materialCount: selectedMaterialIndices.size,
    textureCount: selectedTextureIndices.size,
    imageCount: selectedImageIndices.size,
    animationCount: selectedAnimationCount,
    primitiveCount: selectedMeshRecords.reduce((sum, mesh) => sum + mesh.primitiveCount, 0),
    vertexCountByPrimitive: selectedMeshRecords.reduce((sum, mesh) => sum + mesh.vertexCount, 0),
    triangleCount: selectedMeshRecords.reduce((sum, mesh) => sum + mesh.triangleCount, 0),
  }
  const documentStats = {
    nodeCount: document.nodes?.length ?? 0,
    activeSceneNodeCount: hierarchy.activeNodes.size,
    meshCount: document.meshes?.length ?? 0,
    activeMeshNodeCount: nodeRecords.filter((node) => node.activeInDefaultScene && Number.isInteger(node.mesh)).length,
    materialCount: materials.length,
    textureCount: textures.length,
    imageCount: images.length,
    animationCount: document.animations?.length ?? 0,
    primitiveCount: meshRecords.reduce((sum, mesh) => sum + mesh.primitiveCount, 0),
    vertexCountByPrimitive: meshRecords.reduce((sum, mesh) => sum + mesh.vertexCount, 0),
    triangleCount: meshRecords.reduce((sum, mesh) => sum + mesh.triangleCount, 0),
  }

  const sourcePath = relative(process.cwd(), absolutePath).split(sep).join('/')
  const hash = createHash('sha256').update(buffer).digest('hex')
  const output = {
    schemaVersion: '1.0',
    source: {
      path: sourcePath,
      filename: absolutePath.split(/[\\/]/u).at(-1),
      fileSizeBytes: buffer.length,
      sha256: hash,
      committedAssetAssessment: 'record this in the work reference README; analyzer does not infer distribution rights',
    },
    file: {
      container: 'GLB',
      glbVersion: version,
      declaredLengthBytes: declaredLength,
      gltfAssetVersion: document.asset?.version ?? null,
      generator: document.asset?.generator ?? null,
      copyright: document.asset?.copyright ?? null,
      extras: document.asset?.extras ?? null,
      extensionsUsed: document.extensionsUsed ?? [],
      extensionsRequired: document.extensionsRequired ?? [],
    },
    scene: {
      sceneCount: document.scenes?.length ?? 0,
      defaultSceneIndex: activeSceneIndex,
      defaultSceneName: hierarchy.scene?.name ?? null,
      selection,
      documentStats,
      documentBounds: documentSceneBounds.bounds
        ? { ...describeBounds(documentSceneBounds.bounds), coordinateConvention: 'glTF is right-handed and Y-up; product-facing axes are not inferred from the file convention.' }
        : { confidence: 'unavailable', reason: 'POSITION accessors did not provide bounds for active mesh nodes.' },
      rootNodes: hierarchy.activeRoots.map((index) => ({ index, name: document.nodes[index]?.name ?? `Node_${index}` })),
      stats,
      bounds: overallBounds
        ? { ...overallBounds, coordinateConvention: 'glTF is right-handed and Y-up; product-facing axes are not inferred from the file convention.' }
        : { confidence: 'unavailable', reason: 'POSITION accessors did not provide bounds for active mesh nodes.' },
    },
    geometry: {
      vertexDefinition: 'Sum of POSITION accessor counts for each mesh primitive; shared accessors may be counted more than once.',
      meshNames: [...meshNames],
      attributeNames: [...attributeNames].sort(),
      meshes: meshRecords.map((mesh) => ({ ...mesh, includedInAnalysis: selectedMeshIndices.has(mesh.index) })),
      hierarchy: nodeRecords,
      nonUniformScaleWarnings,
    },
    runtimeStructure: semantic,
    materials,
    textures: textures.map((texture) => ({
      ...texture,
      includedInAnalysis: selectedTextureIndices.has(texture.index),
      image: Number.isInteger(texture.sourceImage) && images[texture.sourceImage]
        ? { ...images[texture.sourceImage], includedInAnalysis: selectedImageIndices.has(texture.sourceImage) }
        : null,
    })),
    largeTextureWarnings: images.filter((image) => selectedImageIndices.has(image.index) && ((image.dimensions?.width ?? 0) > 2048 || (image.dimensions?.height ?? 0) > 2048 || (image.bytes ?? 0) > 2 * 1024 * 1024)).map((image) => image.index),
    productGeometry: overallBounds ? {
      cameraComponents: namedComponentBounds(nodeRecords, /camera|lens|flash/iu, overallBounds, {
        excludePath: /(?:camera|lens|flash)[^/]*(?:cover|front|selfie)|(?:cover|front|selfie)[^/]*(?:camera|lens|flash)/iu,
      }),
      hingeComponents: namedComponentBounds(nodeRecords, /hinge/iu, overallBounds, { matchPath: false }),
      screenComponents: namedComponentBounds(nodeRecords, /screen|display/iu, overallBounds),
      measurementNote: 'Name-selected component envelopes are approximate inspection measurements, not official product dimensions.',
    } : null,
    confidenceLegend: {
      measured: 'directly calculated from GLB accessor bounds, metadata, or counts',
      inferred: 'derived from context or comparison with a documented reference',
      approximate: 'useful envelope or visual estimate with incomplete semantic boundaries',
      unavailable: 'not extractable or not reliably normalized from this asset',
    },
    analysisLimits: [
      'Bounds use POSITION accessor min/max and do not account for morph-target displacement or skinned-pose deformation.',
      'Summed POSITION counts are per primitive and may repeat shared accessors.',
      'The analyzer reports file structure; it does not establish product accuracy, licensing, or front/up axis semantics.',
    ],
  }

  return output
}
