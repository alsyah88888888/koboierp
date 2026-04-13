import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "@prisma/client-sqlite", "bcryptjs", "next-auth"],
  // @ts-ignore
  allowedDevOrigins: ["192.168.1.30", "localhost:3000"],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
