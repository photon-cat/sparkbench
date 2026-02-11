import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Allow importing .glsl files as text (used by KiCanvas WebGL shaders)
    config.module.rules.push({
      test: /\.glsl$/,
      type: "asset/source",
    });
    return config;
  },
  transpilePackages: ["vendor/kicanvas"],
};

export default nextConfig;
