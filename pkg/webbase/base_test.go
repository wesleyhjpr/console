package webbase

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFromURL(t *testing.T) {
	for _, tc := range []struct {
		name, url, want string
	}{
		{"default", "", "/"},
		{"origin", "https://example.com", "/"},
		{"root", "http://localhost:8080/", "/"},
		{"prefix", "https://example.com/kubestellar", "/kubestellar/"},
		{"trailing slash", "https://example.com/kubestellar/", "/kubestellar/"},
		{"nested", "https://example.com/tools/console.v1", "/tools/console.v1/"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got, err := FromURL(tc.url)
			require.NoError(t, err)
			assert.Equal(t, tc.want, got)
		})
	}
	for _, input := range []string{
		"/relative", "ftp://example.com/console", "https://user@example.com/",
		"https://example.com/console?x=y", "https://example.com/console?",
		"https://example.com/console#fragment", "https://example.com/a/../b",
		"https://example.com//other", "https://example.com/a%2fb",
		"https://example.com/%22%3E", "https://example.com/a\\b",
	} {
		t.Run(input, func(t *testing.T) {
			_, err := FromURL(input)
			require.Error(t, err)
		})
	}
}

func TestHTMLUsesRuntimeBase(t *testing.T) {
	const source = `<!doctype html><html><head><meta charset="UTF-8"><meta name="console-base-path" content="/compiled/">
<script type="module" src="./assets/app.js"></script><link href="./assets/app.css" rel="stylesheet">
</head><body><img src="/logo.svg"><a href="/settings">Settings</a><a href="//external.test/">External</a>
<a href="https://external.test/">External</a><a href="#section">Section</a>
<img src="/compiled/legacy.svg"><svg><path fill="url(#gradient)"/></svg>
<script>fetch('healthz')</script></body></html>`
	for _, base := range []string{"/", "/kubestellar/", "/tools/console/"} {
		t.Run(base, func(t *testing.T) {
			page, err := HTML([]byte(source), base)
			require.NoError(t, err)
			result := string(page)
			assert.Contains(t, result, `name="console-base-path" content="`+base+`"`)
			assert.Contains(t, result, `src="`+base+`logo.svg"`)
			assert.Contains(t, result, `href="`+base+`settings"`)
			assert.Contains(t, result, `src="`+base+`assets/app.js"`)
			assert.Contains(t, result, `href="`+base+`assets/app.css"`)
			assert.Contains(t, result, `src="`+base+`legacy.svg"`)
			assert.Contains(t, result, `href="#section"`)
			assert.Contains(t, result, `fill="url(#gradient)"`)
			assert.Contains(t, result, `href="//external.test/"`)
			assert.Contains(t, result, `href="https://external.test/"`)
			assert.Contains(t, result, `fetch('healthz')`)
			assert.NotContains(t, result, "/compiled/")
			assert.NotContains(t, result, "<base")
			assert.Equal(t, 1, strings.Count(result, `name="console-base-path"`))
			assert.Less(t, strings.Index(result, `name="console-base-path"`), strings.Index(result, "<script "))
		})
	}
}

func TestHTMLAddsBaseToAuxiliaryPages(t *testing.T) {
	page, err := HTML([]byte(`<html><head></head><body><a href="/console/settings">Settings</a></body></html>`), "/console/")
	require.NoError(t, err)
	assert.Contains(t, string(page), `name="console-base-path" content="/console/"`)
	assert.Contains(t, string(page), `href="/console/settings"`)
	assert.NotContains(t, string(page), "/console/console/")
}
