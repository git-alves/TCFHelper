// The catch-all slot route matches any path with at least one segment, but
// not the root path itself -- this covers navigating home (the logo link)
// the same way [...catchAll]/page.tsx covers everything else.
export default function Page() {
  return null;
}
