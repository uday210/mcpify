const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root so a parent lockfile doesn't confuse output tracing
  // (matters for the Railway/standalone build).
  outputFileTracingRoot: path.join(__dirname),
};

module.exports = nextConfig;
