// Package webbase adapts frontend HTML to the configured public URL without
// changing built assets or writing to the container filesystem.
package webbase

import (
	"bytes"
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"golang.org/x/net/html"
)

var safePath = regexp.MustCompile(`^/(?:[A-Za-z0-9_~-]+(?:\.[A-Za-z0-9_~-]+)*/?)*$`)

// FromURL returns a normalized, origin-relative base with a trailing slash.
func FromURL(publicURL string) (string, error) {
	if publicURL == "" {
		return "/", nil
	}
	u, err := url.Parse(publicURL)
	if err != nil || u.Host == "" || (u.Scheme != "http" && u.Scheme != "https") ||
		u.User != nil || u.RawQuery != "" || u.ForceQuery || u.Fragment != "" {
		return "", fmt.Errorf("FRONTEND_URL must be an absolute HTTP(S) URL without credentials, query or fragment")
	}
	path := u.EscapedPath()
	if path == "" {
		return "/", nil
	}
	if !safePath.MatchString(path) {
		return "", fmt.Errorf("FRONTEND_URL path must contain safe, non-empty segments without traversal or URL escapes")
	}
	return strings.TrimRight(path, "/") + "/", nil
}

// HTML provides configuration before scripts execute and rewrites HTML asset
// URLs. A meta tag (not <base>) preserves fragment links and SVG url(#id) paints.
// JS/CSS bundles remain byte-identical for all deployments.
func HTML(source []byte, base string) ([]byte, error) {
	if base == "" {
		base = "/"
	}
	doc, err := html.Parse(bytes.NewReader(source))
	if err != nil {
		return nil, fmt.Errorf("parse frontend HTML: %w", err)
	}
	var head *html.Node
	var config *html.Node
	compiledBase := "/"
	var findConfig func(*html.Node)
	findConfig = func(node *html.Node) {
		if node.Type == html.ElementNode && node.Data == "meta" {
			for _, attr := range node.Attr {
				if attr.Key == "name" && attr.Val == "console-base-path" {
					config = node
					for _, entry := range node.Attr {
						if entry.Key == "content" && strings.HasPrefix(entry.Val, "/") {
							compiledBase = entry.Val
						}
					}
				}
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			findConfig(child)
		}
	}
	findConfig(doc)
	var visit func(*html.Node)
	visit = func(node *html.Node) {
		if node.Type == html.ElementNode {
			if node.Data == "head" {
				head = node
			}
			for i := range node.Attr {
				attr := &node.Attr[i]
				switch attr.Key {
				case "href", "src", "action", "poster":
					if strings.HasPrefix(attr.Val, "./") {
						attr.Val = base + strings.TrimPrefix(attr.Val, "./")
					} else if strings.HasPrefix(attr.Val, "/") && !strings.HasPrefix(attr.Val, "//") {
						if compiledBase != "/" && strings.HasPrefix(attr.Val, compiledBase) {
							attr.Val = "/" + strings.TrimPrefix(attr.Val, compiledBase)
						}
						prefix := strings.TrimSuffix(base, "/")
						if attr.Val != prefix && !strings.HasPrefix(attr.Val, base) &&
							!strings.HasPrefix(attr.Val, prefix+"?") && !strings.HasPrefix(attr.Val, prefix+"#") {
							attr.Val = prefix + attr.Val
						}
					}
				}
			}
		}
		for child := node.FirstChild; child != nil; child = child.NextSibling {
			visit(child)
		}
	}
	visit(doc)
	if head == nil {
		return nil, fmt.Errorf("frontend HTML has no head")
	}
	if config != nil {
		config.Parent.RemoveChild(config)
	}
	configNode := &html.Node{
		Type: html.ElementNode,
		Data: "meta",
		Attr: []html.Attribute{{Key: "name", Val: "console-base-path"}, {Key: "content", Val: base}},
	}
	head.InsertBefore(configNode, head.FirstChild)
	var out bytes.Buffer
	if err := html.Render(&out, doc); err != nil {
		return nil, fmt.Errorf("render frontend HTML: %w", err)
	}
	return out.Bytes(), nil
}
