import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createWorksManifest } from './works-manifest.mjs'

const temporaryDirectories = []

const validWork = (overrides = {}) => ({
  id: '001',
  slug: 'quiet-garden',
  title: { en: 'Quiet Garden', ko: '고요한 정원' },
  category: { en: 'Interactive', ko: '인터랙티브' },
  description: { en: 'A small web experience.', ko: '작은 웹 경험입니다.' },
  year: '2026',
  thumbnail: './thumbnail.webp',
  entry: './index.html',
  status: 'published',
  ...overrides,
})

async function createFixture(works) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'fril-works-'))
  temporaryDirectories.push(temporaryDirectory)
  const worksDirectory = join(temporaryDirectory, 'works')
  await mkdir(worksDirectory)

  for (const { directory, metadata, files = ['index.html', 'thumbnail.webp'] } of works) {
    const workDirectory = join(worksDirectory, directory)
    await mkdir(workDirectory)
    await writeFile(join(workDirectory, 'work.json'), JSON.stringify(metadata))
    for (const file of files) await writeFile(join(workDirectory, file), 'fixture')
  }

  return resolve(worksDirectory)
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('createWorksManifest', () => {
  it('publishes normalized routes and excludes draft works', async () => {
    const worksDirectory = await createFixture([
      { directory: 'quiet-garden', metadata: validWork() },
      {
        directory: 'next-study',
        metadata: validWork({ id: '002', slug: 'next-study', status: 'draft' }),
      },
    ])

    await expect(createWorksManifest(worksDirectory)).resolves.toEqual([
      {
        ...validWork(),
        thumbnail: '/works/quiet-garden/thumbnail.webp',
        entry: '/works/quiet-garden/',
      },
    ])
  })

  it('rejects duplicate ids and slugs', async () => {
    const duplicateIds = await createFixture([
      { directory: 'quiet-garden', metadata: validWork() },
      { directory: 'small-world', metadata: validWork({ slug: 'small-world' }) },
    ])
    await expect(createWorksManifest(duplicateIds)).rejects.toThrow('duplicate id "001"')

    const duplicateSlugs = await createFixture([
      { directory: 'quiet-garden', metadata: validWork() },
      { directory: 'small-world', metadata: validWork({ id: '002' }) },
    ])
    await expect(createWorksManifest(duplicateSlugs)).rejects.toThrow(
      'duplicate slug "quiet-garden"',
    )
  })

  it('reports missing localized values, invalid status, and missing entry files', async () => {
    const missingId = await createFixture([
      { directory: 'quiet-garden', metadata: validWork({ id: undefined }) },
    ])
    await expect(createWorksManifest(missingId)).rejects.toThrow('id must be a non-empty string')

    const missingSlug = await createFixture([
      { directory: 'quiet-garden', metadata: validWork({ slug: undefined }) },
    ])
    await expect(createWorksManifest(missingSlug)).rejects.toThrow('slug must be a non-empty string')

    const missingTitle = await createFixture([
      { directory: 'quiet-garden', metadata: validWork({ title: { en: 'Quiet Garden' } }) },
    ])
    await expect(createWorksManifest(missingTitle)).rejects.toThrow('title.ko')

    const invalidStatus = await createFixture([
      { directory: 'quiet-garden', metadata: validWork({ status: 'preview' }) },
    ])
    await expect(createWorksManifest(invalidStatus)).rejects.toThrow('status must be one of')

    const missingEntry = await createFixture([
      { directory: 'quiet-garden', metadata: validWork(), files: ['thumbnail.webp'] },
    ])
    await expect(createWorksManifest(missingEntry)).rejects.toThrow('entry file not found')
  })

  it('requires metadata for each work directory', async () => {
    const worksDirectory = await createFixture([
      { directory: 'quiet-garden', metadata: validWork() },
    ])
    await mkdir(join(worksDirectory, 'missing-metadata'))

    await expect(createWorksManifest(worksDirectory)).rejects.toThrow('required metadata file is missing')
  })
})
