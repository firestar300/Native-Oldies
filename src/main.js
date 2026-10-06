import './styles/main.css'
import { projects, STATUSES, STATUS_ORDER } from './data/projects.js'
import { LINK_ICON_HTML, bindAnimatedLinkIcon } from './link-icon.js'
import { mountThemeIcons, startThemeIconLoops } from './theme-icons.js'

/* -------------------------------------------------------------------------- */
/* Static content                                                             */
/* -------------------------------------------------------------------------- */

/** Intrinsic cover size (px); keep in sync with scripts/fetch-covers.mjs. Reserves space and avoids layout shift. */
const COVER_SIZE = { width: 480, height: 640 }

/** Number of first visible covers loaded eagerly; the rest is lazy-loaded. */
const EAGER_COVERS = 10

const coverFiles = import.meta.glob('./assets/covers/*', { eager: true, query: '?url', import: 'default' })
const coverById = Object.fromEntries(
  Object.entries(coverFiles).map(([path, url]) => [path.split('/').pop().replace(/\.[^.]+$/, ''), url]),
)

const ICONS = {
  github:
    '<svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z"/></svg>',
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const $ = (selector) => document.querySelector(selector)

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

const normalize = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const countBy = (items, getKey) =>
  items.reduce((counts, item) => counts.set(getKey(item), (counts.get(getKey(item)) ?? 0) + 1), new Map())

const sortedKeysByCount = (counts) =>
  [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a) || a.localeCompare(b))

const SORTERS = {
  title: (a, b) => a.game.localeCompare(b.game) || a.project.localeCompare(b.project),
  oldest: (a, b) => a.year - b.year || SORTERS.title(a, b),
  newest: (a, b) => b.year - a.year || SORTERS.title(a, b),
}

/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */

const initTheme = () => {
  const button = $('#theme-toggle')
  const root = document.documentElement

  mountThemeIcons(button)
  startThemeIconLoops(button)

  const syncLabel = () => {
    const isDark = root.classList.contains('dark')
    button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode')
  }

  button.addEventListener('click', () => {
    const isDark = root.classList.toggle('dark')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
    syncLabel()
  })
  syncLabel()
}

/* -------------------------------------------------------------------------- */
/* Cards                                                                      */
/* -------------------------------------------------------------------------- */

const renderLinks = (project, variant) => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  const styles = {
    primary: `${base} bg-white text-black hover:bg-accent hover:text-on-accent`,
    secondary:
      variant === 'overlay'
        ? `${base} border border-white/40 text-white hover:border-white hover:bg-white/15`
        : `${base} border border-line text-ink hover:border-accent hover:text-accent`,
  }
  const primaryStyle = variant === 'overlay' ? styles.primary : `${base} bg-ink text-paper hover:bg-accent hover:text-on-accent`

  const link = (href, style, icon, label, { hideLabel = false, website = false } = {}) => {
    const labelMarkup = hideLabel
      ? `<span class="sr-only">${escapeHtml(label)}</span>`
      : `<span>${escapeHtml(label)}</span>`
    const layoutClass = website ? ' card-website-link' : ' flex-1'
    return `
    <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="${style}${layoutClass}">
      ${icon}${labelMarkup}<span class="sr-only"> for ${escapeHtml(project.project)} (opens in a new tab)</span>
    </a>`
  }

  return [
    link(project.repo, primaryStyle, ICONS.github, 'GitHub'),
    project.website ? link(project.website, styles.secondary, LINK_ICON_HTML, 'Website', { hideLabel: true, website: true }) : '',
  ].join('')
}

const renderCover = (project) => {
  const url = coverById[project.id]
  if (!url) {
    return `
      <div class="flex h-full items-center justify-center bg-gradient-to-br from-accent-2/40 to-accent/40 p-4 text-center">
        <span class="font-pixel text-sm text-ink">${escapeHtml(project.game)}</span>
      </div>`
  }
  return `
    <img src="${url}" alt="Cover of ${escapeHtml(project.game)}" width="${COVER_SIZE.width}" height="${COVER_SIZE.height}" loading="lazy" decoding="async"
      class="size-full object-cover transition duration-300 group-hover:scale-[1.03] group-focus-within:scale-[1.03]" />`
}

