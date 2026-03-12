import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false,
  logging: {
    fetches: {
      fullUrl: false,
    }
  },
  onDemandEntries: {
    maxInactiveAge: 10 * 60 * 1000,
    pagesBufferLength: 20,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@clerk/nextjs',
      'date-fns',
      'zustand',
      'sonner',
      '@radix-ui/react-tabs',
      '@radix-ui/react-select',
      '@radix-ui/react-switch',
    ],
  },
  images: {
    unoptimized: true,
  },
};


export default nextConfig;
