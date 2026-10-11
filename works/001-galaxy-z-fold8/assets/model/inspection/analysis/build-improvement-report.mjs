#!/usr/bin/env node

// Work-specific normalized comparison for the Fril-authored Fold8 generator.
// The generic analyzer records raw bounds; this script maps known reference
// nodes and coordinate axes to product ratios without copying reference data.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const directory = path.dirname(fileURLToPath(import.meta.url))
const read = async (name) => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'))
const [previous, generated, reference, comparison] = await Promise.all([
  read('generated-previous.json'),
  read('generated.json'),
  read('reference.json'),
  read('comparison.json'),
])

function node(analysis, name, pathSuffix = null) {
  const match = analysis.geometry.hierarchy.find((entry) => entry.name === name &&
    (!pathSuffix || entry.path.join('/').endsWith(pathSuffix)))
  if (!match?.worldBounds) throw new Error(`Missing analyzed node ${name}${pathSuffix ? ` at ${pathSuffix}` : ''}`)
  return match.worldBounds
}

function componentBounds(analysis) {
  const bounds = analysis.productGeometry?.cameraComponents?.bounds
  if (!bounds) throw new Error('Analyzer did not produce a rear camera component envelope')
  return bounds
}

function gapAtNearestEdge(bodyBounds, component, axis) {
  const lowGap = component.min[axis] - bodyBounds.min[axis]
  const highGap = bodyBounds.max[axis] - component.max[axis]
  return Math.min(lowGap, highGap)
}

function unionBounds(boundsList) {
  return {
    min: boundsList[0].min.map((_, axis) => Math.min(...boundsList.map((bounds) => bounds.min[axis]))),
    max: boundsList[0].max.map((_, axis) => Math.max(...boundsList.map((bounds) => bounds.max[axis]))),
  }
}

function center(bounds, axis) {
  return (bounds.min[axis] + bounds.max[axis]) / 2
}

const priorFrame = node(previous, 'LeftFrame')
const newFrame = node(generated, 'LeftFrame')
// The reference model's selected product leaf is the front/back body mesh
// Object_29. It is measured in X width / Y height / Z depth, unlike our GLB's
// X width / Z height / Y depth orientation.
const referenceFrame = node(reference, 'Object_29', 'Cube.006_10/Object_29')
const priorCamera = componentBounds(previous)
const newCamera = componentBounds(generated)
const referenceCamera = componentBounds(reference)
const priorVerticalAxis = 2
const newVerticalAxis = 2
const referenceVerticalAxis = 1

const referenceRingPair = node(reference, 'Object_13', 'Camera.007_4/Object_13')
const referenceGlassPair = node(reference, 'Object_15', 'Camera.007_4/Object_15')
const referenceFlash = node(reference, 'Object_38', 'Flash.003_13/Object_38')
const referenceRail = node(reference, 'Object_18', 'Cube_5/Object_18')

function modelValues(analysis, frameBounds, cameraBounds, verticalAxis, isReference = false) {
  const width = frameBounds.dimensions[0]
  const height = frameBounds.dimensions[verticalAxis]
  const ringNodes = isReference ? [] : [node(analysis, 'CameraRing_Wide'), node(analysis, 'CameraRing_UltraWide')]
  const glassNode = isReference ? null : node(analysis, 'CameraLens_Wide')
  const flashNode = isReference ? null : node(analysis, 'Flash')
  const railNodes = isReference ? [] : analysis.geometry.hierarchy
    .filter((entry) => /^HingeRearRail_(?:Left|Right)$/u.test(entry.name))
    .map((entry) => entry.worldBounds)
  const ringPairDiameter = isReference
    ? referenceRingPair.dimensions[0]
    : Math.max(ringNodes[0].dimensions[0], ringNodes[0].dimensions[2])
  const ringSpacing = isReference
    ? referenceRingPair.dimensions[1] - referenceRingPair.dimensions[0]
    : Math.abs(center(ringNodes[0], verticalAxis) - center(ringNodes[1], verticalAxis))
  const glassDiameter = isReference
    ? referenceGlassPair.dimensions[0]
    : Math.max(glassNode.dimensions[0], glassNode.dimensions[2])
  const flashDiameter = isReference
    ? referenceFlash.dimensions[0]
    : Math.max(flashNode.dimensions[0], flashNode.dimensions[2])
  const cameraWidth = cameraBounds.dimensions[0]
  const cameraHeight = cameraBounds.dimensions[verticalAxis]
  const railWidth = isReference
    ? referenceRail.dimensions[0]
    : railNodes.length
      ? Math.max(...railNodes.map((entry) => entry.max[0])) - Math.min(...railNodes.map((entry) => entry.min[0]))
      : 0

  return {
    openBodyWidthToHeight: width * 2 / height,
    cameraIslandWidthToLeafWidth: cameraWidth / width,
    cameraIslandHeightToBodyHeight: cameraHeight / height,
    cameraIslandOuterMarginToLeafWidth: gapAtNearestEdge(frameBounds, cameraBounds, 0) / width,
    cameraIslandTopMarginToBodyHeight: gapAtNearestEdge(frameBounds, cameraBounds, verticalAxis) / height,
    cameraRingDiameterToIslandWidth: ringPairDiameter / cameraWidth,
    cameraGlassDiameterToIslandWidth: glassDiameter / cameraWidth,
    lensSpacingToIslandHeight: ringSpacing / cameraHeight,
    flashDiameterToIslandWidth: flashDiameter / cameraWidth,
    hingeRearRailWidthToOpenBodyWidth: railWidth / (width * 2),
  }
}

