"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BaseMarkupSection } from "@/components/markup/base-markup-section";
import { BoundsEditor } from "@/components/markup/bounds-editor";
import {
  EntityDrawer,
  type EntityDrawerKind,
} from "@/components/markup/entity-drawer";
import { emptyMarkupValue } from "@/components/markup/format";
import { LiveCalculatorPanel } from "@/components/markup/live-calculator-panel";
import { ModifierTable, type ModifierRowDef } from "@/components/markup/modifier-table";
import { RowOverridesSection } from "@/components/markup/row-overrides-section";
import { useApiClients } from "@/hooks/markup/use-api-clients";
import { useMarketClusters } from "@/hooks/markup/use-market-clusters";
import { useSeasons } from "@/hooks/markup/use-seasons";
import {
  useCreateMarkupConfig,
  useMarkupConfig,
  useMarkupConfigs,
} from "@/hooks/markup/use-markup-configs";
import {
  AGENT_TIERS,
  SERVICE_LABELS,
  type ServiceType,
  TIER_LABELS,
} from "@/types/markup";

type Props = { serviceType: ServiceType };

export default function ServiceMarkupDetailClient({ serviceType }: Props) {
  const isValidService = serviceType !== "bundle" && SERVICE_LABELS[serviceType];
  const { data: configs = [], isLoading: configsLoading } = useMarkupConfigs();
  const summary = useMemo(
    () => configs.find((c) => c.service_type === serviceType),
    [configs, serviceType],
  );
  const { data: config, isLoading: configLoading } = useMarkupConfig(summary?.id);
  const createMut = useCreateMarkupConfig();

  const { data: marketClusters = [] } = useMarketClusters();
  const { data: seasons = [] } = useSeasons();
  const { data: apiClients = [] } = useApiClients();

  const [drawer, setDrawer] = useState<EntityDrawerKind | null>(null);

  if (!isValidService) {
    return (
      <div className="flex-1 p-6">
        <p className="text-sm text-muted-foreground">Unknown service type.</p>
      </div>
    );
  }

  const label = SERVICE_LABELS[serviceType as Exclude<ServiceType, "bundle">];

  if (configsLoading) {
    return <DetailSkeleton />;
  }

  if (!summary) {
    return (
      <div className="flex-1 p-6 max-w-3xl">
        <Link
          href="/rates/markup"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Markup
        </Link>
        <h1 className="text-2xl font-semibold mb-2">{label}</h1>
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            No markup configured for {label} yet.
          </p>
          <Button
            onClick={() =>
              createMut.mutate({
                service_type: serviceType,
                base_markup: emptyMarkupValue(),
              })
            }
            loading={createMut.isPending}
          >
            <Plus className="h-4 w-4" /> Set up markup
          </Button>
        </div>
      </div>
    );
  }

  if (configLoading || !config) {
    return <DetailSkeleton />;
  }

  const tierRows: ModifierRowDef[] = AGENT_TIERS.map((t) => ({
    key: t,
    label: TIER_LABELS[t],
  }));
  const marketRows: ModifierRowDef[] = marketClusters.map((c) => ({
    key: c.id,
    label: c.name,
  }));
  const seasonRows: ModifierRowDef[] = seasons.map((s) => ({
    key: s.id,
    label: s.name,
  }));
  const apiRows: ModifierRowDef[] = apiClients.map((c) => ({
    key: c.id,
    label: c.name,
  }));

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto">
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <header className="flex flex-col gap-1">
          <Link
            href="/rates/markup"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
          >
            <ChevronLeft className="h-4 w-4" /> Markup
          </Link>
          <h1 className="text-2xl font-semibold">{label}</h1>
        </header>

        <BaseMarkupSection configId={config.id} initial={config.base_markup} />

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Modifiers
          </h2>
          <ModifierTable
            configId={config.id}
            modifierType="tier"
            rows={tierRows}
            saved={config.modifiers}
          />
          <ModifierTable
            configId={config.id}
            modifierType="market"
            rows={marketRows}
            saved={config.modifiers}
            onOpenDrawer={() => setDrawer("market")}
          />
          <ModifierTable
            configId={config.id}
            modifierType="season"
            rows={seasonRows}
            saved={config.modifiers}
            onOpenDrawer={() => setDrawer("season")}
          />
          <ModifierTable
            configId={config.id}
            modifierType="api_client"
            rows={apiRows}
            saved={config.modifiers}
            onOpenDrawer={() => setDrawer("api_client")}
          />
        </div>

        <RowOverridesSection configId={config.id} overrides={config.overrides} />

        <BoundsEditor configId={config.id} initial={config.bounds} />
      </div>

      <aside className="lg:w-[360px] xl:w-[400px] shrink-0">
        <LiveCalculatorPanel serviceType={serviceType} />
      </aside>

      <EntityDrawer kind={drawer} onOpenChange={(o) => !o && setDrawer(null)} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex-1 p-4 flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32" />
      <Skeleton className="h-48" />
      <Skeleton className="h-48" />
    </div>
  );
}