const renderStatusTag = (project) => {
  const label = STATUSES[project.status] ?? project.status
  return `<span class="status-tag status-tag--${escapeHtml(project.status)}">${escapeHtml(label)}</span>`
}

const renderCard = (project) => {
  const item = document.createElement('li')
  item.dataset.id = project.id
  item.innerHTML = `
    <article class="group flex h-full flex-col">
      <div class="relative aspect-[3/4] overflow-hidden rounded-xl border border-line bg-card shadow-sm transition duration-300 group-hover:-translate-y-1 group-hover:shadow-xl group-hover:shadow-accent/20 group-focus-within:-translate-y-1 group-focus-within:shadow-xl group-focus-within:shadow-accent/20">
        ${renderStatusTag(project)}
        ${renderCover(project)}
        <!-- Hover / focus overlay (pointer devices) -->
        <div class="absolute inset-0 flex flex-col justify-end gap-3 bg-gradient-to-t from-black/95 via-black/75 to-black/10 p-3 text-white opacity-0 transition duration-200 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:hidden sm:p-4">
          <p class="line-clamp-4 text-pretty text-sm leading-snug text-white/85">${escapeHtml(project.summary)}</p>
          <div class="flex gap-2">${renderLinks(project, 'overlay')}</div>
        </div>
      </div>
      <div class="mt-3 flex flex-1 flex-col gap-1.5">
        <h2 class="text-balance text-base font-semibold leading-tight">${escapeHtml(project.game)}</h2>
        <p class="text-sm font-medium text-accent">${escapeHtml(project.project)}</p>
        <p class="mt-auto flex flex-wrap gap-x-2 gap-y-1 pt-1 text-xs text-muted">
          <span>${escapeHtml(project.platform)}</span><span aria-hidden="true">·</span>
          <span>${project.year}</span><span aria-hidden="true">·</span>
          <span>${escapeHtml(project.approach)}</span>
        </p>
        <!-- Touch devices have no hover: links are always visible -->
        <div class="mt-2 hidden gap-2 [@media(hover:none)]:flex">${renderLinks(project, 'inline')}</div>
      </div>
    </article>`
  item.querySelectorAll('.card-website-link').forEach(bindAnimatedLinkIcon)
  return item
}

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

const renderChips = (container, name, counts, selected, onChange, { orderedKeys } = {}) => {
  const keys = orderedKeys ?? sortedKeysByCount(counts)
  container.innerHTML = keys
    .filter((value) => counts.has(value))
    .map((value) => {
      const label = STATUSES[value] ?? value
      return `
      <label class="chip relative">
        <input type="checkbox" name="${name}" value="${escapeHtml(value)}" ${selected.has(value) ? 'checked' : ''} />
        <span>${escapeHtml(label)}<small class="chip-count">${counts.get(value)}</small></span>
      </label>`
    })
    .join('')
  container.addEventListener('change', (event) => {
    const { value, checked } = event.target
    if (!value) return
    checked ? selected.add(value) : selected.delete(value)
    onChange()
  })
}

/* -------------------------------------------------------------------------- */
/* App                                                                        */
/* -------------------------------------------------------------------------- */

const readStateFromUrl = () => {
  const params = new URLSearchParams(location.search)
  const list = (key) => new Set((params.get(key) ?? '').split(',').filter(Boolean))
  return {
    query: params.get('q') ?? '',
    platforms: list('console'),
    approaches: list('type'),
    statuses: list('status'),
    sort: Object.keys(SORTERS).includes(params.get('sort')) ? params.get('sort') : 'title',
  }
}

