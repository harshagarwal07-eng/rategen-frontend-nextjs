"use client";

// Tiny formatting helpers shared across FD parser renderers.

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const parsed = new Date(d.length === 10 ? `${d}T12:00:00` : d);
  if (Number.isNaN(parsed.getTime())) return d;
  return parsed.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtNumber(v: number | null | undefined): string {
  return typeof v === "number" && Number.isFinite(v) ? v.toLocaleString() : "—";
}

export function fmtValue(
  v: number | null | undefined,
  valueType: string | null | undefined,
): string {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return valueType === "percentage" ? `${v}%` : v.toLocaleString();
}

export function splitList(s: string | string[] | null | undefined): string[] {
  if (!s) return [];
  if (Array.isArray(s)) return s.map((x) => x.trim()).filter(Boolean);
  if (typeof s === "string") return s.split(/[,\n]/).map((x) => x.trim()).filter(Boolean);
  return [];
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function SectionTitle({
  children,
  count,
}: {
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
      {typeof count === "number" && (
        <span className="ml-1 text-muted-foreground/70">({count})</span>
      )}
    </h3>
  );
}
