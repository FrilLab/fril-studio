import { cp, mkdir, readdir, rm } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createWorksManifest } from './works-manifest.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const worksDirectory = resolve(repositoryRoot, 'works')
const destination = resolve(repositoryRoot, 'dist/works')
const manifest = await createWorksManifest(worksDirectory)

await rm(destination, { recursive: true, force: true })
await mkdir(destination, { recursive: true })

function shouldCopyWorkFile(workDirectory, sourcePath) {
  const relativePath = relative(workDirectory, sourcePath)
  if (relativePath.length === 0) return true

  const webPath = relativePath.split(sep).join('/')
  if (
    webPath === 'README.md' ||
    webPath === 'work.json' ||
    webPath.endsWith('.blend') ||
    webPath.endsWith('/.DS_Store') ||
    webPath === '.DS_Store'
  ) {
    return false
  }

  // Keep the Fril-generated runtime model. Guard against shipping the earlier
  // third-party comparison/reference binary if it is present in this folder.
  if (webPath === 'assets/model/exported/samsung_galaxy_z_fold8.glb') return false

  if (
    webPath === 'assets/model/source' ||
    webPath.startsWith('assets/model/source/') ||
    webPath === 'assets/model/inspection' ||
    webPath.startsWith('assets/model/inspection/') ||
    webPath === 'assets/model/reference' ||
    webPath.startsWith('assets/model/reference/')
  ) {
    return false
  }

  return true
}

for (const work of manifest) {
  const sourceWork = resolve(worksDirectory, work.slug)
  const outputWork = resolve(destination, work.slug)
  await cp(sourceWork, outputWork, {
    recursive: true,
    force: true,
    filter: (sourcePath) => shouldCopyWorkFile(sourceWork, sourcePath),
  })
}

const packagedWorks = await readdir(destination, { withFileTypes: true })
  .then((entries) => entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name))

console.info(`[works] packaged ${packagedWorks.length} published work${packagedWorks.length === 1 ? '' : 's'}`)
