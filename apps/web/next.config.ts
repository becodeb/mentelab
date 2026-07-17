import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@mentelab/shared", "@mentelab/benchmarks"],
  reactStrictMode: true,
};

export default nextConfig;
