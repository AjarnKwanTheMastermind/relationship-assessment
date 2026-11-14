// The version line shown at the bottom of the backoffice, for example "v1.3.1 · release@91ba2cf". The values are
// fixed into the build by next.config.mjs, so it tells which build is really running, not which one is in git.
// A missing part (no branch or commit known) is left out.
export function appVersionLabel(): string {
  const version = process.env.APP_VERSION;
  const branch = process.env.APP_BRANCH;
  const commit = process.env.APP_COMMIT;
  const source = commit ? (branch && branch !== "HEAD" ? `${branch}@${commit}` : commit) : "";
  return [version ? `v${version}` : "", source].filter(Boolean).join(" · ");
}

// Only the number, for the footer of the public pages ("v1.3.1"). Visitors do not need the branch or the commit.
export function appVersionNumber(): string {
  const version = process.env.APP_VERSION;
  return version ? `v${version}` : "";
}
