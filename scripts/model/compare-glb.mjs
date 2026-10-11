import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeGlb } from './glb-analysis.mjs'

function delta(referenceValue, generatedValue) {
  if (!Number.isFinite(referenceValue) || !Number.isFinite(generatedValue)) return null
  const absoluteDifference = referenceValue - generatedValue
  return {
    referenceMinusGenerated: Number(absoluteDifference.toPrecision(8)),
    percentageFromGenerated: generatedValue === 0
      ? null
      : Number(((absoluteDifference / Math.abs(generatedValue)) * 100).toPrecision(6)),
    ratioReferenceToGenerated: generatedValue === 0
      ? null
      : Number((referenceValue / generatedValue).toPrecision(8)),
  }
}

function compareNormalizedBounds(generatedBounds, referenceBounds) {
  const generated = generatedBounds?.normalizedSortedDimensions
  const reference = referenceBounds?.normalizedSortedDimensions
  if (!generated || !reference) {
    return { status: 'unavailable', reason: 'At least one asset has no measurable scene bounds.' }
  }

  return {
    status: 'compared',
    method: 'Sort each axis-aligned extent from longest to shortest, then normalize by the longest extent.',
    caveat: 'This avoids unit mismatches but does not correct arbitrary rotations or shear; orientation should be visually verified first.',
    generated,
    reference,
    referenceMinusGenerated: reference.map((value, index) => Number((value - generated[index]).toPrecision(8))),
    relativePercentDifference: reference.map((value, index) => generated[index] === 0
      ? null
      : Number((((value - generated[index]) / generated[index]) * 100).toPrecision(6))),
  }
}

function compareNamedComponent(generated, reference) {
  const generatedRatio = generated?.status === 'available' ? generated.longestExtentToBodyLongestExtent : null
  const referenceRatio = reference?.status === 'available' ? reference.longestExtentToBodyLongestExtent : null
  return {
    generated: generated ?? { status: 'unavailable', confidence: 'unavailable' },
    reference: reference ?? { status: 'unavailable', confidence: 'unavailable' },
    relativeLongestExtent: generatedRatio !== null && referenceRatio !== null
      ? {
          generatedToBody: generatedRatio,
          referenceToBody: referenceRatio,
          difference: delta(referenceRatio, generatedRatio),
          confidence: 'approximate',
          caveat: 'Keyword-selected bounds can include different component sets and are not official dimensions.',
        }
      : { status: 'unavailable', reason: 'Both analyses need a name-selected component envelope.' },
  }
}

