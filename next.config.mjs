import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

// The version shown at the bottom of the backoffice: the number in package.json, and the branch and commit this
// build was made from. Netlify gives the branch and commit as BRANCH and COMMIT_REF while it builds; on a
// developer's machine they come from git. Nothing here is secret, and a missing value is simply left out.
function buildInfo() {
  const git = (args) => {
    try {
      return execSync(`git ${args}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      return "";
    }
  };
  let version = "";
  try {
    version = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version ?? "";
  } catch {}
  const commit = (process.env.COMMIT_REF || git("rev-parse HEAD")).slice(0, 7);
  const branch = process.env.BRANCH || git("rev-parse --abbrev-ref HEAD");
  return { APP_VERSION: version, APP_BRANCH: branch, APP_COMMIT: commit };
}

export default function config(phase) {
  const dev = phase === PHASE_DEVELOPMENT_SERVER;

  // Everything the app loads comes from its own address; fonts are bundled at build time.
  // Next.js writes small inline scripts and styles, so those are allowed, and nothing else is.
  // Development also needs eval and a WebSocket for hot reload.
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");

  const securityHeaders = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    // Other sites can't put these pages in a frame (clickjacking).
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Result addresses contain the result's ID, so they are never sent to other sites.
    { key: "Referrer-Policy", value: "no-referrer" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  ];

  /** @type {import('next').NextConfig} */
  return {
    reactStrictMode: true,
    env: buildInfo(),
    poweredByHeader: false,
    // The app shows no images, so the image optimizer (which has had security advisories) is switched off.
    images: { unoptimized: true },
    // `next dev` crashes in the browser if it reuses files from `next build`, so keep them apart.
    distDir: dev ? ".next-dev" : ".next",
    experimental: {
      serverComponentsExternalPackages: ["pg"],
      // The settings forms hold a few kilobytes of text; this keeps a huge post from being read in full.
      serverActions: { bodySizeLimit: "256kb" },
    },
    async headers() {
      return [{ source: "/:path*", headers: securityHeaders }];
    },
  };
}
