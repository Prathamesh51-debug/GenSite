// Per-route document metadata. React 19 hoists <title>/<meta>/<link> rendered
// anywhere in the tree up to <head>, so this needs no extra library. Drives the
// browser tab title and gives JS-rendering crawlers (e.g. Google) per-page titles.
// Social scrapers that don't run JS fall back to the static tags in index.html.

const SITE = 'GenSite'
const BASE_URL = 'https://ai-website-builder-prathamesh-three-amber.vercel.app'
const DEFAULT_DESC = 'Turn a single prompt into a complete, responsive, publishable website — with AI.'

interface SeoProps {
  /** Page title; combined as "Title — GenSite". Omit for the brand default. */
  title?: string
  description?: string
  /** Path for canonical/og:url, e.g. "/pricing". */
  path?: string
}

const Seo = ({ title, description = DEFAULT_DESC, path = '' }: SeoProps) => {
  const fullTitle = title ? `${title} — ${SITE}` : `${SITE} — AI Website Builder`
  const url = `${BASE_URL}${path}`
  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </>
  )
}

export default Seo
