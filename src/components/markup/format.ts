import type { MarkupValue, MarkupBounds } from "@/types/markup";

export function formatMarkupValue(v: MarkupValue | null | undefined): string {
  if (!v) return "Not set";
  const sign = v.value >= 0 ? "+" : "";
  if (v.pax_breakdown) {
    const { adult, child, infant } = v.pax_breakdown;
    const unit = v.type === "pct" ? "%" : "$";
    return `Per pax: A ${unit}${adult} / C ${unit}${child} / I ${unit}${infant}`;
  }
  if (v.type === "pct") return `${sign}${v.value}%`;
  const per = v.per ? ` / ${v.per}` : "";
  return `${sign}$${v.value}${per}`;
}

export function formatBounds(b: MarkupBounds | null | undefined): string | null {
  if (!b || (b.min == null && b.max == null)) return null;
  const parts: string[] = [];
  if (b.min != null) parts.push(`min ${b.min}`);
  if (b.max != null) parts.push(`max ${b.max}`);
  return `${parts.join(" / ")} per ${b.per}`;
}

export function formatRelative(iso: string | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diff = Date.now() - then;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

export function emptyMarkupValue(): MarkupValue {
  return { type: "pct", value: 0 };
}
