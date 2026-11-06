package api

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFrontendRuntimeBase(t *testing.T) {
	root := t.TempDir()
	const source = `<html><head><meta name="console-base-path" content="/"><script type="module" src="/assets/app.js"></script></head><body>Console</body></html>`
	index := filepath.Join(root, "index.html")
	writeFile(t, index, source)
	writeFile(t, index+".br", "stale compressed HTML")
	writeFile(t, index+".gz", "stale compressed HTML")
	writeFile(t, filepath.Join(root, "assets", "app.js"), "export default 1")
	for _, base := range []string{"/", "/kubestellar/", "/tools/console/"} {
		t.Run(base, func(t *testing.T) {
			app := fiber.New()
			app.Use(preCompressedStatic(root, base))
			app.Get("/*", func(c *fiber.Ctx) error {
				return sendFrontendHTML(c, index, base)
			})
			for _, path := range []string{"/", "/index.html", "/settings", "/clusters/details"} {
				for _, encoding := range []string{"", "br", "gzip"} {
					status, headers, body := doRequest(t, app, path, encoding)
					assert.Equal(t, fiber.StatusOK, status)
					assert.Contains(t, headers["Content-Type"], "text/html")
					assert.Contains(t, headers["Cache-Control"], "no-store")
					assert.Empty(t, headers["Content-Encoding"])
					assert.Contains(t, body, `name="console-base-path" content="`+base+`"`)
					assert.Contains(t, body, `src="`+base+`assets/app.js"`)
				}
			}
			status, _, body := doRequest(t, app, "/assets/app.js", "")
			assert.Equal(t, fiber.StatusOK, status)
			assert.Equal(t, "export default 1", body)
		})
	}
	unchanged, err := os.ReadFile(index)
	require.NoError(t, err)
	assert.Equal(t, source, string(unchanged), "runtime rendering must not modify the image")
}

func TestFrontendRuntimeMissingHTML(t *testing.T) {
	app := fiber.New()
	index := filepath.Join(t.TempDir(), "index.html")
	app.Get("/", func(c *fiber.Ctx) error {
		return sendFrontendHTML(c, index, "/")
	})
	status, _, body := doRequest(t, app, "/", "")
	assert.Equal(t, fiber.StatusInternalServerError, status)
	assert.Equal(t, "Failed to read frontend HTML", body)
}
