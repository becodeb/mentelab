import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@mentelab/shared", "@mentelab/benchmarks"],
  reactStrictMode: true,
};

export default nextConfig;
