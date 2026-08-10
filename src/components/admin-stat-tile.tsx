interface AdminStatTileProps {
  label: string;
  value: number;
}

/** A bare stat tile: the number is the chart. No delta/sparkline needed here. */
export function AdminStatTile({ label, value }: AdminStatTileProps) {
  return (
    <div className="rounded-xl border border-black/[.1] p-4 dark:border-white/[.15]">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value.toLocaleString("en-US")}</p>
    </div>
  );
}
