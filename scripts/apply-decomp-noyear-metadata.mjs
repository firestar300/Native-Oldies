/**
 * One-shot merge of src/data/decomp-dev-noyear-metadata-patch.json into caches.
 * Usage: node scripts/apply-decomp-noyear-metadata.mjs
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const PATCH_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-noyear-metadata-patch.json', import.meta.url),
)
const METADATA_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-metadata-cache.json', import.meta.url),
)
const TWITCH_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-twitch-cache.json', import.meta.url),
)
const MANUAL_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-twitch-manual.json', import.meta.url),
)

/** @param {Record<string, unknown>} map */
/** @param {string} ownerRepo */
const resolveKey = (map, ownerRepo) => {
  if (map[ownerRepo]) return ownerRepo
  const lower = ownerRepo.toLowerCase()
  return Object.keys(map).find((key) => key.toLowerCase() === lower) ?? ownerRepo
}

const patch = JSON.parse(await readFile(PATCH_PATH, 'utf8'))
const metadata = JSON.parse(await readFile(METADATA_PATH, 'utf8'))
const twitch = JSON.parse(await readFile(TWITCH_PATH, 'utf8'))
const manual = JSON.parse(await readFile(MANUAL_PATH, 'utf8'))

for (const [ownerRepo, fields] of Object.entries(patch)) {
  const metaKey = resolveKey(metadata, ownerRepo)
  metadata[metaKey] = { ...(metadata[metaKey] ?? {}), ...fields.meta }

  if (fields.twitchBoxArtId != null) {
    const twitchKey = resolveKey(twitch, ownerRepo)
    twitch[twitchKey] = {
      ...twitch[twitchKey],
      twitchBoxArtId: fields.twitchBoxArtId,
      twitchName: fields.twitchName ?? twitch[twitchKey]?.twitchName ?? 'manual',
    }
    manual[twitchKey] = fields.twitchBoxArtId
  }
}

const sortedMetadata = Object.fromEntries(
  Object.keys(metadata)
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((key) => [key, metadata[key]]),
)

await writeFile(METADATA_PATH, `${JSON.stringify(sortedMetadata, null, 2)}\n`)
await writeFile(TWITCH_PATH, `${JSON.stringify(twitch, null, 2)}\n`)
await writeFile(MANUAL_PATH, `${JSON.stringify(manual, null, 2)}\n`)
console.log(`Merged ${Object.keys(patch).length} no-year metadata patches.`)
