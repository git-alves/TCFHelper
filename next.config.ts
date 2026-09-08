import { PrismaPlugin } from "@prisma/nextjs-monorepo-workaround-plugin";
import type { NextConfig } from "next";
import { buildContentSecurityPolicy, buildSecurityHeaders, clerkFrontendApiOrigin } from "./src/lib/security-headers";

const CSP = buildContentSecurityPolicy({
  clerkOrigin: clerkFrontendApiOrigin(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
  isDev: process.env.NODE_ENV === "development",
});

// Vercel's prebuilt builder can omit Prisma's native engine even though it
// appears in Next's trace manifest. Prisma's Webpack plugin copies the
// engine next to each server bundle and records it in the corresponding
// trace, which Vercel then packages into the function output.
const nextConfig: NextConfig = {
  // @prisma/client is externalized by default. Bundle it so PrismaPlugin can
  // see the generated client configuration and copy its runtime files.
  transpilePackages: ["@prisma/client"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: buildSecurityHeaders(CSP),
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins ??= [];
      config.plugins.push(new PrismaPlugin());
    }

    return config;
  },
};

export default nextConfig;
