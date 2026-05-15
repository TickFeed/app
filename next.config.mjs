/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export for Capacitor APK builds. Set CAPACITOR_BUILD=1 in the
  // GitHub Actions APK workflow. Vercel builds normally (no env var set).
  ...(process.env.CAPACITOR_BUILD ? { output: 'export' } : {}),

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
