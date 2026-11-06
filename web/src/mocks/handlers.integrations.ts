import { withBasePath } from '../lib/basePath'
import { http, HttpResponse, passthrough } from 'msw'
import { kubaraCatalogFixture } from './handlers.fixtures'

export function createIntegrationHandlers() {
  return [
  // ── Passthrough for Netlify Functions that work in demo mode ─────
  // These endpoints are backed by Netlify Functions and return real data
  // even in demo mode — let them through to the actual backend.
  // All use http.all (not http.get) so CORS OPTIONS preflights are not
  // swallowed by the catch-all /api/* handler (per feedback_msw_passthrough.md).
  http.all(withBasePath('/api/youtube/playlist'), () => passthrough()),
  http.all(withBasePath('/api/youtube/thumbnail/*'), () => passthrough()),
  http.all(withBasePath('/api/medium/blog'), () => passthrough()),
  http.all(withBasePath('/api/missions/file'), () => passthrough()),
  http.all(withBasePath('/api/missions/browse'), () => passthrough()),
  http.all(withBasePath('/api/missions/scores'), () => passthrough()),
  http.all(withBasePath('/api/missions/scores/*'), () => passthrough()),
  http.all(withBasePath('/api/rewards/github'), () => passthrough()),
  http.all(withBasePath('/api/rewards/badge/*'), () => passthrough()),
  http.all(withBasePath('/api/rewards/bonus'), () => passthrough()),
  http.all(withBasePath('/api/nps'), () => passthrough()),
  http.all(withBasePath('/api/acmm/scan'), () => passthrough()),
  http.all(withBasePath('/api/acmm/badge/*'), () => passthrough()),
  http.all(withBasePath('/api/github-pipelines'), () => passthrough()),
  http.all(withBasePath('/api/github-pipelines/mutate'), () => passthrough()),
  http.all(withBasePath('/api/feedback-app'), () => passthrough()),
  http.all(withBasePath('/api/nightly-e2e/runs'), () => passthrough()),
  http.all(withBasePath('/api/public/nightly-e2e/runs'), () => passthrough()),
  http.all(withBasePath('/api/analytics-dashboard'), () => passthrough()),
  http.all(withBasePath('/api/analytics-accm'), () => passthrough()),
  http.all(withBasePath('/api/issue-stats'), () => passthrough()),
  http.all(withBasePath('/api/affiliate/clicks'), () => passthrough()),
  http.all(withBasePath('/api/gtag'), () => passthrough()),
  http.all(withBasePath('/api/ksc'), () => passthrough()),
  http.all(withBasePath('/api/m'), () => passthrough()),
  http.all(withBasePath('/api/send'), () => passthrough()),
  http.all(withBasePath('/api/identity/oidc/summary'), () => passthrough()),
  http.all(withBasePath('/api/identity/oidc/providers'), () => passthrough()),
  http.all(withBasePath('/api/identity/oidc/sessions'), () => passthrough()),
  http.all(withBasePath('/api/identity/rbac/summary'), () => passthrough()),
  http.all(withBasePath('/api/identity/rbac/bindings'), () => passthrough()),
  http.all(withBasePath('/api/identity/rbac/findings'), () => passthrough()),
  http.all(withBasePath('/api/identity/sessions/summary'), () => passthrough()),
  http.all(withBasePath('/api/identity/sessions/active'), () => passthrough()),
  http.all(withBasePath('/api/identity/sessions/policies'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/siem/events'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/siem/alerts'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/siem/summary'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/incidents'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/incidents/metrics'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/incidents/playbooks'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/threat-intel/feeds'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/threat-intel/iocs'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/threat-intel/summary'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/erm/risk-matrix/risks'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/erm/risk-matrix/heatmap'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/erm/risk-matrix/summary'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/erm/risk-register/risks'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/erm/risk-register/categories'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/erm/risk-register/summary'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/erm/risk-appetite/thresholds'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/erm/risk-appetite/kris'), () => passthrough()),
  http.all(withBasePath('/api/v1/compliance/erm/risk-appetite/summary'), () => passthrough()),
  http.all(withBasePath('/api/supply-chain/sbom/documents'), () => passthrough()),
  http.all(withBasePath('/api/supply-chain/sbom/summary'), () => passthrough()),
  http.all(withBasePath('/api/supply-chain/licenses/packages'), () => passthrough()),
  http.all(withBasePath('/api/supply-chain/licenses/categories'), () => passthrough()),
  http.all(withBasePath('/api/supply-chain/licenses/summary'), () => passthrough()),

  // ── Kubara Platform Catalog (demo fixtures — #8486) ─────────────
  // Realistic fixture snapshots matching the GitHub Contents API shape
  // returned by the kubara-io/kubara repo. Each entry mirrors a real
  // chart directory with sha, size, git URLs, and download links so that
  // downstream components exercising those fields work correctly in demo.
  http.get(withBasePath('/api/github/repos/kubara-io/kubara/contents/*'), () => {
    return HttpResponse.json(kubaraCatalogFixture)
  }),

  // Server-side Kubara catalog endpoint (Go handler with cache — #8487).
  // In demo mode this is intercepted by MSW; the GO handler also returns
  // demo data when it sees X-Demo-Mode, but belt-and-suspenders is safer.
  http.get(withBasePath('/api/kubara/catalog'), () => {
    return HttpResponse.json({
      entries: kubaraCatalogFixture,
      source: 'demo',
    })
  }),

  // Kubara config endpoint — returns the active catalog repo and path.
  // In demo mode we always return the default public catalog coordinates.
  http.get(withBasePath('/api/kubara/config'), () => {
    return HttpResponse.json({
      repo: 'kubara-io/kubara',
      path: 'go-binary/templates/embedded/managed-service-catalog/helm',
    })
  }),

  // ── GitHub API endpoints for version checking (#13261) ─────────────
  // Mock GitHub API endpoints used by useVersionCheck for update notifications.
  // Without these mocks, Firefox/WebKit/Mobile browsers timeout waiting for
  // responses during cross-browser nightly tests.
  http.get(withBasePath('/api/github/repos/kubestellar/console/git/ref/heads/main'), () => {
    return HttpResponse.json({
      ref: 'refs/heads/main',
      node_id: 'REF_kwDOKj5abc9yZWZzL2hlYWRzL21haW4',
      url: 'https://api.github.com/repos/kubestellar/console/git/refs/heads/main',
      object: {
        sha: 'abc123def456789abc123def456789abc123def4',
        type: 'commit',
        url: 'https://api.github.com/repos/kubestellar/console/git/commits/abc123def456789abc123def456789abc123def4',
      },
    })
  }),

  http.get(withBasePath('/api/github/repos/kubestellar/console/releases'), () => {
    return HttpResponse.json([])
  }),

  // ── Optional feature status endpoints (issue #8162) ──────────────
  // These endpoints probe for optional in-cluster integrations. In demo
  // mode the integrations are not installed, so we return a success (200)
  // response with `available: false`. Returning 200 here (instead of
  // letting the catch-all return 503) keeps the DevTools network tab
  // clean for demo visitors and avoids the MSW "unhandled request"
  // warning. Source callers already branch on `available` so semantics
  // are unchanged. See web/src/lib/kagentBackend.ts and related files.
  http.get(withBasePath('/api/agent/token'), () => {
    return HttpResponse.json({ token: '' })
  }),
  http.get(withBasePath('/api/kagent/status'), () => {
    return HttpResponse.json({ available: false, reason: 'not configured in demo mode' })
  }),
  http.get(withBasePath('/api/kagent/agents'), () => {
    return HttpResponse.json({ agents: [] })
  }),
  http.get(withBasePath('/api/kagenti-provider/status'), () => {
    return HttpResponse.json({ available: false, reason: 'not configured in demo mode' })
  }),
  http.get(withBasePath('/api/kagenti-provider/agents'), () => {
    return HttpResponse.json({ agents: [] })
  }),
  http.patch(withBasePath('/api/kagenti-provider/config'), async ({ request }) => {
    const body = await request.json() as { llm_provider?: string }
    return HttpResponse.json({
      llm_provider: body.llm_provider || 'gemini',
      api_key_configured: true,
      configured_providers: body.llm_provider ? [body.llm_provider] : ['gemini'],
    })
  }),
  http.get(withBasePath('/api/gadget/status'), () => {
    return HttpResponse.json({ available: false, reason: 'not configured in demo mode' })
  }),
  http.get(withBasePath('/api/mcs/status'), () => {
    return HttpResponse.json({ available: false, reason: 'not configured in demo mode' })
  }),
  http.get(withBasePath('/api/persistence/status'), () => {
    return HttpResponse.json({ available: false, reason: 'not configured in demo mode' })
  }),
  http.get(withBasePath('/api/self-upgrade/status'), () => {
    return HttpResponse.json({ available: false, reason: 'not configured in demo mode' })
  }),

]
}
