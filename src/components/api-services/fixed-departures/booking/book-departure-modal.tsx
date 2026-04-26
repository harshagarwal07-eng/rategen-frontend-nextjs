"use client";

import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { IoLogoWhatsapp } from "react-icons/io5";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import type { FDPublicAgePolicy } from "@/types/fd-search";

interface BookDepartureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageName: string;
  tourCode: string | null;
  departureDate: string;
  agePolicies: FDPublicAgePolicy[];
}

interface AgeBand {
  bandKey: "adult" | "teenager" | "child" | "infant";
  label: string;
  minAge: number;
  maxAge: number;
  collectAges: boolean;
}

const DEFAULT_BANDS: AgeBand[] = [
  { bandKey: "adult", label: "Adults", minAge: 12, maxAge: 99, collectAges: false },
  { bandKey: "child", label: "Children", minAge: 2, maxAge: 11, collectAges: true },
  { bandKey: "infant", label: "Infants", minAge: 0, maxAge: 1, collectAges: true },
];

const MAX_PER_BAND: Record<AgeBand["bandKey"], number> = {
  adult: 20,
  teenager: 15,
  child: 10,
  infant: 5,
};

const MIN_PER_BAND: Record<AgeBand["bandKey"], number> = {
  adult: 1,
  teenager: 0,
  child: 0,
  infant: 0,
};

const DEFAULT_PER_BAND: Record<AgeBand["bandKey"], number> = {
  adult: 2,
  teenager: 0,
  child: 0,
  infant: 0,
};

function buildBands(agePolicies: FDPublicAgePolicy[]): AgeBand[] {
  if (!agePolicies || agePolicies.length === 0) return DEFAULT_BANDS;
  const ordered = [...agePolicies].sort((a, b) => a.band_order - b.band_order);
  const bands: AgeBand[] = [];
  for (const p of ordered) {
    const name = (p.band_name || "").toLowerCase();
    let bandKey: AgeBand["bandKey"];
    let collectAges = true;
    if (name.includes("infant")) bandKey = "infant";
    else if (name.includes("teen")) bandKey = "teenager";
    else if (name.includes("child")) bandKey = "child";
    else {
      bandKey = "adult";
      collectAges = false;
    }
    bands.push({
      bandKey,
      label:
        bandKey === "adult"
          ? "Adults"
          : bandKey === "teenager"
            ? "Teens"
            : bandKey === "child"
              ? "Children"
              : "Infants",
      minAge: p.age_from ?? 0,
      maxAge: p.age_to ?? 99,
      collectAges,
    });
  }
  if (!bands.some((b) => b.bandKey === "adult")) {
    bands.unshift({
      bandKey: "adult",
      label: "Adults",
      minAge: 12,
      maxAge: 99,
      collectAges: false,
    });
  }
  return bands;
}

