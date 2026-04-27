"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiClientsTab } from "./api-clients-tab";
import { MarketClustersTab } from "./market-clusters-tab";
import { SeasonsTab } from "./seasons-tab";

export type EntityDrawerKind = "market" | "season" | "api_client";

const TITLES: Record<EntityDrawerKind, { title: string; desc: string }> = {
  market: {
    title: "Market clusters",
    desc: "Manage country groupings used by market modifiers.",
  },
  season: {
    title: "Seasons",
    desc: "Manage date ranges used by season modifiers.",
  },
  api_client: {
    title: "API clients",
    desc: "Manage API consumers used by api_client modifiers.",
  },
};

type Props = {
  kind: EntityDrawerKind | null;
  onOpenChange: (open: boolean) => void;
};

export function EntityDrawer({ kind, onOpenChange }: Props) {
  return (
    <Sheet open={!!kind} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        {kind && (
          <>
            <SheetHeader>
              <SheetTitle>{TITLES[kind].title}</SheetTitle>
              <SheetDescription>{TITLES[kind].desc}</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">
              {kind === "market" && <MarketClustersTab />}
              {kind === "season" && <SeasonsTab />}
              {kind === "api_client" && <ApiClientsTab />}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
