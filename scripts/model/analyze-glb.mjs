import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeGlb } from './glb-analysis.mjs'

async function main() {
  const args = process.argv.slice(2)
  const inputPath = args.find((argument) => !argument.startsWith('--'))
  const outputIndex = args.indexOf('--output')
  const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : null
  const rootIndex = args.indexOf('--root')
  const rootName = rootIndex >= 0 ? args[rootIndex + 1] : null

  if (args.includes('--help') || !inputPath) {
    console.info('Usage: node scripts/model/analyze-glb.mjs <asset.glb> [--root <node-name>] [--output analysis.json]')
    process.exitCode = args.includes('--help') ? 0 : 2
    return
  }

  const analysis = await analyzeGlb(inputPath, { rootName })
  const serialized = `${JSON.stringify(analysis, null, 2)}\n`
  if (!outputPath) {
    process.stdout.write(serialized)
    return
  }

  const { mkdir, writeFile } = await import('node:fs/promises')
  const { dirname } = await import('node:path')
  await mkdir(dirname(resolve(outputPath)), { recursive: true })
  await writeFile(outputPath, serialized)
  console.info(`[model] wrote ${outputPath}`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`[model] ${error instanceof Error ? error.message : error}`)
    process.exitCode = 1
  })
}
