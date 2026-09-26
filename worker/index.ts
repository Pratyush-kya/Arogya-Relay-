/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { withSecurityHeaders } from "./security-headers";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  R2?: R2Bucket;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

/**
 * HTTP methods this site legitimately serves. The dashboard is read-only and
 * its screening form is handled entirely in the browser, so anything beyond
 * these is rejected early instead of reaching the framework.
 */
const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS", "POST"]);

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Reject unexpected verbs (TRACE, TRACK, PUT, DELETE, PROPFIND, ...) before
    // any application code runs.
    if (!ALLOWED_METHODS.has(request.method)) {
      return withSecurityHeaders(
        new Response("Method Not Allowed", {
          status: 405,
          headers: { allow: [...ALLOWED_METHODS].join(", "), "content-type": "text/plain; charset=utf-8" },
        }),
      );
    }

    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const optimized = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(optimized);
    }

    try {
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(response);
    } catch (error) {
      // Never leak a stack trace or internal path to the visitor. The details
      // still reach the Cloudflare Workers log for the maintainer.
      console.error("Unhandled request error", error);
      return withSecurityHeaders(
        new Response("Something went wrong. Please try again.", {
          status: 500,
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
      );
    }
  },
};

export default worker;

