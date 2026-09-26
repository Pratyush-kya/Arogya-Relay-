import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const mod = await import(workerUrl.href);
  const handler = mod.default.fetch ?? mod.default;

  const res = await handler(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
  const { withSecurityHeaders } = await import("../worker/security-headers.ts");
  return withSecurityHeaders(res);
}

test("server-renders the Arogya Relay dashboard", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Arogya Relay — Offline-First Disease Monitoring for Field Health Workers<\/title>/i);
  assert.match(html, /Good morning\./);
  assert.match(html, /Screenings today/);
  assert.match(html, /Symptoms are rising in North Ridge\./);
  assert.match(html, /New screening/);
  assert.match(html, /Offline capture is active\./);
  assert.match(html, /Care guidance/);
});

test("keeps the key dashboard workflows interactive and responsive", async () => {
  const [page, css, readme] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(page, /setActiveTab\("cases"\)/);
  assert.match(page, /openScreening/);
  assert.match(page, /onOpenDevice/);
  assert.doesNotMatch(page, /overview\.begin/);
  assert.doesNotMatch(page, /overview\.guided/);
  assert.match(page, /function syncReports\(\)/);
  assert.match(page, /function saveScreening\(/);
  assert.match(page, /role="dialog"/);
  assert.match(page, /className="screening-layout"/);
  assert.match(page, /className="screening-basics"/);
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /Screening support only\./);

  assert.match(css, /@media \(max-width: 820px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /grid-template-columns: minmax\(240px, \.68fr\) minmax\(0, 1\.62fr\)/);
  assert.match(css, /animation: modal-arrive \.3s/);
  assert.match(css, /\.modal-backdrop,[\s\S]*\.screening-modal,[\s\S]*animation: none !important/);
  assert.match(css, /Nearby Care compact scale/);
  assert.match(css, /\.nc-filter-chips label \{[\s\S]*min-height: 42px/);
  assert.match(css, /Nearby Care control alignment/);
  assert.match(css, /appearance: none/);
  assert.match(css, /\.nc-filter-rows \{[\s\S]*grid-template-columns: repeat\(3/);
  assert.match(readme, /guarded demonstration API routes/i);
  assert.match(readme, /not a\s*>?\s*certified medical device/i);
});

test("Care Guidance assistant is wired into the dashboard and the engine exists", async () => {
  const [page, lib, css] = await Promise.all([
    readFile(new URL("../app/care-guidance.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/clinical/engine.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  // The dashboard imports and renders the assistant.
  assert.match(page, /care-guidance/);
  assert.match(page, /assemblyGuidance|assembleGuidance/);
  assert.match(page, /112/); // India emergency number surfaced on red flags
  assert.match(page, /offline_fallback/);
  assert.match(page, /id="care-mode-status"/);
  assert.match(page, /aria-describedby="care-mode-status"/);
  assert.match(css, /\.page-heading::after[\s\S]*pointer-events: none/);

  // The deterministic engine returns the five required triage tiers.
  assert.match(lib, /emergency/);
  assert.match(lib, /same_day/);
  assert.match(lib, /clinician_review/);
  assert.match(lib, /self_care_information/);
  assert.match(lib, /insufficient_information/);
});

/** Renders the site through the worker with an arbitrary request. */
async function fetchWorker(request) {
  const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS", "POST"]);
  const { withSecurityHeaders } = await import("../worker/security-headers.ts");
  if (!ALLOWED_METHODS.has(request.method)) {
    return withSecurityHeaders(
      new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: [...ALLOWED_METHODS].join(", "), "content-type": "text/plain; charset=utf-8" },
      }),
    );
  }
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  const mod = await import(workerUrl.href);
  const handler = mod.default.fetch ?? mod.default;

  const res = await handler(
    request,
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
  return withSecurityHeaders(res);
}

test("sends the security headers that protect visitors", async () => {
  const response = await render();
  const header = (name) => response.headers.get(name) ?? "";

  assert.equal(header("x-content-type-options"), "nosniff");
  assert.equal(header("x-frame-options"), "DENY");
  assert.equal(header("referrer-policy"), "strict-origin-when-cross-origin");
  assert.match(header("strict-transport-security"), /max-age=31536000/);
  assert.equal(header("cross-origin-opener-policy"), "same-origin");
  assert.match(header("permissions-policy"), /camera=\(\)/);
  assert.match(header("permissions-policy"), /geolocation=\(self\)/);

  // The implementation must never advertise the server stack.
  assert.equal(response.headers.get("x-powered-by"), null);

  const csp = header("content-security-policy");
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /form-action 'self'/);
  assert.match(csp, /a\.tile\.openstreetmap\.org/);
});

test("rejects HTTP methods the site does not serve", async () => {
  // Note: Node's Request constructor forbids TRACE/TRACK/CONNECT outright, so
  // they cannot be exercised here. The worker's allow-list still covers them.
  for (const method of ["PUT", "DELETE", "PATCH"]) {
    const response = await fetchWorker(new Request("http://localhost/", { method }));
    assert.equal(response.status, 405, `${method} should be rejected`);
    assert.match(response.headers.get("allow") ?? "", /GET/);
    // Even the rejection carries the security headers.
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
});

test("never leaks local filesystem paths into the built output", async () => {
  const serverBundle = await readFile(new URL("../dist/server/index.js", import.meta.url), "utf8");
  assert.ok(
    !/\/home\/[a-z0-9_-]+\//i.test(serverBundle),
    "built server bundle must not contain absolute local filesystem paths",
  );

  const html = await (await render()).text();
  assert.ok(!/\/home\/[a-z0-9_-]+\//i.test(html), "rendered HTML must not leak local paths");
});

test("provides the required application state and SEO routes", async () => {
  const [errorPage, notFound, loading, robots, sitemap] = await Promise.all([
    readFile(new URL("../app/error.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/not-found.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/loading.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
  ]);

  assert.match(errorPage, /"use client"/);
  assert.match(errorPage, /reset\(\)/);
  assert.match(notFound, /404/);
  assert.match(loading, /aria-busy="true"/);
  assert.match(robots, /sitemap/);
  assert.match(sitemap, /changeFrequency/);
});

test("keeps the dashboard reachable and operable by keyboard", async () => {
  const [layout, page, css] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  // Skip link and its target must both exist.
  assert.match(layout, /href="#main-content"/);
  assert.match(page, /id="main-content"/);
  assert.match(css, /\.skip-link/);

  // Zoom must not be locked (WCAG 2.2, 1.4.4).
  assert.match(layout, /maximumScale: 5/);

  // Escape closes the screening dialog and focus is restored.
  assert.match(page, /event\.key === "Escape"/);
  assert.match(page, /openerRef\.current\?\.focus\(\)/);

  // Every button must declare an explicit type so none implicitly submits.
  const buttons = page.match(/<button[^>]*>/g) ?? [];
  const untyped = buttons.filter((tag) => !tag.includes("type="));
  assert.deepEqual(untyped, [], `buttons missing an explicit type: ${untyped.join(" | ")}`);

  // The pending sync timer must be cleaned up on unmount.
  assert.match(page, /clearTimeout\(syncTimer\.current\)/);
  assert.match(page, /clearTimeout\(selfCheckTimer\.current\)/);
  assert.match(page, /className="device-tech-grid"/);
  assert.match(page, /role="table"/);
  assert.match(page, /runSelfCheck/);
  const carePlan = await readFile(new URL("../app/care-plan.tsx", import.meta.url), "utf8");
  assert.match(carePlan, /className="cg-card cp-editor"/);
});

