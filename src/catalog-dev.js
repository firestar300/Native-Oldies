/** True during Vite dev or when the built app is opened on localhost. */
export const isLocalCatalogDev = () =>
  import.meta.env.DEV || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(globalThis.location?.hostname ?? '')

/** @param {import('./data/projects.js').projects[number]} project */
/** @param {Record<string, string>} coverById */
export const hasCatalogCover = (project, coverById) => Boolean(coverById[project.id])

/** @param {import('./data/projects.js').projects[number]} project */
export const hasCatalogYear = (project) => Number(project.year) > 0

/** @param {import('./data/projects.js').projects[number]} project */
/** @param {Record<string, string>} coverById */
export const isCatalogIncomplete = (project, coverById) =>
  !hasCatalogCover(project, coverById) || !hasCatalogYear(project)
