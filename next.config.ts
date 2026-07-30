import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prisma's client is generated to a custom `output` path (see
  // prisma/schema.prisma), not the default node_modules/.prisma/client.
  // Next's serverless bundler loads the query engine binary dynamically
  // rather than via a staticly-analyzable `require()`, so its automatic
  // file tracing doesn't pick it up from a custom path — every route that
  // touches Prisma would deploy fine but fail at request time with the
  // engine binary missing from the bundle.
  outputFileTracingIncludes: {
    "/**/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
