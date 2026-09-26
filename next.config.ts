import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep `next dev` from appending its agent-rules block to the project's CLAUDE.md.
  agentRules: false,
};

export default nextConfig;
