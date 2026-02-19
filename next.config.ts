import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        // SVG files served with Content-Disposition to prevent XSS
        source: "/api/projects/:id/outline",
        headers: [
          ...securityHeaders,
          { key: "Content-Disposition", value: "inline" },
          { key: "Content-Security-Policy", value: "default-src 'none'; style-src 'unsafe-inline'" },
        ],
      },
    ];
  },
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
