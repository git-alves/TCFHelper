export function inactivityEmailFirstName(name: string | null): string | null {
  return name?.trim().split(/\s+/)[0] || null;
}

export function renderInactivityEmailName(
  value: string,
  name: string | null,
) {
  if (!name) return value.replace(/,?\s*\{name\}/g, "");
  return value.replace(/\{name\}/g, () => name);
}