function makeComparison(generated, reference) {
  const generatedStats = generated.scene.stats
  const referenceStats = reference.scene.stats
  const generatedNames = new Set(generated.runtimeStructure.semanticNames)
  const referenceNames = new Set(reference.runtimeStructure.semanticNames)
  const sharedSemanticNames = [...generatedNames].filter((name) => referenceNames.has(name)).sort()
  const generatedOnlyNames = [...generatedNames].filter((name) => !referenceNames.has(name)).sort()
  const referenceOnlyNames = [...referenceNames].filter((name) => !generatedNames.has(name)).sort()

  return {
    schemaVersion: '1.0',
    provenance: {
      generated: generated.source,
      reference: reference.source,
      differenceDirection: 'reference minus generated',
      legalNote: 'This comparison stores derived measurements and metadata only; it does not contain reference geometry, textures, or materials.',
    },
    normalization: {
      units: 'unknown unless separately documented by the work',
      orientation: 'product-facing axes were not normalized automatically',
      method: 'compare sorted AABB extents normalized by their longest dimension; verify front/up/origin visually before interpreting proportions',
      rawDimensionDifferences: 'omitted because source units and orientation are not known to match',
    },
    overall: {
      generated: { bounds: generated.scene.bounds, fileSizeBytes: generated.source.fileSizeBytes },
      reference: { bounds: reference.scene.bounds, fileSizeBytes: reference.source.fileSizeBytes },
      difference: {
        normalizedSortedDimensions: compareNormalizedBounds(generated.scene.bounds, reference.scene.bounds),
        fileSizeBytes: delta(reference.source.fileSizeBytes, generated.source.fileSizeBytes),
      },
    },
    cameraModule: compareNamedComponent(
      generated.productGeometry?.cameraComponents,
      reference.productGeometry?.cameraComponents,
    ),
    hinge: compareNamedComponent(
      generated.productGeometry?.hingeComponents,
      reference.productGeometry?.hingeComponents,
    ),
    screen: compareNamedComponent(
      generated.productGeometry?.screenComponents,
      reference.productGeometry?.screenComponents,
    ),
    complexity: {
      generated: {
        vertices: generatedStats.vertexCountByPrimitive,
        triangles: generatedStats.triangleCount,
        nodes: generatedStats.nodeCount,
        meshes: generatedStats.meshCount,
        materials: generatedStats.materialCount,
        textures: generatedStats.textureCount,
      },
      reference: {
        vertices: referenceStats.vertexCountByPrimitive,
        triangles: referenceStats.triangleCount,
        nodes: referenceStats.nodeCount,
        meshes: referenceStats.meshCount,
        materials: referenceStats.materialCount,
        textures: referenceStats.textureCount,
      },
      difference: Object.fromEntries([
        ['vertices', 'vertexCountByPrimitive'],
        ['triangles', 'triangleCount'],
        ['nodes', 'nodeCount'],
        ['meshes', 'meshCount'],
        ['materials', 'materialCount'],
        ['textures', 'textureCount'],
      ].map(([key, stat]) => [key, delta(referenceStats[stat], generatedStats[stat])])),
    },
    hierarchy: {
      generated: { semanticNames: [...generatedNames].sort(), nodeCount: generatedStats.nodeCount },
      reference: { semanticNames: [...referenceNames].sort(), nodeCount: referenceStats.nodeCount },
      sharedSemanticNames,
      generatedOnlyNames,
      referenceOnlyNames,
      note: 'Node-name matches are exact; similarly named or structurally equivalent nodes require a work-specific mapping.',
    },
    confidence: {
      sceneBounds: 'measured from GLB accessor bounds and node transforms; units remain unknown',
      complexity: 'measured from glTF accessors and document arrays',
      componentBounds: 'approximate because selected by node-name keywords',
      normalizedProportion: 'inferred comparison pending orientation review',
    },
  }
}

function comparisonMarkdown(generated, reference, comparison) {
  const dimensionComparison = comparison.overall.difference.normalizedSortedDimensions
  const dimensions = dimensionComparison.status === 'compared'
    ? `| Longest | ${dimensionComparison.generated[0].toFixed(4)} | ${dimensionComparison.reference[0].toFixed(4)} | 0.0000 |\n| Middle | ${dimensionComparison.generated[1].toFixed(4)} | ${dimensionComparison.reference[1].toFixed(4)} | ${dimensionComparison.referenceMinusGenerated[1].toFixed(4)} |\n| Shortest | ${dimensionComparison.generated[2].toFixed(4)} | ${dimensionComparison.reference[2].toFixed(4)} | ${dimensionComparison.referenceMinusGenerated[2].toFixed(4)} |`
    : `Unavailable: ${dimensionComparison.reason}`
  const complexity = comparison.complexity

  return `# Work 001 Model Comparison

Generated on ${new Date().toISOString().slice(0, 10)} by \`scripts/model/compare-glb.mjs\`.

## Assets

- Generated: \`${generated.source.path}\` (${generated.source.fileSizeBytes} bytes)
- Reference: \`${reference.source.path}\` (${reference.source.fileSizeBytes} bytes)
- Generated analysis root: \`${generated.scene.selection.rootName ?? 'entire active scene'}\`
- Reference analysis root: \`${reference.scene.selection.rootName ?? 'entire active scene'}\`
- Reference author/source/license are documented in [../../reference/README.md](../../reference/README.md).

## Overall shape

Raw dimensions are intentionally not subtracted: the reference unit and product-axis orientation are not verified as matching the generated GLB. The table compares axis-aligned extents sorted by size and normalized by each model's longest extent. Visually confirm orientation before treating the proportion comparison as meaningful.

| Extent | Generated | Reference | Reference − generated |
|---|---:|---:|---:|
${dimensions}

## Complexity

Differences below are reference minus generated. Counts are directly extractable from GLB accessors and document arrays.

| Measure | Generated | Reference | Difference |
|---|---:|---:|---:|
| Position vertices by primitive | ${complexity.generated.vertices} | ${complexity.reference.vertices} | ${complexity.difference.vertices.referenceMinusGenerated} |
| Triangles | ${complexity.generated.triangles} | ${complexity.reference.triangles} | ${complexity.difference.triangles.referenceMinusGenerated} |
| Nodes | ${complexity.generated.nodes} | ${complexity.reference.nodes} | ${complexity.difference.nodes.referenceMinusGenerated} |
| Meshes | ${complexity.generated.meshes} | ${complexity.reference.meshes} | ${complexity.difference.meshes.referenceMinusGenerated} |
| Materials | ${complexity.generated.materials} | ${complexity.reference.materials} | ${complexity.difference.materials.referenceMinusGenerated} |
| Textures | ${complexity.generated.textures} | ${complexity.reference.textures} | ${complexity.difference.textures.referenceMinusGenerated} |

## Product component envelopes

Camera, hinge, and screen envelopes are approximate. The script selects meshes by names and reports a longest-extent ratio, not an official product measurement. Inspect each JSON's \`matchedNodes\` before using a ratio.

| Component | Generated ratio | Reference ratio | Confidence |
|---|---:|---:|---|
| Camera module | ${componentRatio(comparison.cameraModule)} | ${componentRatio(comparison.cameraModule, 'reference')} | approximate/name-selected |
| Hinge | ${componentRatio(comparison.hinge)} | ${componentRatio(comparison.hinge, 'reference')} | approximate/name-selected |
| Screen | ${componentRatio(comparison.screen)} | ${componentRatio(comparison.screen, 'reference')} | approximate/name-selected |

## Hierarchy

- Generated semantic nodes: ${comparison.hierarchy.generated.semanticNames.join(', ') || 'none'}
- Reference semantic nodes: ${comparison.hierarchy.reference.semanticNames.join(', ') || 'none'}
- Exact shared semantic names: ${comparison.hierarchy.sharedSemanticNames.join(', ') || 'none'}
- The reference hierarchy is not assumed to provide runtime pivots merely because the product looks articulated.

## Confidence and limits

- Scene dimensions are measured from accessor bounds and node transforms; GLB units are unknown unless separately documented.
- Shape proportions are inferred from normalized, sorted axis-aligned bounds; arbitrary orientation is not corrected automatically.
- Camera, hinge, and screen envelopes are approximate node-name matches and must be checked against the source hierarchy and reference views.
- This report contains derived data only. It does not reproduce the reference model's geometry, materials, or textures.
`
}