const priorValues = modelValues(previous, priorFrame, priorCamera, priorVerticalAxis)
const newValues = modelValues(generated, newFrame, newCamera, newVerticalAxis)
const referenceValues = modelValues(reference, referenceFrame, referenceCamera, referenceVerticalAxis, true)

const descriptions = {
  openBodyWidthToHeight: 'Open body width / height',
  cameraIslandWidthToLeafWidth: 'Camera envelope width / camera-side leaf width',
  cameraIslandHeightToBodyHeight: 'Camera envelope height / body height',
  cameraIslandOuterMarginToLeafWidth: 'Camera outer-edge margin / leaf width',
  cameraIslandTopMarginToBodyHeight: 'Camera top margin / body height',
  cameraRingDiameterToIslandWidth: 'Camera ring diameter / camera envelope width',
  cameraGlassDiameterToIslandWidth: 'Camera glass diameter / camera envelope width',
  lensSpacingToIslandHeight: 'Lens center spacing / camera envelope height',
  flashDiameterToIslandWidth: 'Flash diameter / camera envelope width',
  hingeRearRailWidthToOpenBodyWidth: 'Rear hinge rail width / open body width',
}

const features = Object.fromEntries(Object.entries(descriptions).map(([key, label]) => {
  const before = priorValues[key]
  const target = referenceValues[key]
  const after = newValues[key]
  const previousErrorPercent = Math.abs(before - target) / Math.abs(target) * 100
  const newErrorPercent = Math.abs(after - target) / Math.abs(target) * 100
  return [key, {
    label,
    previous: Number(before.toFixed(4)),
    reference: Number(target.toFixed(4)),
    new: Number(after.toFixed(4)),
    previousAbsoluteDifference: Number(Math.abs(before - target).toFixed(4)),
    newAbsoluteDifference: Number(Math.abs(after - target).toFixed(4)),
    previousErrorPercent: Number(previousErrorPercent.toFixed(2)),
    newErrorPercent: Number(newErrorPercent.toFixed(2)),
    errorReductionPercent: previousErrorPercent > 0
      ? Number(((previousErrorPercent - newErrorPercent) / previousErrorPercent * 100).toFixed(2))
      : null,
    confidence: key === 'openBodyWidthToHeight'
      ? 'measured; source units mapped by documented body bounds'
      : key.startsWith('camera') || key.startsWith('lens') || key.startsWith('flash')
        ? 'approximate; measured analyzer bounds with medium-confidence semantic mapping'
        : 'approximate; reference Object_18 interpreted as the rear hinge rail',
  }]
}))

const diagnosticKeys = [
  'cameraIslandWidthToLeafWidth',
  'cameraIslandTopMarginToBodyHeight',
  'cameraRingDiameterToIslandWidth',
  'cameraGlassDiameterToIslandWidth',
  'hingeRearRailWidthToOpenBodyWidth',
]
const diagnostic = diagnosticKeys
  .map((key) => features[key])
  .sort((a, b) => b.previousErrorPercent - a.previousErrorPercent)
  .map((feature) => `${feature.label} had ${feature.previousErrorPercent.toFixed(2)}% relative error before rebuilding.`)

