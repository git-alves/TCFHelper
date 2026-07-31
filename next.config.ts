import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
import type { NextConfig } from "next";

// Vercel's prebuilt builder can omit Prisma's native engine even though it
// appears in Next's trace manifest. Prisma's Webpack plugin copies the
// engine next to each server bundle and records it in the corresponding
// trace, which Vercel then packages into the function output.
const nextConfig: NextConfig = {
  // @prisma/client is externalized by default. Bundle it so PrismaPlugin can
  // see the generated client configuration and copy its runtime files.
  transpilePackages: ["@prisma/client"],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins ??= [];
      config.plugins.push(new PrismaPlugin());
    }

    return config;
  },
};

export default nextConfig;
