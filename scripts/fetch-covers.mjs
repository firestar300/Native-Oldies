/**
 * Downloads missing cover art into src/assets/covers/<id>.webp from the Twitch CDN
 * (same box art as on twitch.tv/directory, sourced via IGDB), then resizes and
 * compresses it so the site stays light.
 *
 * Set twitchBoxArtId or twitchCoverUrl on each project.
 *
 * Usage: npm run covers [-- --force]
 */
import { readFileSync, readdirSync } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { projects } from '../src/data/projects.js'

const OUT_DIR = fileURLToPath(new URL('../src/assets/covers/', import.meta.url))
const HEADERS = { 'User-Agent': 'native-oldies/1.0 (fan-port directory; cover fetcher)' }
const isForced = process.argv.includes('--force')

/** Project ids with a hand-picked cover in src/assets/covers/ (see decomp-dev-cover-pins.json). */
const pinnedCoverIds = new Set(
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL('../src/data/decomp-dev-cover-pins.json', import.meta.url)),
      'utf8',
    ),
  ),
)

/** Covers are displayed at most ~240 CSS px wide: 480 px covers 2x screens. Keep in sync with COVER_SIZE in src/main.js. */
const COVER_WIDTH = 480
const COVER_HEIGHT = 640
const WEBP_QUALITY = 78

/** @param {import('../src/data/projects.js').projects[number]} project */
const resolveCoverUrls = (project) => {
  if (project.twitchCoverUrl) return [project.twitchCoverUrl]
  if (project.twitchBoxArtId == null) throw new Error('missing twitchBoxArtId or twitchCoverUrl')
  const id = project.twitchBoxArtId
  return [
    `https://static-cdn.jtvnw.net/ttv-boxart/${id}_IGDB.jpg`,
    `https://static-cdn.jtvnw.net/ttv-boxart/${id}-${COVER_WIDTH}x${COVER_HEIGHT}.jpg`,
  ]
}

const existingCover = (id) => readdirSync(OUT_DIR).find((file) => file.startsWith(`${id}.`))

const downloadCover = async (project) => {
  const urls = resolveCoverUrls(project)
  let buffer = null
  let lastStatus = 0

  for (const url of urls) {
    let response = await fetch(url, { headers: HEADERS, redirect: 'follow' })
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      response = await fetch(url, { headers: HEADERS, redirect: 'follow' })
    }
    lastStatus = response.status
    if (!response.ok) continue

    const candidate = Buffer.from(await response.arrayBuffer())
    if (candidate.length >= 5000) {
      buffer = candidate
      break
    }
  }

  if (!buffer) {
    throw new Error(
      lastStatus && lastStatus !== 200
        ? `image responded ${lastStatus}`
        : 'image too small (likely a placeholder)',
    )
  }

  const optimized = await sharp(buffer)
    .resize(COVER_WIDTH, COVER_HEIGHT, { fit: 'cover' })
    .webp({ quality: WEBP_QUALITY, effort: 6 })
    .toBuffer()

  // Drop a previous cover with another extension (e.g. legacy .jpg) before writing.
  const previous = existingCover(project.id)
  if (previous && previous !== `${project.id}.webp`) await unlink(join(OUT_DIR, previous))

  await writeFile(join(OUT_DIR, `${project.id}.webp`), optimized)
  return `.webp (${Math.round(optimized.length / 1024)} KB)`
}

await mkdir(OUT_DIR, { recursive: true })

let failures = 0
for (const project of projects) {
  if (pinnedCoverIds.has(project.id)) {
    console.log(`* ${project.id} (pinned cover)`)
    continue
  }
  if (project.twitchBoxArtId == null && !project.twitchCoverUrl) {
    console.log(`- ${project.id} (no cover id)`)
    continue
  }
  if (!isForced && existingCover(project.id)) {
    console.log(`= ${project.id} (already there)`)
    continue
  }
  try {
    const result = await downloadCover(project)
    console.log(`+ ${project.id}${result}`)
  } catch (error) {
    failures += 1
    console.error(`! ${project.id}: ${error.message}`)
  }
}

if (failures) process.exitCode = 1