const output = {
  generatedAt: new Date().toISOString(),
  method: {
    previousGeneratedAnalysis: 'generated-previous.json, analyzed from the pre-rebuild GLB snapshot',
    currentGeneratedAnalysis: 'generated.json',
    referenceAnalysis: 'reference.json, selected root SAMSUNG Galaxy Z Fold8_22',
    bodyMapping: 'Generated LeftFrame width=X, height=Z; reference Object_29 width=X, height=Y. Axes are identified from views and hierarchy, not assumed equal.',
    cameraMapping: 'Analyzer rear camera envelope uses name-matched camera/lens/flash nodes and excludes front/cover camera paths.',
    normalization: 'Component dimensions and edge offsets are divided by the corresponding measured body leaf, body height, or camera envelope. Raw coordinates and source units are not compared.',
    confidence: 'Analyzer bounds are measured from files; component identity and reference-object semantics are approximate/inferred.',
  },
  diagnostic,
  features,
  notes: [
    'Official open/folded body dimensions remain 161.4 × 123.9 × 4.5 mm and 81.9 × 123.9 × 9.7 mm; the generated open body bounds remain unchanged.',
    'The reference GLB main display surface is larger than the official standard Fold8 7.6-inch 4:3 display. The generator preserves the official 7.6-inch display diagonal instead of matching the reference surface.',
    'Camera depth was not normalized into a component target: the reference camera depth envelope conflicts with the official folded stack and has uncertain component boundaries.',
    'Reference Object_18 is a long center rail measured in the source file; interpreting it as a rear hinge cover is inferred. The generated rail is split between the two body leaves to preserve articulation.',
    'No reference geometry, texture, or material is reused by this report or generator.',
  ],
  asset: {
    currentGlbBytes: generated.file.declaredLengthBytes,
    currentMeshCount: generated.scene.stats.meshCount,
    currentPositionVerticesByPrimitive: generated.scene.stats.vertexCountByPrimitive,
    currentTriangles: generated.scene.stats.triangleCount,
    currentMaterialCount: generated.scene.stats.materialCount,
  },
}

await fs.writeFile(path.join(directory, 'improvement.json'), `${JSON.stringify(output, null, 2)}\n`)

const percent = (value) => `${value.toFixed(2)}%`
const table = [
  '| Feature (normalized ratio) | Previous | Reference | New | Previous error | New error | Error reduction |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...Object.values(features).map((item) => `| ${item.label} | ${item.previous.toFixed(4)} | ${item.reference.toFixed(4)} | ${item.new.toFixed(4)} | ${percent(item.previousErrorPercent)} | ${percent(item.newErrorPercent)} | ${item.errorReductionPercent === null ? 'n/a' : percent(item.errorReductionPercent)} |`),
].join('\n')

const markerStart = '<!-- Fold8 before-after start -->'
const markerEnd = '<!-- Fold8 before-after end -->'
const section = `${markerStart}\n## Work-specific before / after measurements\n\n${table}\n\nBefore the rebuild, the largest relevant gaps were the camera island width and top margin, followed by undersized ring and glass diameters. The official body width-to-height proportion was already aligned with the selected reference body leaf.\n\nThe previous values come from generated-previous.json; new and reference values come from this analyzer run. Ratios are normalized against the selected body leaf or component envelope because the two GLBs use different axis conventions and unverified source units. Error percentages are relative to the reference ratio. Ratios are rounded to four decimals and errors to two decimal places; these are comparison estimates, not claims of sub-percent product accuracy. Component confidence is approximate because the analyzer selects mesh envelopes by names.\n\nThe reference main display surface measures larger than the official standard Fold8 7.6-inch 4:3 panel, so the generator keeps the official diagonal. Camera depth is not compared because the reference depth envelope conflicts with the official folded stack. Object_18 is interpreted as a rear hinge rail with medium confidence.\n\nAsset after rebuild: ${generated.file.declaredLengthBytes} bytes; ${generated.scene.stats.meshCount} meshes; ${generated.scene.stats.vertexCountByPrimitive} POSITION vertices by primitive; ${generated.scene.stats.triangleCount} triangles; ${generated.scene.stats.materialCount} materials.\n${markerEnd}`

const comparisonPath = path.join(directory, 'comparison.md')
let markdown = await fs.readFile(comparisonPath, 'utf8')
const startIndex = markdown.indexOf(markerStart)
const endIndex = markdown.indexOf(markerEnd)
if (startIndex !== -1 && endIndex !== -1) markdown = `${markdown.slice(0, startIndex)}${markdown.slice(endIndex + markerEnd.length)}`
markdown = `${markdown.trimEnd()}\n\n${section}\n`
await fs.writeFile(comparisonPath, markdown)

comparison.featureImprovements = features
comparison.featureImprovementMethod = output.method
await fs.writeFile(path.join(directory, 'comparison.json'), `${JSON.stringify(comparison, null, 2)}\n`)

console.log(`[model] wrote normalized before/after metrics to ${path.join(directory, 'improvement.json')}`)
