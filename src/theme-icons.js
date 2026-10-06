/**
 * Theme toggle icons with animations ported from lucide-animated (MIT).
 * @see https://lucide-animated.com/icons/moon
 * @see https://lucide-animated.com/icons/sun
 */

const COOLDOWN_MS = 3000
const MOON_DURATION_MS = 1200
const SUN_RAY_DURATION_MS = 300
const SUN_RAY_STAGGER_MS = 100

const SUN_RAYS = [
  'M12 2v2',
  'm19.07 4.93-1.41 1.41',
  'M20 12h2',
  'm17.66 17.66 1.41 1.41',
  'M12 20v2',
  'm6.34 17.66-1.41 1.41',
  'M2 12h2',
  'm4.93 4.93 1.41 1.41',
]

const svgAttrs = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': '2',
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
  'aria-hidden': 'true',
  class: 'size-full',
}

/** @param {Record<string, string>} attrs */
const createSvg = (attrs) => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  Object.entries({ ...svgAttrs, ...attrs }).forEach(([key, value]) => svg.setAttribute(key, value))
  return svg
}

const createMoonIcon = () => {
  const wrap = document.createElement('span')
  wrap.className = 'theme-icon inline-flex size-5 dark:hidden'
  wrap.dataset.themeIcon = 'moon'

  const svg = createSvg({})
  svg.style.transformOrigin = '12px 12px'
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z')
  svg.append(path)
  wrap.append(svg)
  return wrap
}

const createSunIcon = () => {
  const wrap = document.createElement('span')
  wrap.className = 'theme-icon hidden size-5 dark:inline-flex'
  wrap.dataset.themeIcon = 'sun'

  const svg = createSvg({})
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  circle.setAttribute('cx', '12')
  circle.setAttribute('cy', '12')
  circle.setAttribute('r', '4')
  svg.append(circle)

  SUN_RAYS.forEach((d) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', d)
    path.dataset.ray = 'true'
    svg.append(path)
  })

  wrap.append(svg)
  return wrap
}

/** @param {SVGSVGElement} svg */
const animateMoon = (svg) =>
  svg.animate(
    [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(-10deg)' },
      { transform: 'rotate(10deg)' },
      { transform: 'rotate(-5deg)' },
      { transform: 'rotate(5deg)' },
      { transform: 'rotate(0deg)' },
    ],
    { duration: MOON_DURATION_MS, easing: 'ease-in-out' },
  ).finished

/** @param {SVGSVGElement} svg */
const animateSun = (svg) => {
  const rays = [...svg.querySelectorAll('[data-ray]')]
  rays.forEach((ray) => {
    ray.style.opacity = '0'
  })

  return Promise.all(
    rays.map(
      (ray, index) =>
        ray.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: SUN_RAY_DURATION_MS,
          delay: (index + 1) * SUN_RAY_STAGGER_MS,
          easing: 'ease-out',
          fill: 'forwards',
        }).finished,
    ),
  )
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Mount lucide-animated-style icons and loop their animations (3s cooldown between cycles).
 *
 * @param {HTMLButtonElement} button
 */
export const mountThemeIcons = (button) => {
  button.replaceChildren(createMoonIcon(), createSunIcon())
}

/**
 * @param {HTMLButtonElement} button
 * @returns {() => void} stop function
 */
export const startThemeIconLoops = (button) => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {}

  let stopped = false

  const run = async () => {
    while (!stopped) {
      const isDark = document.documentElement.classList.contains('dark')
      const icon = button.querySelector(`[data-theme-icon="${isDark ? 'sun' : 'moon'}"]`)
      const svg = icon?.querySelector('svg')
      if (svg) {
        if (isDark) await animateSun(svg)
        else await animateMoon(svg)
      }
      if (stopped) break
      await sleep(COOLDOWN_MS)
    }
  }

  run()

  return () => {
    stopped = true
  }
}
