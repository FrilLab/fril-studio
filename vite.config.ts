import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import type { Plugin, ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'
import { createWorksManifest } from './scripts/works-manifest.mjs'
import type { StudioWork } from './src/types/works.ts'

const rootDirectory = dirname(fileURLToPath(import.meta.url))
const virtualModuleId = 'virtual:fril-works'
const resolvedVirtualModuleId = `\0${virtualModuleId}`

function worksManifestPlugin(): Plugin {
  let root = rootDirectory
  let works: StudioWork[] = []
  let manifestError: Error | undefined
  let server: ViteDevServer | undefined
  let refreshTimer: ReturnType<typeof setTimeout> | undefined

  async function refreshManifest() {
    try {
      works = await createWorksManifest(resolve(root, 'works'))
      manifestError = undefined
    } catch (error) {
      manifestError = error instanceof Error ? error : new Error(String(error))
      server?.config.logger.error(`[works] ${manifestError.message}`)
    }

    if (server) {
      const module = server.moduleGraph.getModuleById(resolvedVirtualModuleId)
      if (module) server.moduleGraph.invalidateModule(module)
      server.ws.send({ type: 'full-reload' })
    }
  }

  function queueManifestRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => void refreshManifest(), 80)
  }

  return {
    name: 'fril-works-manifest',
    enforce: 'pre',

    async configResolved(config) {
      root = config.root
      try {
        works = await createWorksManifest(resolve(root, 'works'))
        manifestError = undefined
      } catch (error) {
        manifestError = error instanceof Error ? error : new Error(String(error))
        throw manifestError
      }
    },

    async buildStart() {
      try {
        works = await createWorksManifest(resolve(root, 'works'))
        manifestError = undefined
      } catch (error) {
        manifestError = error instanceof Error ? error : new Error(String(error))
        this.error(manifestError.message)
      }
    },

    resolveId(id) {
      return id === virtualModuleId ? resolvedVirtualModuleId : undefined
    },

    load(id) {
      if (id !== resolvedVirtualModuleId) return undefined
      if (manifestError) this.error(manifestError.message)
      return `export default ${JSON.stringify(works)}`
    },

    configureServer(devServer) {
      server = devServer
      server.watcher.add(resolve(root, 'works'))

      const refreshOnMetadataChange = (event: string, changedPath: string) => {
        const absolutePath = resolve(changedPath)
        const relativePath = relativePathFromWorks(absolutePath)
        const isWorkMetadata = relativePath.endsWith(`${sep}work.json`) || relativePath === 'work.json'
        const isWorkDirectory = ['addDir', 'unlinkDir'].includes(event)
          && !relativePath.startsWith(`..${sep}`)
          && relativePath !== '..'
          && !relativePath.includes(sep)

        if (isWorkMetadata || isWorkDirectory) queueManifestRefresh()
      }

      function relativePathFromWorks(path: string) {
        const resolvedWorksDirectory = resolve(root, 'works')
        const relativePath = path.slice(resolvedWorksDirectory.length + 1)
        return path.startsWith(`${resolvedWorksDirectory}${sep}`) ? relativePath : '..'
      }

      server.watcher.on('add', (path) => refreshOnMetadataChange('add', path))
      server.watcher.on('change', (path) => refreshOnMetadataChange('change', path))
      server.watcher.on('unlink', (path) => refreshOnMetadataChange('unlink', path))
      server.watcher.on('addDir', (path) => refreshOnMetadataChange('addDir', path))
      server.watcher.on('unlinkDir', (path) => refreshOnMetadataChange('unlinkDir', path))
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [worksManifestPlugin(), react()],
})