const writeStateToUrl = (state) => {
  const params = new URLSearchParams()
  if (state.query) params.set('q', state.query)
  if (state.platforms.size) params.set('console', [...state.platforms].join(','))
  if (state.approaches.size) params.set('type', [...state.approaches].join(','))
  if (state.statuses.size) params.set('status', [...state.statuses].join(','))
  if (state.sort !== 'title') params.set('sort', state.sort)
  const search = params.toString()
  history.replaceState(null, '', search ? `?${search}` : location.pathname)
}

const initApp = () => {
  const state = readStateFromUrl()

  const grid = $('#grid')
  const searchInput = $('#search')
  const sortSelect = $('#sort')
  const resultCount = $('#result-count')
  const emptyState = $('#empty-state')
  const resetButton = $('#reset-filters')

  const searchIndex = new Map(
    projects.map((project) => [
      project.id,
      normalize([project.game, project.project, project.platform, project.approach, STATUSES[project.status], project.summary].join(' ')),
    ]),
  )
  const cards = new Map(projects.map((project) => [project.id, renderCard(project)]))

  const matches = (project) => {
    const tokens = normalize(state.query).split(/\s+/).filter(Boolean)
    const haystack = searchIndex.get(project.id)
    return (
      tokens.every((token) => haystack.includes(token)) &&
      (!state.platforms.size || state.platforms.has(project.platform)) &&
      (!state.approaches.size || state.approaches.has(project.approach)) &&
      (!state.statuses.size || state.statuses.has(project.status))
    )
  }

  const update = () => {
    const ordered = [...projects].sort(SORTERS[state.sort])
    const visible = ordered.filter(matches)
    const visibleIds = new Set(visible.map((project) => project.id))

    // Re-append in order: moves existing nodes, no image reload.
    ordered.forEach((project) => {
      const card = cards.get(project.id)
      card.hidden = !visibleIds.has(project.id)
      grid.append(card)
    })

    // Load the first visible covers right away, keep the rest lazy.
    visible.forEach((project, index) => {
      const cover = cards.get(project.id).querySelector('img')
      if (cover) cover.loading = index < EAGER_COVERS ? 'eager' : 'lazy'
    })

    const isFiltered = Boolean(state.query || state.platforms.size || state.approaches.size || state.statuses.size)
    resultCount.textContent = isFiltered
      ? `${visible.length} of ${projects.length} ports`
      : `${projects.length} ports`
    emptyState.hidden = visible.length > 0
    emptyState.classList.toggle('hidden', visible.length > 0)
    resetButton.classList.toggle('hidden', !isFiltered)
    writeStateToUrl(state)
  }

  renderChips($('#platform-filters'), 'console', countBy(projects, (p) => p.platform), state.platforms, update)
  renderChips($('#approach-filters'), 'type', countBy(projects, (p) => p.approach), state.approaches, update)
  renderChips($('#status-filters'), 'status', countBy(projects, (p) => p.status), state.statuses, update, {
    orderedKeys: STATUS_ORDER,
  })

  searchInput.value = state.query
  sortSelect.value = state.sort

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value.trim()
    update()
  })
  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value
    update()
  })
  resetButton.addEventListener('click', () => {
    state.query = ''
    state.platforms.clear()
    state.approaches.clear()
    state.statuses.clear()
    searchInput.value = ''
    document.querySelectorAll('.chip input').forEach((input) => (input.checked = false))
    update()
    searchInput.focus()
  })

  // "/" focuses the search, Escape clears it.
  document.addEventListener('keydown', (event) => {
    const isTyping = event.target.closest?.('input, textarea, select, [contenteditable]')
    if (event.key === '/' && !isTyping && !event.metaKey && !event.ctrlKey) {
      event.preventDefault()
      searchInput.focus()
    }
  })
  searchInput.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !searchInput.value) return
    searchInput.value = ''
    state.query = ''
    update()
  })

  $('#stat-projects').textContent = projects.length
  $('#stat-platforms').textContent = new Set(projects.map((p) => p.platform)).size

  update()
}

initTheme()
initApp()
