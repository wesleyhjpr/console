import { afterEach, describe, expect, it, vi } from 'vitest'
import { appFetch, getBasePath, withBasePath, withoutBasePath } from './basePath'

afterEach(() => {
  document.querySelector('meta[name="console-base-path"]')?.remove()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('runtime base path', () => {
  it.each(['/', '/kubestellar/', '/tools/console/'])('uses %s instead of the compiled prefix', async (base) => {
    vi.stubEnv('BASE_URL', '/compiled/')
    const element = document.createElement('meta')
    element.name = 'console-base-path'
    element.content = base
    document.head.prepend(element)
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)

    expect(getBasePath()).toBe(base)
    expect(withBasePath('/logo.svg')).toBe(`${base}logo.svg`)
    expect(withoutBasePath(`${base}settings`)).toBe('/settings')
    const wsOrigin = window.location.origin.replace(/^http/, 'ws')
    expect(withBasePath(`${wsOrigin}/ws`)).toBe(`${wsOrigin}${base}ws`)
    await appFetch('/api/settings')
    expect(fetchMock).toHaveBeenCalledWith(`${base}api/settings`, undefined)
  })

  it('defaults a portable bundle to root when no server provides a base', () => {
    vi.stubEnv('BASE_URL', './')
    expect(getBasePath()).toBe('/')
  })
})

describe('withBasePath', () => {
  it.each([
    ['/api/health', '/kubestellar/api/health'],
    ['/', '/kubestellar/'],
    ['/login?next=%2Fclusters#session', '/kubestellar/login?next=%2Fclusters#session'],
    ['/kubestellar/api/health', '/kubestellar/api/health'],
    ['/kubestellar?demo=true', '/kubestellar?demo=true'],
    ['/kubestellar-other', '/kubestellar/kubestellar-other'],
    ['https://example.com/api', 'https://example.com/api'],
    ['http://localhost:8585/health', 'http://localhost:8585/health'],
    ['//example.com/logo.svg', '//example.com/logo.svg'],
    ['data:image/png;base64,abc', 'data:image/png;base64,abc'],
    ['#details', '#details'],
  ])('maps %s to %s', (input, expected) => {
    expect(withBasePath(input, '/kubestellar/')).toBe(expected)
  })

  it('preserves root deployments', () => {
    expect(withBasePath('/api/health', '/')).toBe('/api/health')
  })

  it('prefixes absolute same-origin HTTP and WebSocket URLs', () => {
    const origin = window.location.origin
    expect(withBasePath(`${origin}/api/health`, '/kubestellar/')).toBe(`${origin}/kubestellar/api/health`)
    const wsOrigin = origin.replace(/^http/, 'ws')
    expect(withBasePath(`${wsOrigin}/ws/events`, '/kubestellar/')).toBe(`${wsOrigin}/kubestellar/ws/events`)
  })
})

describe('appFetch', () => {
  it('prefixes local requests and preserves options', async () => {
    vi.stubEnv('BASE_URL', '/kubestellar/')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const options: RequestInit = { method: 'POST', body: '{}', credentials: 'same-origin' }
    await appFetch('/api/settings', options)
    expect(fetchMock).toHaveBeenCalledWith('/kubestellar/api/settings', options)
  })

  it('preserves external Request objects', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    const request = new Request('https://example.com/api')
    await appFetch(request)
    expect(fetchMock).toHaveBeenCalledWith(request, undefined)
  })

  it('prefixes same-origin URL objects', async () => {
    vi.stubEnv('BASE_URL', '/kubestellar/')
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}'))
    vi.stubGlobal('fetch', fetchMock)
    await appFetch(new URL('/api/health', window.location.origin))
    expect(fetchMock).toHaveBeenCalledWith(`${window.location.origin}/kubestellar/api/health`, undefined)
  })
})

describe('withoutBasePath', () => {
  it.each([
    ['/kubestellar/', '/'],
    ['/kubestellar', '/'],
    ['/kubestellar/clusters', '/clusters'],
    ['/KubeStellar/clusters', '/clusters'],
    ['/kubestellar-other/clusters', '/kubestellar-other/clusters'],
  ])('maps browser path %s to route %s', (input, expected) => {
    expect(withoutBasePath(input, '/kubestellar/')).toBe(expected)
  })
})