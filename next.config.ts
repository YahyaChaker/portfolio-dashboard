import { NextConfig } from 'next'; // ✅ Import the type

const nextConfig: NextConfig = {
  output: 'export', // Enables static export mode
  images: {
    unoptimized: true, // Required for GitHub Pages
  },
};

export default nextConfig;
