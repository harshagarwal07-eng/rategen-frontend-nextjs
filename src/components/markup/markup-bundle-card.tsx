"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { type MarkupBundle, SERVICE_LABELS, type ServiceType } from "@/types/markup";
import { formatMarkupValue, formatRelative } from "./format";

export function MarkupBundleCard({ bundle }: { bundle: MarkupBundle }) {
  const cfg = bundle.bundle_config;
  return (
    <Link href={`/rates/markup/bundle/${bundle.id}`} className="block group">
      <Card className="hover:border-primary/40 transition-colors group-hover:shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <h3 className="text-base font-semibold truncate">{bundle.name}</h3>
            <div className="flex flex-wrap gap-1.5">
              {bundle.service_types.map((st) => (
                <Badge key={st} variant="outline" className="text-xs">
                  {SERVICE_LABELS[st as Exclude<ServiceType, "bundle">] ?? st}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <p className="text-lg font-semibold">
              {cfg ? formatMarkupValue(cfg.base_markup) : "Not set"}
            </p>
            <p className="text-xs text-muted-foreground">
              edited {formatRelative(bundle.updated_at)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
