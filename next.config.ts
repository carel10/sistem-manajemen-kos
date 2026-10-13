import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next dev` from appending its agent-rules block to the project's CLAUDE.md.
  agentRules: false,
  // The end-to-end suites start their own `next dev` with NEXT_DIST_DIR=.next-e2e (tests/e2e/harness.mjs), so a dev server on the
  // default `.next`, and its `.next/dev/lock`, no longer stops them. Unset, this is Next's own default: nothing changes for the
  // product, `next dev` or `next build` (owner decision Q19, 13 Okt 2026).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
