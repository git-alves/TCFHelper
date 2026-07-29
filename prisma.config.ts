import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` only needs the schema file, not a reachable database, so
// fall back to a placeholder instead of throwing when DATABASE_URL isn't set
// yet (e.g. `npm install` before `.env` exists). Commands that actually talk
// to a database (`migrate`, `db push`, ...) still need a real DATABASE_URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
