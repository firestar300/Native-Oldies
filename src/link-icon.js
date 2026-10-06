/**
 * Animated link icon ported from lucide-animated (MIT).
 * @see https://lucide-animated.com/icons/link
 */

const LINK_PATHS = [
  'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
  'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
]

/** Inline SVG markup for website card buttons. */
export const LINK_ICON_HTML = `
<svg class="link-icon size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <g class="link-icon__motion" style="transform-origin: 12px 12px">
    ${LINK_PATHS.map((d) => `<path data-link-path d="${d}" />`).join('')}
  </g>
</svg>`

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** @param {SVGSVGElement} svg */
const resetLinkIcon = (svg) => {
  svg.getAnimations().forEach((animation) => animation.cancel())
  svg.querySelectorAll('[data-link-path]').forEach((path) => {
    path.style.strokeDasharray = ''
    path.style.strokeDashoffset = ''
  })
  const motion = svg.querySelector('.link-icon__motion')
  if (motion) motion.style.transform = ''
}

/** @param {SVGSVGElement} svg */
const playLinkIcon = (svg) => {
  if (prefersReducedMotion()) return

  resetLinkIcon(svg)

  const motion = svg.querySelector('.link-icon__motion')
  if (motion) {
    motion.animate(
      [{ transform: 'rotate(0deg)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(0deg)' }],
      { duration: 1000, easing: 'ease-in-out' },
    )
  }

  svg.querySelectorAll('[data-link-path]').forEach((path) => {
    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.animate(
      [
        { strokeDashoffset: 0 },
        { strokeDashoffset: length * 0.05, offset: 0.2 },
        { strokeDashoffset: 0, offset: 0.4 },
        { strokeDashoffset: length * 0.05, offset: 0.6 },
        { strokeDashoffset: 0, offset: 1 },
      ],
      { duration: 1000, easing: 'ease-in-out' },
    )
  })
}

/**
 * Play the lucide-animated link motion when the website button is hovered or focused.
 *
 * @param {HTMLAnchorElement} anchor
 */
export const bindAnimatedLinkIcon = (anchor) => {
  const svg = anchor.querySelector('.link-icon')
  if (!svg) return

  const onEnter = () => playLinkIcon(svg)
  const onLeave = () => resetLinkIcon(svg)

  anchor.addEventListener('mouseenter', onEnter)
  anchor.addEventListener('mouseleave', onLeave)
  anchor.addEventListener('focus', onEnter)
  anchor.addEventListener('blur', onLeave)
}
