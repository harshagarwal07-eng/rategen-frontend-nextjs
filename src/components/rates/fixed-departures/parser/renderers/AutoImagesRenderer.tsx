"use client";

import { Badge } from "@/components/ui/badge";
import type { AutoImagesOutput, DayImage } from "./types";
import { EmptyState, SectionTitle } from "./shared";

export function AutoImagesRenderer({ data }: { data: AutoImagesOutput }) {
  const banner = data.banner_image_url ?? null;
  const bannerSource = data.banner_source ?? null;
  const bannerQuery = data.banner_search_query ?? null;
  const day = (data.day_images ?? [])
    .slice()
    .sort((a, b) => a.day_number - b.day_number);
  const errs = (data.errors ?? []) as Array<Record<string, unknown>>;

  if (!banner && day.length === 0)
    return <EmptyState>No images were selected.</EmptyState>;

  return (
    <div className="space-y-5">
      {banner && (
        <section>
          <SectionTitle>Banner</SectionTitle>
          <figure className="overflow-hidden rounded-lg border bg-muted/30">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={banner}
              alt={bannerQuery ?? "Tour banner"}
              loading="lazy"
              className="h-40 w-full object-cover"
            />
            <figcaption className="flex items-center justify-between gap-2 border-t bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground">
              <span className="truncate" title={bannerQuery ?? ""}>
                {bannerQuery ?? "—"}
              </span>
              {bannerSource && (
                <Badge variant="secondary" className="text-[10px]">
                  {bannerSource}
                </Badge>
              )}
            </figcaption>
          </figure>
        </section>
      )}

      {day.length > 0 && (
        <section>
          <SectionTitle count={day.length}>Day images</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {day.map((d) => (
              <DayImageCard key={d.day_number} img={d} />
            ))}
          </div>
        </section>
      )}

      {errs.length > 0 && (
        <section>
          <SectionTitle count={errs.length}>Errors</SectionTitle>
          <pre className="max-h-40 overflow-auto rounded border bg-muted/40 p-2 font-mono text-[11px] text-muted-foreground">
            {JSON.stringify(errs, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

function DayImageCard({ img }: { img: DayImage }) {
  return (
    <figure className="overflow-hidden rounded-lg border bg-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={img.image_url}
        alt={img.search_query ?? `Day ${img.day_number}`}
        loading="lazy"
        className="h-28 w-full object-cover"
      />
      <figcaption className="flex items-center justify-between gap-1 border-t bg-muted/40 px-2 py-1">
        <span className="text-[11px] font-medium">Day {img.day_number}</span>
        {img.source && (
          <Badge variant="secondary" className="text-[9px]">
            {img.source}
          </Badge>
        )}
      </figcaption>
      {img.search_query && (
        <div
          className="truncate px-2 py-1 text-[10px] text-muted-foreground"
          title={img.search_query}
        >
          {img.search_query}
        </div>
      )}
    </figure>
  );
}
