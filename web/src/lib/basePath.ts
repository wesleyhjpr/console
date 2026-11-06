export function getBasePath(): string {
  const runtimeBase = typeof document === 'undefined'
    ? null
    : document.querySelector<HTMLMetaElement>('meta[name="console-base-path"]')?.content
  const base = runtimeBase ?? import.meta.env.BASE_URL
  return !base || base === './' ? '/' : base
}

export function withBasePath(input: string | URL, base = getBasePath()): string {
  const url = String(input)
  if (base === '/') return url
  if (!url.startsWith('/') || url.startsWith('//')) {
    if (typeof window === 'undefined' || !/^(https?:|wss?:|\/\/)/.test(url)) return url
    const parsed = new URL(url, window.location.origin)
    const page = new URL(window.location.origin)
    const httpProtocol = parsed.protocol.replace(/^ws/, 'http')
    if (httpProtocol !== page.protocol || parsed.host !== page.host) return url
    parsed.pathname = withBasePath(parsed.pathname, base)
    return parsed.href
  }
  const prefix = base.replace(/\/$/, '')
  if (url === prefix || url.startsWith(`${prefix}/`) || url.startsWith(`${prefix}?`) || url.startsWith(`${prefix}#`)) return url
  return `${prefix}${url}`
}

export function withOptionalBasePath(url: string | null | undefined): string | undefined {
  return url == null ? undefined : withBasePath(url)
}

export function withoutBasePath(pathname: string, base = getBasePath()): string {
  const prefix = base.replace(/\/$/, '')
  if (prefix && pathname.toLowerCase() === prefix.toLowerCase()) return '/'
  if (prefix && pathname.toLowerCase().startsWith(`${prefix.toLowerCase()}/`)) return pathname.slice(prefix.length)
  return pathname
}

export function appFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (input instanceof Request) {
    const url = withBasePath(input.url)
    return globalThis.fetch(url === input.url ? input : new Request(url, input), init)
  }
  return globalThis.fetch(withBasePath(input), init)
}