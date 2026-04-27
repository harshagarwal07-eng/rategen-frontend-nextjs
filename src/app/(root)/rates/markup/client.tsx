"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarkupBundles } from "@/hooks/markup/use-markup-bundles";
import { useMarkupConfigs } from "@/hooks/markup/use-markup-configs";
import { MarkupBundleCard } from "@/components/markup/markup-bundle-card";
import { MarkupServiceCard } from "@/components/markup/markup-service-card";
import { NewBundleModal } from "@/components/markup/new-bundle-modal";
import { SERVICE_TYPES, type ServiceType } from "@/types/markup";

export default function MarkupOverviewClient() {
  const { data: configs = [], isLoading: configsLoading } = useMarkupConfigs();
  const { data: bundles = [], isLoading: bundlesLoading } = useMarkupBundles();
  const [newBundleOpen, setNewBundleOpen] = useState(false);

  const configByService = useMemo(() => {
    const m = new Map<ServiceType, (typeof configs)[number]>();
    configs.forEach((c) => {
      if (c.service_type !== "bundle") m.set(c.service_type, c);
    });
    return m;
  }, [configs]);

  return (
    <div className="flex-1 flex flex-col gap-6 p-4 overflow-y-auto">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Markup Engine</h1>
          <p className="text-sm text-muted-foreground">
            Configure markups for all your services and bundles
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/rates/markup/settings">
            <SettingsIcon className="h-4 w-4" /> Settings
          </Link>
        </Button>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Services</h2>
        {configsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICE_TYPES.map((st) => (
              <Skeleton key={st} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICE_TYPES.map((st) => (
              <MarkupServiceCard
                key={st}
                serviceType={st}
                config={configByService.get(st) ?? null}
              />
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Bundles</h2>
          <Button size="sm" onClick={() => setNewBundleOpen(true)}>
            <Plus className="h-4 w-4" /> New bundle
          </Button>
        </div>

        {bundlesLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </div>
        ) : bundles.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No bundles yet. Bundles let you set markup for multi-service bookings (e.g., hotel + tour + transfer combinations).
            </p>
            <Button className="mt-4" size="sm" onClick={() => setNewBundleOpen(true)}>
              <Plus className="h-4 w-4" /> Create your first bundle
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {bundles.map((b) => (
              <MarkupBundleCard key={b.id} bundle={b} />
            ))}
          </div>
        )}
      </section>

      <NewBundleModal open={newBundleOpen} onOpenChange={setNewBundleOpen} />
    </div>
  );
}
