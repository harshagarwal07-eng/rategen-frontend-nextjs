"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FDCountryPicker } from "./fd-country-picker";
import { FDMonthPicker } from "./fd-month-picker";
import { cn } from "@/lib/utils";

interface FDSearchBarProps {
  initialCountries?: string[];
  initialMonths?: string[];
  variant?: "landing" | "compact";
  className?: string;
}

export function FDSearchBar({
  initialCountries = [],
  initialMonths = [],
  variant = "landing",
  className,
}: FDSearchBarProps) {
  const router = useRouter();
  const [countries, setCountries] = useState<string[]>(initialCountries);
  const [months, setMonths] = useState<string[]>(initialMonths);

  const canSearch = countries.length > 0 || months.length > 0;

  const handleSearch = () => {
    if (!canSearch) return;
    const params = new URLSearchParams();
    if (countries.length > 0) params.set("countries", countries.join(","));
    if (months.length > 0) params.set("months", months.join(","));
    router.push(`/api-services/fixed-departures/search/results?${params.toString()}`);
  };

  return (
    <div
      className={cn(
        "flex items-stretch gap-1 bg-card border border-border/60 rounded-full shadow-sm p-1",
        variant === "compact" && "shadow-none rounded-xl",
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <FDCountryPicker selected={countries} onChange={setCountries} />
      </div>
      <div className="w-px bg-border/60 self-stretch my-1.5" />
      <div className="flex-1 min-w-0">
        <FDMonthPicker selected={months} onChange={setMonths} />
      </div>
      <Button
        size="sm"
        className={cn(
          "px-5 self-stretch h-auto rounded-full",
          variant === "compact" && "rounded-md",
        )}
        onClick={handleSearch}
        disabled={!canSearch}
      >
        <Search className="size-4" />
        Search
      </Button>
    </div>
  );
}
