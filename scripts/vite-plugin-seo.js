/**
 * Build-time SEO plugin.
 *
 * - Replaces {{SITE_URL}}, {{TITLE}} and {{DESCRIPTION}} tokens in index.html.
 * - Injects JSON-LD (WebSite, CollectionPage + ItemList, FAQPage).
 * - Injects the visible FAQ section and a <noscript> list of every port,
 *   so crawlers and no-JS visitors get the content as plain HTML.
 * - Preloads the critical web fonts (hashed file names are only known at build time).
 * - Emits robots.txt and sitemap.xml.
 */
import { faqItems } from '../src/data/faq.js'
import { projects } from '../src/data/projects.js'

const NAME = 'Native Oldies'
const REPO_URL = 'https://github.com/firestar300/Native-Oldies'
const SITE_URL = (process.env.SITE_URL ?? 'https://firestar300.github.io/Native-Oldies/').replace(/\/*$/, '/')
const TITLE = `${NAME} — fan-made native PC ports of classic games`
const DESCRIPTION = `A directory of ${projects.length} fan-made native PC ports of classic console games: decompilations, static recompilations and reimplementations. No emulator required.`

/** Fonts used above the fold; matched against emitted asset file names. */
const PRELOADED_FONTS = [/space-grotesk-latin-wght-normal-.+\.woff2$/, /silkscreen-latin-400-normal-.+\.woff2$/]

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])

/** Serializes JSON for an inline <script>, neutralizing any "</script>" sequence. */
const toJsonLd = (data) => JSON.stringify(data).replace(/</g, '\\u003c')

const renderJsonLd = () => {
  const websiteId = `${SITE_URL}#website`
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: SITE_URL,
        name: NAME,
        description: DESCRIPTION,
        inLanguage: 'en',
      },
      {
        '@type': 'CollectionPage',
        '@id': `${SITE_URL}#webpage`,
        url: SITE_URL,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: 'en',
        isPartOf: { '@id': websiteId },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: projects.length,
          itemListElement: projects.map((project, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: `${project.game} — ${project.project}`,
            url: project.repo,
          })),
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: faqItems.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question,
          acceptedAnswer: { '@type': 'Answer', text: answer },
        })),
      },
    ],
  }
  return `<script type="application/ld+json">${toJsonLd(graph)}</script>`
}

const renderFaq = () => `
      <section aria-labelledby="faq-title" class="mt-20 border-t border-line pt-12">
        <h2 id="faq-title" class="font-pixel text-xl text-ink sm:text-2xl">Frequently asked questions</h2>
        <div class="mt-6 divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
          ${faqItems
            .map(
              ({ question, answer }) => `
          <details class="group">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left font-semibold text-ink hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent sm:px-5 [&::-webkit-details-marker]:hidden">
              <span>${escapeHtml(question)}</span>
              <svg class="size-4 shrink-0 text-muted transition group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <p class="px-4 pb-5 text-pretty leading-relaxed text-muted sm:px-5">${escapeHtml(answer)}</p>
          </details>`,
            )
            .join('')}
        </div>
      </section>`

const renderNoscript = () => `
      <noscript>
        <p class="mt-6 rounded-xl border border-line bg-card p-4 text-muted">
          JavaScript is needed to search and filter the list. Here are all the ports:
        </p>
        <ul class="mt-4 list-disc space-y-1 pl-6">
          ${projects
            .map(
              (project) =>
                `<li>${escapeHtml(project.game)} (${escapeHtml(project.platform)}, ${project.year}) — <a class="text-accent underline" href="${escapeHtml(project.repo)}">${escapeHtml(project.project)}</a></li>`,
            )
            .join('\n          ')}
        </ul>
      </noscript>`

const renderRobots = () => `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}sitemap.xml\n`

const renderSitemap = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}</loc>
    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`

/** @returns {import('vite').Plugin} */
export const seoPlugin = () => {
  let base = '/'

  return {
    name: 'native-oldies-seo',

    configResolved(config) {
      base = config.base
    },

    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const output = html
          .replaceAll('{{SITE_URL}}', SITE_URL)
          .replaceAll('{{TITLE}}', escapeHtml(TITLE))
          .replaceAll('{{DESCRIPTION}}', escapeHtml(DESCRIPTION))
          .replaceAll('{{PORT_COUNT}}', String(projects.length))
          .replaceAll('{{PLATFORM_COUNT}}', String(new Set(projects.map((project) => project.platform)).size))
          .replace('<!--seo:json-ld-->', renderJsonLd())
          .replace('<!--seo:faq-->', renderFaq())
          .replace('<!--seo:noscript-->', renderNoscript())

        // The bundle only exists at build time (not in the dev server).
        const fontFiles = context.bundle
          ? PRELOADED_FONTS.map((pattern) => Object.keys(context.bundle).find((fileName) => pattern.test(fileName))).filter(Boolean)
          : []

        const tags = fontFiles.map((fileName) => ({
          tag: 'link',
          attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `${base}${fileName}`, crossorigin: '' },
          injectTo: 'head',
        }))

        return { html: output, tags }
      },
    },

    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: renderRobots() })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: renderSitemap() })
    },
  }
}
