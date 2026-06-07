const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep native/CJS server libs out of the webpack bundle (they use dynamic
  // requires / fs that don't bundle cleanly).
  serverExternalPackages: ['pdf-parse', 'pg'],
  // Pin the workspace root so a parent lockfile doesn't confuse output tracing
  // (matters for the Railway/standalone build).
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return [
      // OAuth discovery — MCP clients fetch these at the domain root.
      { source: '/.well-known/oauth-authorization-server', destination: '/api/oauth/wk/authorization-server' },
      { source: '/.well-known/oauth-authorization-server/:path*', destination: '/api/oauth/wk/authorization-server' },
      { source: '/.well-known/oauth-protected-resource', destination: '/api/oauth/wk/protected-resource' },
      { source: '/.well-known/oauth-protected-resource/:path*', destination: '/api/oauth/wk/protected-resource' },
    ];
  },
  webpack: (config, { dev }) => {
    // Disable the webpack filesystem cache for production builds. Railway/Nixpacks
    // restores .next/cache between deploys; a stale chunk from an earlier build
    // (e.g. the initial Node 18 one) was poisoning the error-page prerender
    // ("<Html> should not be imported outside of pages/_document"). Compiling
    // fresh every prod build avoids that class of failure entirely.
    if (!dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
