"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import SupplierTab from "./accounts/supplier-tab";
import AgentTab from "./accounts/agent-tab";

type Props = {
  queryId: string;
};

export default function AccountsSection({ queryId }: Props) {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="agent" className="flex-1 flex flex-col">
        <div className="border-b bg-background/50 px-3 py-2">
          <TabsList className="bg-transparent p-0 gap-2">
            <TabsTrigger
              value="agent"
              className={cn(
                "h-9 rounded-md px-3 py-1.5",
                "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                "text-muted-foreground hover:text-foreground hover:bg-muted font-normal"
              )}
            >
              <Users className="h-4 w-4" />
              Travel Agent
            </TabsTrigger>
            <TabsTrigger
              value="supplier"
              className={cn(
                "h-9 rounded-md px-3 py-1.5",
                "data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none",
                "text-muted-foreground hover:text-foreground hover:bg-muted font-normal"
              )}
            >
              <Handshake className="h-4 w-4" />
              Supplier
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="supplier" className="flex-1 mt-0 overflow-y-auto">
          <SupplierTab queryId={queryId} />
        </TabsContent>

        <TabsContent value="agent" className="flex-1 mt-0 overflow-y-auto">
          <AgentTab queryId={queryId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