function componentRatio(component, side = 'generated') {
  const value = side === 'reference' ? component.reference : component.generated
  return value?.status === 'available' ? value.longestExtentToBodyLongestExtent.toFixed(4) : 'unavailable'
}

function parseArguments(args) {
  const positional = []
  let outputDirectory
  let generatedRoot
  let referenceRoot
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--output-dir') outputDirectory = args[++index]
    else if (args[index] === '--generated-root') generatedRoot = args[++index]
    else if (args[index] === '--reference-root') referenceRoot = args[++index]
    else if (!args[index].startsWith('--')) positional.push(args[index])
  }
  return { generatedPath: positional[0], referencePath: positional[1], outputDirectory, generatedRoot, referenceRoot }
}

async function main() {
  const { generatedPath, referencePath, outputDirectory, generatedRoot, referenceRoot } = parseArguments(process.argv.slice(2))
  if (!generatedPath || !referencePath || !outputDirectory || process.argv.includes('--help')) {
    console.info('Usage: node scripts/model/compare-glb.mjs <generated.glb> <reference.glb> --output-dir <inspection/analysis> [--generated-root <node-name>] [--reference-root <node-name>]')
    process.exitCode = process.argv.includes('--help') ? 0 : 2
    return
  }

  const [generated, reference] = await Promise.all([
    analyzeGlb(generatedPath, { rootName: generatedRoot }),
    analyzeGlb(referencePath, { rootName: referenceRoot }),
  ])
  const comparison = makeComparison(generated, reference)
  const output = resolve(outputDirectory)
  await mkdir(output, { recursive: true })
  const files = new Map([
    ['generated.json', `${JSON.stringify(generated, null, 2)}\n`],
    ['reference.json', `${JSON.stringify(reference, null, 2)}\n`],
    ['comparison.json', `${JSON.stringify(comparison, null, 2)}\n`],
    ['comparison.md', comparisonMarkdown(generated, reference, comparison)],
  ])
  await Promise.all([...files].map(([filename, contents]) => writeFile(resolve(output, filename), contents)))
  console.info(`[model] wrote ${files.size} reports to ${relative(process.cwd(), output).split(sep).join('/')}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[model] ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
