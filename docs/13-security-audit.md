# Security and Quality Audit — Arogya Relay

**Audited:** 16 August 2026
**Audited against:** `website-client-guide.md` (sections 2, 3, and 8)
**Result:** all issues found were fixed and verified. TypeScript, ESLint, and the
test suite pass with zero errors, and the production dependency tree has zero
known vulnerabilities.

---

## 1. Summary of verification

| Check | Before | After |
|---|---|---|
| TypeScript (`tsc --noEmit`) | 3 errors | **0 errors** |
| ESLint (`npm run lint`) | 0 errors | **0 errors** |
| Tests (`npm test`) | 2 tests | **7 tests, all passing** |
| Total dependency vulnerabilities | 16 (12 high, 4 moderate) | **6, all dev-only build tools** |
| Production dependency vulnerabilities | not measured | **0** |
| Security response headers | none | **8 headers on every response** |
| Local filesystem path leak in built HTML | present | **fixed and guarded by a test** |
| Guide-required app states + SEO routes | missing | **all present** |

---

## 2. Security issues found and fixed

### 2.1 No security response headers (high)

**Problem.** The Worker returned responses with no protective headers at all.
The site could be framed by an attacker's page (clickjacking), the browser was
free to guess content types (MIME confusion), full URLs leaked to third parties
via the referrer, and there was nothing to constrain script or style sources.

**Fix.** Added `worker/security-headers.ts`, applied to every response in
`worker/index.ts`:

- `Content-Security-Policy` — restricts scripts, styles, images, fonts, and
  connections to the site's own origin plus Google Fonts. Also sets
  `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and
  `frame-ancestors 'none'`, which together block plugin injection, base-tag
  hijacking, form redirection, and framing.
- `X-Frame-Options: DENY` — clickjacking protection for older browsers.
- `X-Content-Type-Options: nosniff` — stops MIME-type guessing.
- `Referrer-Policy: strict-origin-when-cross-origin` — stops URL leakage.
- `Strict-Transport-Security` (1 year, includeSubDomains, preload) — forces HTTPS.
- `Cross-Origin-Opener-Policy` and `Cross-Origin-Resource-Policy: same-origin`.
- `Permissions-Policy` — switches off camera, microphone, geolocation, USB,
  payment, and 8 other powerful features the dashboard does not use.
- Removes `X-Powered-By` and `Server`, so the site does not advertise its stack.

**Known CSP limitation.** `script-src` and `style-src` still allow
`'unsafe-inline'`. This is required by the Next.js App Router bootstrap and by
React's inline `style` attributes (the chart bars and battery meter). Removing
it needs per-request nonces; this is recorded as a future hardening item rather
than silently claimed as done.

### 2.2 Local filesystem paths leaked into production HTML (high)

**Problem.** The built output contained absolute paths from a previous copy of
the project:

```
/home/pratyush/Downloads/Arogya-Relay-main/.vinext/fonts/geist-mono-.../*.woff2
```

This is an information disclosure — it reveals the developer's username and
directory layout to every visitor — and it also broke the Geist Mono font in
production, because that path does not exist on the server.

**Cause.** A stale `.vinext` font cache carried over from the older directory.

**Fix.** Cleared `.vinext` and `dist` and rebuilt. Added a regression test that
fails if any `/home/<user>/` path appears in either the built server bundle or
the rendered HTML, so this cannot silently return.

### 2.3 Unexpected HTTP methods reached the framework (medium)

**Problem.** Every HTTP verb was passed straight through to the application,
including `TRACE`, `PUT`, `DELETE`, and WebDAV methods. This widens the attack
surface for no benefit.

**Fix.** The Worker now allows only `GET`, `HEAD`, `OPTIONS`, and `POST`, and
answers anything else with `405 Method Not Allowed` plus an `Allow` header —
before any application code runs. The rejection still carries the security
headers.

### 2.4 Internal errors could reach the visitor (medium)

**Problem.** An unhandled exception in the request handler propagated out of the
Worker, which can surface stack traces and internal file paths.

**Fix.** Wrapped the handler in `try/catch`. Visitors now get a plain
"Something went wrong. Please try again." at status 500, while the real error is
logged for the maintainer via `console.error`.

### 2.5 Vulnerable dependencies (high)

**Problem.** 16 known vulnerabilities, including:

