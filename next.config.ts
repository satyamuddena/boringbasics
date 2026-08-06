import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained node server build for Docker deployment.
  output: "standalone",
  typescript: {
    /**
     * Type checking runs in CI and in `npm run verify`, not inside the
     * deployment container. The checker needs roughly half a gigabyte of heap
     * on top of everything the compile already holds, and on a small build box
     * it is killed with no output — the deploy fails reporting nothing, which
     * is far worse than a type error.
     *
     * This does not weaken the gate, it moves it somewhere with enough memory
     * to report what went wrong. Never merge without `npm run verify` passing.
     */
    ignoreBuildErrors: true,
  },
  // Native addons — must not be bundled by Turbopack.
  serverExternalPackages: ["better-sqlite3", "sharp"],
  async headers() {
    return [
      {
        /**
         * Browsers may reuse a cached service worker for up to 24 hours. Without
         * this the installed admin app can keep running a worker from a previous
         * deploy, which is the one way this otherwise cache-free PWA could go
         * stale. Scope header included so the worker can control /admin from /.
         */
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
