/**
 * Persistent Twitch box art cache for decomp.dev imports (key: owner/repo).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const CACHE_PATH = fileURLToPath(
  new URL('../src/data/decomp-dev-twitch-cache.json', import.meta.url),
)

/** @typedef {{ twitchBoxArtId: number, twitchCoverUrl?: string, twitchName?: string }} DecompDevTwitchCacheEntry */

/** @returns {Promise<Record<string, DecompDevTwitchCacheEntry>>} */
export const loadTwitchCache = async () => {
  try {
    const raw = await readFile(CACHE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** @param {Record<string, DecompDevTwitchCacheEntry>} cache */
export const saveTwitchCache = async (cache) => {
  await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`)
}
