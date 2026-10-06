import { cp, mkdir, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const source = resolve('works')
const destination = resolve('dist/works')

await mkdir(destination, { recursive: true })

for (const entry of await readdir(source, { withFileTypes: true })) {
  if (entry.name === 'README.md') continue
  await cp(resolve(source, entry.name), resolve(destination, entry.name), {
    recursive: true,
    force: true,
  })
}
