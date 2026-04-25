"use client";

import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { createMarket, listCountries } from "@/data-access/dmc-markets";
import { toast } from "sonner";

const MarketFormSchema = z.object({
  name: z.string().min(1, "Market name is required"),
  country_mode: z.enum(["specific", "all"]),
  country_ids: z.array(z.string()),
});

type MarketFormValues = z.infer<typeof MarketFormSchema>;

interface MarketCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (market: { id: string; name: string }) => void;
}

interface CountryOption {
  value: string;
  label: string;
}

function CountryMultiSelect({
  selected,
  onChange,
  placeholder,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const { data: countries = [] } = useQuery<CountryOption[]>({
    queryKey: ["master-countries"],
    queryFn: async () => {
      const result = await listCountries();
      return (result.data ?? []).map((c) => ({ value: c.id, label: c.name }));
    },
    staleTime: 30 * 60 * 1000,
  });

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = (id: string) => {
    if (selectedSet.has(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  const visibleLabels = useMemo(
    () =>
      selected
        .map((id) => countries.find((c) => c.value === id)?.label ?? id)
        .filter(Boolean),
    [selected, countries]
  );

  return (
    <div className="flex flex-col gap-2">
      {visibleLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleLabels.map((label, i) => (
            <Badge key={selected[i]} variant="secondary" className="gap-1 text-xs font-normal">
              {label}
              <button
                type="button"
                className="hover:text-destructive"
                onClick={() => toggle(selected[i])}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal h-10">
            <span className="text-muted-foreground text-sm">{placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries…" />
            <div className="flex items-center justify-between px-3 py-1.5 border-b">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onChange(countries.map((c) => c.value))}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onChange([])}
              >
                Clear all
              </button>
            </div>
            <CommandList>
              <CommandEmpty>No countries found.</CommandEmpty>
              <CommandGroup>
                {countries.map((country) => (
                  <CommandItem
                    key={country.value}
                    value={country.label}
                    onSelect={() => toggle(country.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedSet.has(country.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {country.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function MarketCreateModal({
  isOpen,
  onClose,
  onCreated,
}: MarketCreateModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<MarketFormValues>({
    resolver: zodResolver(MarketFormSchema),
    defaultValues: {
      name: "",
      country_mode: "specific",
      country_ids: [],
    },
  });

  const countryMode = form.watch("country_mode");

  const onSubmit = async (data: MarketFormValues) => {
    setIsSaving(true);
    try {
      const result = await createMarket({
        name: data.name,
        country_mode: data.country_mode,
        country_ids: data.country_ids,
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Market created");
      onCreated(result.data!);
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Market</DialogTitle>
          <DialogDescription>Define a market by name and country scope.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Market Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. South Asia" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country Mode</FormLabel>
                  <FormControl>
                    <div className="flex h-10 rounded-md border border-input overflow-hidden">
                      <button
                        type="button"
                        onClick={() => field.onChange("specific")}
                        className={`flex-1 text-sm font-medium transition-colors ${
                          field.value === "specific"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        Specific Countries
                      </button>
                      <button
                        type="button"
                        onClick={() => field.onChange("all")}
                        className={`flex-1 text-sm font-medium border-l border-input transition-colors ${
                          field.value === "all"
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-foreground hover:bg-muted"
                        }`}
                      >
                        All Markets
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {countryMode === "specific" ? "Countries" : "Exceptions"}
                  </FormLabel>
                  <FormControl>
                    <CountryMultiSelect
                      selected={field.value}
                      onChange={field.onChange}
                      placeholder={
                        countryMode === "specific"
                          ? "Pick countries to include…"
                          : "Pick countries to exclude…"
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Creating…" : "Create Market"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
