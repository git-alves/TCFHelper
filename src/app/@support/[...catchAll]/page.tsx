// A parallel slot retains its active child on soft navigation. Explicitly
// clearing all other paths means Support never survives a navigation away
// from /support as a stale focus trap over the new page.
export default function CatchAll() {
  return null;
}
