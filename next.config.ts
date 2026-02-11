import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    // Allow importing .glsl and .kicad_wks files as text (used by KiCanvas)
    config.module.rules.push({
      test: /\.(glsl|kicad_wks)$/,
      type: "asset/source",
    });
    return config;
  },
  // Turbopack loader config (used with --turbopack flag)
  turbopack: {
    rules: {
      "*.glsl": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
      "*.kicad_wks": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  transpilePackages: ["vendor/kicanvas"],
};

export default nextConfig;
