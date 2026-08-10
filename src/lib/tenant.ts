const ROOT_DOMAIN = (import.meta.env.VITE_ROOT_DOMAIN || 'eduprime.app').toLowerCase()

const RESERVED_SLUGS = new Set(['www', 'app', 'api', 'admin', 'mail', 'default', 'assets', 'static'])

/**
 * True for hostnames that are the platform itself, never a tenant: local
 * dev, Vercel previews, and the bare root domain (with or without "www").
 * Distinct from resolveSlugFromHostname returning null, which can also
 * mean "not a subdomain, but might still be an org's custom domain" —
 * callers need to tell those two "null" cases apart.
 */
export function isPlatformRootHost(hostname: string): boolean {
  const host = hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1') return true
  if (host.endsWith('.vercel.app')) return true
  if (host === ROOT_DOMAIN || host === `www.${ROOT_DOMAIN}`) return true
  return false
}

/**
 * Maps a browser hostname to an organization slug, for the
 * orgname.eduprime.app form specifically. Returns null both for platform
 * root hosts and for anything that isn't a subdomain of ROOT_DOMAIN at all
 * (including a genuine custom domain) — check isPlatformRootHost first if
 * the distinction matters.
 */
export function resolveSlugFromHostname(hostname: string): string | null {
  const host = hostname.toLowerCase()

  if (isPlatformRootHost(host)) return null

  // foo.localhost during local dev
  const localParts = host.split('.')
  if (localParts.length === 2 && localParts[1] === 'localhost') {
    return localParts[0]
  }

  if (host.endsWith(`.${ROOT_DOMAIN}`)) {
    const slug = host.slice(0, -(ROOT_DOMAIN.length + 1))
    return slug || null
  }

  return null
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase())
}

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(slug)
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

export function orgUrl(slug: string): string {
  return `https://${slug}.${ROOT_DOMAIN}`
}

export { ROOT_DOMAIN }
