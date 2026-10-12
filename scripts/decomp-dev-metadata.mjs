/**
 * Release year and cover lookups for decomp.dev imports (Wikipedia REST API).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const CACHE_PATH = fileURLToPath(new URL('../src/data/decomp-dev-metadata-cache.json', import.meta.url))
const WIKI_HEADERS = { 'User-Agent': 'native-oldies/1.0 (decomp.dev metadata; github.com)' }

/** @typedef {{ year?: number }} DecompDevMetadata */

const NON_GAME_NAME_RULES = [
  /\bexpansion kit\b/i,
  /\bpsy-q sdk\b/i,
  /\bosdsys\b/i,
  /\bwii menu\b/i,
  /\bforecast channel\b/i,
  /\bn64 emulator for\b/i,
  /\bemulator for (?:wii|gamecube)\b/i,
  /\bgamecube and wii emulator\b/i,
  /\bsdk libraries\b/i,
]

/**
 * @param {string} name
 * @param {string} _repo
 */
export const isDecompDevGame = (name, _repo) => {
  const normalized = name.trim()
  if (!normalized) return false
  if (/^lsd:\s*dream emulator$/i.test(normalized)) return true
  if (/\bemulator\b/i.test(normalized) && !/dream emulator/i.test(normalized)) return false
  return !NON_GAME_NAME_RULES.some((rule) => rule.test(normalized))
}

/** @param {string} title */
export const cleanGameTitle = (title) =>
  title
    .replace(/\s*\(Fork:\s*[^)]+\)\s*/gi, ' ')
    .replace(/\s*\([^)]*\bv\d+(?:\.\d+)*[^)]*\)\s*/gi, ' ')
    .replace(/\s*\((?:PAL|NTSC|USA|EUR|Europe|Japan|JP|En,[^)]+|\d{4})[^)]*\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * @param {string} gameName
 * @param {string} [shortName]
 */
export const buildMetadataSearchTitles = (gameName, shortName) => {
  const primary = cleanGameTitle(gameName)
  const titles = []
  if (primary) titles.push(primary)
  const short = shortName?.trim()
  if (short && short.length >= 3 && short.toLowerCase() !== primary.toLowerCase()) {
    if (primary.includes(':')) {
      const series = primary.split(':')[0].trim()
      if (series.length >= 3) titles.push(`${series}: ${short}`)
    } else {
      titles.push(short)
    }
  }
  if (primary) titles.push(`${primary} video game`)
  return [...new Set(titles)].slice(0, 4)
}

/** @param {string} title */
export const inferYearFromGameName = (title) => {
  const paren = title.match(/[(（]((19|20)\d{2})[)）]/)
  if (paren) return Number.parseInt(paren[1], 10)
  const tight = title.match(/(19|20)\d{2}(?=\))/)
  if (tight) return Number.parseInt(tight[0], 10)
  return undefined
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * @param {string} url
 * @param {RequestInit} init
 * @param {number} retries
 */
const fetchWithRetry = async (url, init, retries = 4) => {
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, init)
    if (response.status !== 429) return response
    await sleep(1500 * (attempt + 1))
  }
  return fetch(url, init)
}

/** @param {string} text */
const extractYear = (text) => {
  if (!text) return undefined
  const match = text.match(/\b(19[89]\d|20[0-3]\d)\b/)
  if (!match) return undefined
  const year = Number.parseInt(match[1], 10)
  return year > 1975 && year < 2035 ? year : undefined
}

const WIKI_LANGS = ['en', 'fr', 'de']

/**
 * @param {string} lang
 * @param {string} title
 */
const lookupOnWikipediaLang = async (lang, title) => {
  const openSearch = await fetchWithRetry(
    `https://${lang}.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(title)}&limit=1&namespace=0&format=json&origin=*`,
    { headers: WIKI_HEADERS },
  )
  if (!openSearch.ok) return null

  const [, titles] = await openSearch.json()
  const pageTitle = titles?.[0]
  if (!pageTitle) return null

  const summary = await fetchWithRetry(
    `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`,
    { headers: WIKI_HEADERS },
  )
  if (!summary.ok) return null

  const body = await summary.json()
  const year =
    extractYear(body.description) ?? extractYear(body.extract) ?? extractYear(body.title)
  return { year }
}

/**
 * @param {string} searchTitle
 * @param {{ shortName?: string }} [options]
 * @returns {Promise<DecompDevMetadata>}
 */
export const lookupDecompDevMetadata = async (searchTitle, options = {}) => {
  const result = {}
  const fromTitle = inferYearFromGameName(searchTitle)
  if (fromTitle) result.year = fromTitle

  const titles = buildMetadataSearchTitles(searchTitle, options.shortName)
  const mergeWiki = (wiki) => {
    if (!wiki?.year) return
    if (!result.year) result.year = wiki.year
  }

  for (const title of titles) {
    mergeWiki(await lookupOnWikipediaLang('en', title))
    if (result.year) break
  }

  if (!result.year) {
    for (const title of titles) {
      for (const lang of WIKI_LANGS.slice(1)) {
        mergeWiki(await lookupOnWikipediaLang(lang, title))
        if (result.year) break
      }
      if (result.year) break
    }
  }

  return result
}

/** @returns {Promise<Record<string, DecompDevMetadata>>} */
export const loadMetadataCache = async () => {
  try {
    const raw = await readFile(CACHE_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** @param {Record<string, DecompDevMetadata>} cache */
export const saveMetadataCache = async (cache) => {
  await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`)
}

/**
 * @param {string} cacheKey
 * @param {string} gameTitle
 * @param {Record<string, DecompDevMetadata>} cache
 */
export const resolveCachedMetadata = async (cacheKey, gameTitle, cache) => {
  const existing = cache[cacheKey] ?? {}
  if (existing.year) return existing
  const fresh = await lookupDecompDevMetadata(gameTitle)
  cache[cacheKey] = { ...existing, ...fresh }
  return cache[cacheKey]
}
