import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Increase API payload limits for Puppeteer code
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core']
  },
  
  // API routes configuration
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Increase from default 1mb to 10mb
    },
    responseLimit: '10mb'
  }
};

export default nextConfig;