function formatDateForMessage(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BookDepartureModal({ open, ...rest }: BookDepartureModalProps) {
  // Remount the body on each open so pax/age state resets cleanly without an effect.
  return (
    <Dialog open={open} onOpenChange={rest.onOpenChange}>
      {open && <BookDepartureModalBody {...rest} />}
    </Dialog>
  );
}

function BookDepartureModalBody({
  onOpenChange,
  packageName,
  tourCode,
  departureDate,
  agePolicies,
}: Omit<BookDepartureModalProps, "open">) {
  const bands = useMemo(() => buildBands(agePolicies), [agePolicies]);

  const [counts, setCounts] = useState<Record<AgeBand["bandKey"], number>>({
    adult: DEFAULT_PER_BAND.adult,
    teenager: DEFAULT_PER_BAND.teenager,
    child: DEFAULT_PER_BAND.child,
    infant: DEFAULT_PER_BAND.infant,
  });

  const [ages, setAges] = useState<Record<AgeBand["bandKey"], (number | "")[]>>({
    adult: [],
    teenager: [],
    child: [],
    infant: [],
  });

  const setCount = (band: AgeBand, next: number) => {
    const min = MIN_PER_BAND[band.bandKey];
    const max = MAX_PER_BAND[band.bandKey];
    const v = Math.max(min, Math.min(max, next));
    setCounts((prev) => ({ ...prev, [band.bandKey]: v }));
    setAges((prev) => {
      const arr = [...(prev[band.bandKey] || [])];
      if (v > arr.length) {
        while (arr.length < v) arr.push("");
      } else if (v < arr.length) {
        arr.length = v;
      }
      return { ...prev, [band.bandKey]: arr };
    });
  };

  const setAge = (band: AgeBand, idx: number, raw: string) => {
    setAges((prev) => {
      const arr = [...(prev[band.bandKey] || [])];
      if (raw === "") arr[idx] = "";
      else {
        const n = Number(raw);
        arr[idx] = Number.isFinite(n) ? n : "";
      }
      return { ...prev, [band.bandKey]: arr };
    });
  };

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (counts.adult < 1) errs.adult = "At least 1 adult required";
    for (const band of bands) {
      if (!band.collectAges) continue;
      const arr = ages[band.bandKey] || [];
      const expected = counts[band.bandKey];
      for (let i = 0; i < expected; i++) {
        const v = arr[i];
        if (v === "" || v == null) {
          errs[band.bandKey] = `Enter age for each ${band.label.toLowerCase()}`;
          break;
        }
        if (typeof v === "number" && (v < band.minAge || v > band.maxAge)) {
          errs[band.bandKey] = `${band.label} age must be ${band.minAge}–${band.maxAge}`;
          break;
        }
      }
    }
    return errs;
  }, [bands, counts, ages]);

  const isValid = Object.keys(errors).length === 0;

  const buildMessage = (): string => {
    const codeSegment = tourCode ? ` (${tourCode})` : "";
    const lines: string[] = [
      `Hi, I'm interested in booking ${packageName}${codeSegment} departing on ${formatDateForMessage(
        departureDate,
      )}.`,
      "",
      "Travelers:",
    ];
    for (const band of bands) {
      const n = counts[band.bandKey];
      if (n <= 0) continue;
      const labelSingular = band.label.replace(/s$/, "");
      const labelPlural = band.label;
      const head = `- ${n} ${n === 1 ? labelSingular : labelPlural}`;
      if (band.collectAges) {
        const list = (ages[band.bandKey] || []).filter((a) => a !== "").join(", ");
        lines.push(`${head}${list ? ` (ages: ${list})` : ""}`);
      } else {
        lines.push(head);
      }
    }
    lines.push("", "Could you share more details and confirm availability?");
    return lines.join("\n");
  };

  const handleSend = () => {
    const number = env.WHATSAPP_NUMBER;
    if (!number) {
      toast.error("WhatsApp not configured. Contact admin.");
      return;
    }
    if (!isValid) return;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank", "noopener,noreferrer");
    onOpenChange(false);
  };

  return (
    <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Book {packageName}</DialogTitle>
          <DialogDescription className="text-xs">
            Departure: {formatDateForMessage(departureDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <h4 className="text-sm font-semibold mb-3">How many travelers?</h4>
            <div className="space-y-4">
              {bands.map((band) => {
                const count = counts[band.bandKey];
                const min = MIN_PER_BAND[band.bandKey];
                const max = MAX_PER_BAND[band.bandKey];
                const err = errors[band.bandKey];
                return (
                  <div key={band.bandKey} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium">{band.label}</Label>
                        <span className="text-xs text-muted-foreground ml-1.5">
                          ({band.minAge}
                          {band.minAge === band.maxAge ? "" : `-${band.maxAge}`} years)
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-7"
                          disabled={count <= min}
                          onClick={() => setCount(band, count - 1)}
                        >
                          <Minus className="size-3.5" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium tabular-nums">
                          {count}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-7"
                          disabled={count >= max}
                          onClick={() => setCount(band, count + 1)}
                        >
                          <Plus className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    {band.collectAges && count > 0 && (
                      <div className="grid grid-cols-3 gap-2 pl-1">
                        {Array.from({ length: count }, (_, i) => (
                          <div key={i} className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">
                              {band.label.replace(/s$/, "")} {i + 1}
                            </Label>
                            <Input
                              type="number"
                              min={band.minAge}
                              max={band.maxAge}
                              value={ages[band.bandKey][i] ?? ""}
                              onChange={(e) => setAge(band, i, e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    {err && <p className="text-xs text-destructive">{err}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!isValid}
            className={cn("bg-success text-success-foreground hover:bg-success/90 font-medium")}
          >
            <IoLogoWhatsapp className="size-4" />
            Send via WhatsApp
          </Button>
        </DialogFooter>
    </DialogContent>
  );
}
