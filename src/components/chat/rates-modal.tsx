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
import Show from "../ui/show";
import HotelsRates from "./hotels-rates";
import TransfersRates from "./transfers-rates";
import ToursRates from "./tours-rates";
import FinalRates from "./final-rates";
import { Option } from "@/types/data-table";
import {
  CircleDollarSignIcon,
  HotelIcon,
  PlaneIcon,
  RouteIcon,
  WandSparkles,
} from "lucide-react";
import { ChatWithVersions } from "@/types/chat";
import useUser from "@/hooks/use-user";

interface RatesModalProps {
  version: number;
  chat: ChatWithVersions;
  children?: React.ReactNode;
  onGenerateQuote?: () => void;
}

export const RatesModal: React.FC<RatesModalProps> = ({
  version,
  chat,
  children,
  onGenerateQuote,
}) => {
  useUser();
  const [open, setOpen] = useState(false);
  const [tabs, setTabs] = useState<Option[]>([]);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);

  // Handle quote generation
  const handleGenerateQuote = async () => {
    if (isGeneratingQuote) return;

    setIsGeneratingQuote(true);

    try {
      // Dispatch a global event that chat/message.tsx listens to
      window.dispatchEvent(
        new CustomEvent("chat:send", {
          detail: { text: "[MODE: QUOTE] Kindly generate quote" },
        })
      );

      // Close the modal and call the callback if provided
      setOpen(false);
      onGenerateQuote?.();
    } catch (error) {
      console.error("Failed to generate quote:", error);
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  useEffect(() => {
    const tabs = Array.from(
      { length: chat.total_rate_versions ?? 0 },
      (_, index) => ({
        value: index.toString(),
        label: `Rate ${index + 1}`,
      })
    );

    setTabs(tabs);
  }, [chat.total_rate_versions]);

  const types = [
    {
      label: "Hotels",
      value: "hotels",
      icon: HotelIcon,
    },
    {
      label: "Tours",
      value: "tours",
      icon: RouteIcon,
    },
    {
      label: "Transfers",
      value: "transfers",
      icon: PlaneIcon,
    },
    {
      label: "Final",
      value: "final",
      icon: CircleDollarSignIcon,
    },
  ];

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
            Rates
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[90vw] h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Rates Sheet</DialogTitle>
          <DialogDescription className="sr-only">
            Rate information and details for version {version}
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
              <TabsContent
                key={tab.value}
                value={tab.value}
                className="rounded-2xl border bg-primary/10 space-y-4 mb-20"
              >
                <Tabs defaultValue="hotels" className="h-full gap-0">
                  <TabsList className="h-10 border-b rounded-none w-full p-0 grid grid-cols-12 px-4 rounded-t-2xl">
                    {types.map((type) => (
                      <TabsTrigger
                        key={type.value}
                        value={type.value}
                        className="h-full border-transparent data-[state=active]:shadow-none data-[state=active]:border-b-[3px] data-[state=active]:border-b-primary rounded-none"
                      >
                        <type.icon className="w-4 h-4" />
                        {type.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  {types.map((type) => (
                    <TabsContent
                      key={type.value}
                      value={type.value}
                      className="flex flex-col"
                    >
                      <Show when={type.value === "hotels"}>
                        <HotelsRates
                          version={Number(tab.value + 1)}
                          chatId={chat.id}
                        />
                      </Show>
                      <Show when={type.value === "tours"}>
                        <ToursRates
                          version={Number(tab.value + 1)}
                          chatId={chat.id}
                        />
                      </Show>
                      <Show when={type.value === "transfers"}>
                        <TransfersRates
                          version={Number(tab.value + 1)}
                          chatId={chat.id}
                        />
                      </Show>
                      <Show when={type.value === "final"}>
                        <FinalRates
                          version={Number(tab.value + 1)}
                          chatId={chat.id}
                        />
                      </Show>
                    </TabsContent>
                  ))}
                </Tabs>

                <div className="text-center">
                  <Button
                    size="xxl"
                    variant="ai"
                    className="ring-4 ring-primary/20"
                    onClick={handleGenerateQuote}
                    disabled={isGeneratingQuote}
                    loading={isGeneratingQuote}
                    loadingText="Generating..."
                  >
                    <WandSparkles />
                    Generate Quote
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Show>
      </DialogContent>
    </Dialog>
  );
};
