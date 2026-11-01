import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function config(phase) {
  /** @type {import('next').NextConfig} */
  return {
    reactStrictMode: true,
    // `next dev` crashes in the browser if it reuses files from `next build`, so keep them apart.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    experimental: {
      serverComponentsExternalPackages: ["pg"],
    },
  };
}
