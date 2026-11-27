import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep browser-automation packages out of the server bundle; they are
  // required lazily by the Puppeteer pool.
  serverExternalPackages: [
    'puppeteer',
    'puppeteer-extra',
    'puppeteer-extra-plugin-stealth',
  ],
};

export default nextConfig;
