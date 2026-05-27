/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'export' for Capacitor APK builds, 'standalone' for all other builds (Docker/VM).
  // Vercel ignores the output field and handles bundling itself.
  output: process.env.CAPACITOR_BUILD ? 'export' : 'standalone',

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
