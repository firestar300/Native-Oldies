/**
 * Animated external-link icon ported from lucide-animated (MIT).
 * @see https://lucide-animated.com/icons/external-link
 */

/** Inline SVG markup for website card buttons. */
export const LINK_ICON_HTML = `
<svg class="link-icon size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
  <g class="link-icon__arrow" style="transform-origin: 21px 3px">
    <path d="M15 3h6v6" />
    <path d="M10 14 21 3" />
  </g>
</svg>`

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** @param {SVGSVGElement} svg */
const resetLinkIcon = (svg) => {
  svg.getAnimations().forEach((animation) => animation.cancel())
  const arrow = svg.querySelector('.link-icon__arrow')
  if (!arrow) return
  arrow.getAnimations().forEach((animation) => animation.cancel())
  arrow.style.transform = ''
}

/** @param {SVGSVGElement} svg */
const playLinkIcon = (svg) => {
  if (prefersReducedMotion()) return

  resetLinkIcon(svg)

  const arrow = svg.querySelector('.link-icon__arrow')
  if (!arrow) return

  arrow.animate(
    [
      { transform: 'scale(1) translate(0px, 0px)' },
      { transform: 'scale(0.92) translate(2px, -2px)' },
      { transform: 'scale(1) translate(0px, 0px)' },
    ],
    { duration: 500, easing: 'ease-in-out' },
  )
}

/**
 * Play the lucide-animated external-link motion when the website button is hovered or focused.
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
