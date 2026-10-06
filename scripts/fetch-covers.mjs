/**
 * Downloads missing cover art into src/assets/covers/<id>.jpg from the Twitch CDN
 * (same box art as on twitch.tv/directory, sourced via IGDB).
 *
 * Set twitchBoxArtId on each project (see the `_IGDB` segment in the box art URL on Twitch).
 *
 * Usage: npm run covers [-- --force]
 */
import { readdirSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { projects } from '../src/data/projects.js'

const OUT_DIR = fileURLToPath(new URL('../src/assets/covers/', import.meta.url))
const HEADERS = { 'User-Agent': 'native-oldies/1.0 (fan-port directory; cover fetcher)' }
const isForced = process.argv.includes('--force')

/** @param {number} igdbId */
const twitchBoxArtUrl = (igdbId) => `https://static-cdn.jtvnw.net/ttv-boxart/${igdbId}_IGDB.jpg`

const hasCover = (id) => readdirSync(OUT_DIR).some((file) => file.startsWith(`${id}.`))

const downloadCover = async (project) => {
  if (project.twitchBoxArtId == null) throw new Error('missing twitchBoxArtId')

  const url = twitchBoxArtUrl(project.twitchBoxArtId)
  const response = await fetch(url, { headers: HEADERS, redirect: 'follow' })
  if (!response.ok) throw new Error(`image responded ${response.status}`)

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length < 5000) throw new Error('image too small (likely a placeholder)')

  await writeFile(join(OUT_DIR, `${project.id}.jpg`), buffer)
  return '.jpg'
}

await mkdir(OUT_DIR, { recursive: true })

let failures = 0
for (const project of projects) {
  if (!isForced && hasCover(project.id)) {
    console.log(`= ${project.id} (already there)`)
    continue
  }
  try {
    const extension = await downloadCover(project)
    console.log(`+ ${project.id}${extension}`)
  } catch (error) {
    failures += 1
    console.error(`! ${project.id}: ${error.message}`)
  }
}

if (failures) process.exitCode = 1
