"use client";

import Link from "next/link";
import {
  Bed,
  CalendarDays,
  Car,
  MapPin,
  User,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type MarkupConfigSummary,
  SERVICE_LABELS,
  type ServiceType,
} from "@/types/markup";
import { formatMarkupValue, formatRelative } from "./format";

const ICONS: Record<Exclude<ServiceType, "bundle">, LucideIcon> = {
  hotel: Bed,
  tour: MapPin,
  transfer: Car,
  meal: UtensilsCrossed,
  guide: User,
  fixed_departure: CalendarDays,
};

type Props = {
  serviceType: Exclude<ServiceType, "bundle">;
  config: MarkupConfigSummary | null;
};

export function MarkupServiceCard({ serviceType, config }: Props) {
  const Icon = ICONS[serviceType];
  const label = SERVICE_LABELS[serviceType];
  const href = `/rates/markup/service/${serviceType}`;

  if (!config) {
    return (
      <Card className="hover:border-primary/40 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{label}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-2xl font-semibold text-muted-foreground">Not set</p>
          <p className="text-xs text-muted-foreground">No markup configured</p>
          <Button asChild size="sm" variant="outline" className="w-fit">
            <Link href={href}>Set up</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Link href={href} className="block group">
      <Card className="hover:border-primary/40 transition-colors group-hover:shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{label}</CardTitle>
            </div>
            {config.is_active === false && (
              <Badge variant="secondary" className="text-xs">
                Inactive
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-2xl font-semibold text-foreground">
            {formatMarkupValue(config.base_markup)}
          </p>
          <p className="text-xs text-muted-foreground">
            Configured · last edited {formatRelative(config.updated_at)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
