import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // React 19 features like Server Actions are now stable in Next 15+
  },
  // Prevent Next.js from bundling these — they need native binaries and
  // must be resolved at runtime by Node.js, not by the Turbopack/webpack bundler.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min", "puppeteer"],
};

export default nextConfig;
