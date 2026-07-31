import type { NextConfig } from "next";

// Prisma now uses its standard node_modules output, which Next/Vercel
// externalizes and traces without a broad source-tree inclusion rule.
const nextConfig: NextConfig = {};

export default nextConfig;
