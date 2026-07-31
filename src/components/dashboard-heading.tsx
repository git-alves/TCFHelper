"use client";

import { useAppCopy } from "@/components/app-locale-provider";

interface DashboardHeadingProps {
  name: string | null | undefined;
}

// Authentication and redirects remain in the server page. This client
// component only makes its presentation copy react to a locale change.
export function DashboardHeading({ name }: DashboardHeadingProps) {
  const copy = useAppCopy();

  return <h1 className="text-2xl font-semibold tracking-tight">{copy.dashboard.welcome(name ?? "")}</h1>;
}
