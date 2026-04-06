import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow accessing the dev server from your local network
  //@ts-ignore - Next.js config typings often lag behind this new DEV option
  allowedDevOrigins: ['192.168.1.114'],
};

export default nextConfig;
