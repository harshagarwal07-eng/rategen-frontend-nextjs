"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiClientsTab } from "@/components/markup/api-clients-tab";
import { MarketClustersTab } from "@/components/markup/market-clusters-tab";
import { SeasonsTab } from "@/components/markup/seasons-tab";

export default function MarkupSettingsClient() {
  return (
    <div className="flex-1 p-4 flex flex-col gap-4 max-w-5xl">
      <header className="flex flex-col gap-1">
        <Link
          href="/rates/markup"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ChevronLeft className="h-4 w-4" /> Markup
        </Link>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage market clusters, seasons, and API clients used by markup modifiers.
        </p>
      </header>

      <Tabs defaultValue="markets" className="w-full">
        <TabsList>
          <TabsTrigger value="markets">Markets</TabsTrigger>
          <TabsTrigger value="seasons">Seasons</TabsTrigger>
          <TabsTrigger value="api-clients">API Clients</TabsTrigger>
        </TabsList>
        <TabsContent value="markets" className="pt-4">
          <MarketClustersTab />
        </TabsContent>
        <TabsContent value="seasons" className="pt-4">
          <SeasonsTab />
        </TabsContent>
        <TabsContent value="api-clients" className="pt-4">
          <ApiClientsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
