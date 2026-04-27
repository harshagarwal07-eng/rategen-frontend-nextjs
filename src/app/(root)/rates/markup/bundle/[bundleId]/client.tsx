"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BaseMarkupSection } from "@/components/markup/base-markup-section";
import { BoundsEditor } from "@/components/markup/bounds-editor";
import { EditBundleModal } from "@/components/markup/edit-bundle-modal";
import {
  EntityDrawer,
  type EntityDrawerKind,
} from "@/components/markup/entity-drawer";
import { LiveCalculatorPanel } from "@/components/markup/live-calculator-panel";
import { ModifierTable, type ModifierRowDef } from "@/components/markup/modifier-table";
import { useApiClients } from "@/hooks/markup/use-api-clients";
import { useMarketClusters } from "@/hooks/markup/use-market-clusters";
import { useMarkupBundle } from "@/hooks/markup/use-markup-bundles";
import { useMarkupConfig } from "@/hooks/markup/use-markup-configs";
import { useSeasons } from "@/hooks/markup/use-seasons";
import {
  AGENT_TIERS,
  SERVICE_LABELS,
  type ServiceType,
  TIER_LABELS,
} from "@/types/markup";

type Props = { bundleId: string };

export default function BundleMarkupDetailClient({ bundleId }: Props) {
  const { data: bundle, isLoading: bundleLoading } = useMarkupBundle(bundleId);
  const configId = bundle?.bundle_config?.id;
  const { data: config, isLoading: configLoading } = useMarkupConfig(configId);

  const { data: marketClusters = [] } = useMarketClusters();
  const { data: seasons = [] } = useSeasons();
  const { data: apiClients = [] } = useApiClients();

  const [drawer, setDrawer] = useState<EntityDrawerKind | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  if (bundleLoading || !bundle) return <DetailSkeleton />;
  if (configLoading || !config) return <DetailSkeleton />;

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
        <header className="flex flex-col gap-2">
          <Link
            href="/rates/markup"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
          >
            <ChevronLeft className="h-4 w-4" /> Markup
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold">{bundle.name}</h1>
              <div className="flex flex-wrap gap-1.5">
                {bundle.service_types.map((st) => (
                  <Badge key={st} variant="outline" className="text-xs">
                    {SERVICE_LABELS[st as Exclude<ServiceType, "bundle">] ?? st}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4" /> Edit bundle
            </Button>
          </div>
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

        <BoundsEditor configId={config.id} initial={config.bounds} />
      </div>

      <aside className="lg:w-[360px] xl:w-[400px] shrink-0">
        <LiveCalculatorPanel
          serviceType="bundle"
          bundleServiceTypes={bundle.service_types}
        />
      </aside>

      <EntityDrawer kind={drawer} onOpenChange={(o) => !o && setDrawer(null)} />
      <EditBundleModal bundle={bundle} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex-1 p-4 flex flex-col gap-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-32" />
      <Skeleton className="h-48" />
    </div>
  );
}
