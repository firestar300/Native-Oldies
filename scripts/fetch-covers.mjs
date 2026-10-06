/**
 * Downloads missing cover art into src/assets/covers/<id>.webp from the Twitch CDN
 * (same box art as on twitch.tv/directory, sourced via IGDB), then resizes and
 * compresses it so the site stays light.
 *
 * Set twitchBoxArtId on each project (see the `_IGDB` segment in the box art URL on Twitch).
 *
 * Usage: npm run covers [-- --force]
 */
import { readdirSync } from 'node:fs'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { projects } from '../src/data/projects.js'

const OUT_DIR = fileURLToPath(new URL('../src/assets/covers/', import.meta.url))
const HEADERS = { 'User-Agent': 'native-oldies/1.0 (fan-port directory; cover fetcher)' }
const isForced = process.argv.includes('--force')

/** Covers are displayed at most ~240 CSS px wide: 480 px covers 2x screens. Keep in sync with COVER_SIZE in src/main.js. */
const COVER_WIDTH = 480
const COVER_HEIGHT = 640
const WEBP_QUALITY = 78

/** @param {number} igdbId */
const twitchBoxArtUrl = (igdbId) => `https://static-cdn.jtvnw.net/ttv-boxart/${igdbId}_IGDB.jpg`

const existingCover = (id) => readdirSync(OUT_DIR).find((file) => file.startsWith(`${id}.`))

const downloadCover = async (project) => {
  if (project.twitchBoxArtId == null) throw new Error('missing twitchBoxArtId')

  const url = twitchBoxArtUrl(project.twitchBoxArtId)
  const response = await fetch(url, { headers: HEADERS, redirect: 'follow' })
  if (!response.ok) throw new Error(`image responded ${response.status}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 5000) throw new Error('image too small (likely a placeholder)')

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
