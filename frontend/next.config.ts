import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use standalone output only during docker builds to prevent conflict with Vercel edge network
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
};

export default nextConfig;
