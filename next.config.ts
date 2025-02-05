import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: "export", // Enables static export
  trailingSlash: true, // Ensures URLs work correctly on GitHub Pages
  images: {
    unoptimized: true, // GitHub Pages does not support Next.js image optimization
  },
  basePath: "/portfolio-dashboard", // Match your GitHub repo name
  assetPrefix: "/portfolio-dashboard/",
};

export default nextConfig;
