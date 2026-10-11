import { readdir, readFile, stat } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'

const locales = ['en', 'ko']
const validStatuses = new Set(['published', 'draft', 'unpublished'])

function fail(file, message) {
  throw new Error(`${file}: ${message}`)
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function requireText(value, file, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    fail(file, `${label} must be a non-empty string`)
  }
}

function requireLocalizedText(value, file, label) {
  if (!isRecord(value)) fail(file, `${label} must provide en and ko values`)

  for (const locale of locales) {
    requireText(value[locale], file, `${label}.${locale}`)
  }
}

async function resolveReferencedFile(workDirectory, value, file, label) {
  requireText(value, file, label)

  if (isAbsolute(value) || value.includes('\\')) {
    fail(file, `${label} must be a relative web path`)
  }

  const path = value.replace(/^\.\//, '')
  const segments = path.split('/')
  if (segments.some((segment) => segment.length === 0 || segment === '..' || segment === '.')) {
    fail(file, `${label} must stay inside its work directory`)
  }

  const resolvedPath = resolve(workDirectory, ...segments)
  const workRelativePath = relative(workDirectory, resolvedPath)
  if (workRelativePath.startsWith(`..${sep}`) || workRelativePath === '..') {
    fail(file, `${label} must stay inside its work directory`)
  }

  let fileInfo
  try {
    fileInfo = await stat(resolvedPath)
  } catch {
    fail(file, `${label} file not found: ${value}`)
  }

  if (!fileInfo.isFile()) fail(file, `${label} must point to a file: ${value}`)
  return path
}

async function readWork(workDirectory, directoryName) {
  const metadataPath = resolve(workDirectory, 'work.json')
  let metadata

  try {
    metadata = JSON.parse(await readFile(metadataPath, 'utf8'))
  } catch (error) {
    if (error instanceof SyntaxError) fail(metadataPath, `invalid JSON: ${error.message}`)
    if (error.code === 'ENOENT') fail(metadataPath, 'required metadata file is missing')
    throw error
  }

  if (!isRecord(metadata)) fail(metadataPath, 'metadata must be a JSON object')

  requireText(metadata.id, metadataPath, 'id')
  requireText(metadata.slug, metadataPath, 'slug')
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.slug)) {
    fail(metadataPath, 'slug must use lowercase letters, numbers, and hyphens')
  }
  requireLocalizedText(metadata.title, metadataPath, 'title')
  requireLocalizedText(metadata.category, metadataPath, 'category')
  requireLocalizedText(metadata.description, metadataPath, 'description')
  requireText(metadata.year, metadataPath, 'year')
  if (!validStatuses.has(metadata.status)) {
    fail(metadataPath, 'status must be one of: published, draft, unpublished')
  }

  const entryPath = await resolveReferencedFile(
    workDirectory,
    metadata.entry,
    metadataPath,
    'entry',
  )

  let thumbnailPath
  if (metadata.thumbnail !== undefined && metadata.thumbnail !== null) {
    thumbnailPath = await resolveReferencedFile(
      workDirectory,
      metadata.thumbnail,
      metadataPath,
      'thumbnail',
    )
  }

  const entryUrl = entryPath === 'index.html'
    ? `/works/${metadata.slug}/`
    : `/works/${metadata.slug}/${entryPath.split('/').map(encodeURIComponent).join('/')}`

  return {
    id: metadata.id,
    slug: metadata.slug,
    title: { en: metadata.title.en, ko: metadata.title.ko },
    category: { en: metadata.category.en, ko: metadata.category.ko },
    description: { en: metadata.description.en, ko: metadata.description.ko },
    year: metadata.year,
    thumbnail: thumbnailPath
      ? `/works/${metadata.slug}/${thumbnailPath.split('/').map(encodeURIComponent).join('/')}`
      : undefined,
    entry: entryUrl,
    status: metadata.status,
    directoryName,
  }
}

export async function createWorksManifest(worksDirectory) {
  const worksPath = resolve(worksDirectory)
  const directoryEntries = await readdir(worksPath, { withFileTypes: true })
  const workDirectories = directoryEntries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))

  const ids = new Map()
  const slugs = new Map()
  const works = []

  for (const directory of workDirectories) {
    const workDirectory = resolve(worksPath, directory.name)
    const work = await readWork(workDirectory, directory.name)

    if (ids.has(work.id)) {
      fail(
        resolve(workDirectory, 'work.json'),
        `duplicate id "${work.id}" also used by ${ids.get(work.id)}`,
      )
    }
    if (slugs.has(work.slug)) {
      fail(
        resolve(workDirectory, 'work.json'),
        `duplicate slug "${work.slug}" also used by ${slugs.get(work.slug)}`,
      )
    }
    if (work.slug !== directory.name) {
      fail(
        resolve(workDirectory, 'work.json'),
        `slug must match its directory name (${directory.name})`,
      )
    }

    ids.set(work.id, resolve(workDirectory, 'work.json'))
    slugs.set(work.slug, resolve(workDirectory, 'work.json'))
    if (work.status === 'published') {
      const { directoryName: _directoryName, ...publishedWork } = work
      works.push(publishedWork)
    }
  }

  return works
}
