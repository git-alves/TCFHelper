// Directive-free and dependency-free so both the "use client" admin button
// and the server-side route/lib can import the same value (a constant
// re-exported from a client file becomes an opaque client reference when a
// Server Component reads it; and support-resolution.ts imports prisma).
export const SUPPORT_RESOLUTION_NOTE_MAX_CHARS = 500;
