package watcher

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestServeFallbackRuntimeBase(t *testing.T) {
	previous := cachedFrontendBasePath
	t.Cleanup(func() { cachedFrontendBasePath = previous })
	for _, base := range []string{"/", "/kubestellar/", "/tools/console/"} {
		t.Run(base, func(t *testing.T) {
			cachedFrontendBasePath = base
			request := httptest.NewRequest(http.MethodGet, "/settings/details", nil)
			request.Header.Set("Accept", "text/html")
			response := httptest.NewRecorder()
			ServeFallback(response, request, "test", "")
			assert.Equal(t, http.StatusServiceUnavailable, response.Code)
			assert.Equal(t, "no-store", response.Header().Get("Cache-Control"))
			assert.Contains(t, response.Body.String(), `name="console-base-path" content="`+base+`"`)
			assert.Contains(t, response.Body.String(), `href="`+base+`"`)
			assert.Contains(t, response.Body.String(), `.content+'watchdog/health'`)
			assert.NotContains(t, response.Body.String(), "fetch('/watchdog/health'")
		})
	}
}
