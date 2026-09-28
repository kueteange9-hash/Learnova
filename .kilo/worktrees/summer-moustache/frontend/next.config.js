/** @type {import('next').NextConfig} */

/**
 * Learnova frontend configuration
 *
 * The Express API (backend/) runs on BACKEND_URL (default http://127.0.0.1:3001).
 * The browser talks to it through Next.js rewrites under /api/backend/*, so:
 *   - the frontend works locally AND in hosted/preview environments
 *     (a browser running outside the machine cannot reach "localhost:3001"),
 *   - the GEMINI_API_KEY stays on the Express server and is never shipped
 *     to the browser.
 *
 * Override the target with BACKEND_URL in frontend/.env.local if needed.
 */

const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:3001").replace(/\/+$/, "");

const nextConfig = {
  // Allow the dev server to be reached from hosted preview domains.
  allowedDevOrigins: ["*.e2b.app", "*.github.dev", "*.gitpod.io", "localhost", "127.0.0.1"],

  async rewrites() {
    return [
      // Learnova API
      { source: "/api/backend/:path*", destination: `${BACKEND_URL}/api/:path*` },
      // Uploaded workshop images served by the Express backend
      { source: "/uploads/:path*", destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
