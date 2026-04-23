"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { ChatWithVersions } from "@/types/chat";
import Show from "@/components/ui/show";
import QuoteContent from "./quote-content";
import { ScrollTextIcon } from "lucide-react";

type Option = {
  value: string;
  label: string;
};

type Props = {
  chat: ChatWithVersions;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const QuotesModal = ({
  chat,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Props) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [tabs, setTabs] = useState<Option[]>([]);

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  useEffect(() => {
    const tabs = Array.from(
      { length: chat.total_quote_versions ?? 0 },
      (_, index) => ({
        value: index.toString(),
        label: `Quote ${index + 1}`,
      })
    );

    setTabs(tabs);
  }, [chat.total_quote_versions]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : (
          <Button
            variant="link"
            size="sm"
            className="mx-1 inline-flex p-0 underline cursor-pointer"
          >
            Quote
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Quotes</DialogTitle>
          <DialogDescription className="sr-only">
            Quote information and details for all versions
          </DialogDescription>
        </DialogHeader>

        <Show when={!!tabs?.length}>
          <Tabs defaultValue={tabs[0]?.value} className="gap-4 flex-1">
            <TabsList className="border w-full h-12 grid grid-cols-12 p-0 px-4">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="h-full data-[state=active]:shadow-none rounded-none border-b-4 border-transparent data-[state=active]:border-b-primary font-bold"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab.value} value={tab.value}>
                <QuoteContent
                  version={Number(tab.value) + 1}
                  chatId={chat.id}
                />
              </TabsContent>
            ))}
          </Tabs>
        </Show>

        <Show when={!tabs?.length}>
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <ScrollTextIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No quotes available</p>
              <p className="text-sm text-muted-foreground">
                Generate a quote to see it here.
              </p>
            </div>
          </div>
        </Show>
      </DialogContent>
    </Dialog>
  );
};
