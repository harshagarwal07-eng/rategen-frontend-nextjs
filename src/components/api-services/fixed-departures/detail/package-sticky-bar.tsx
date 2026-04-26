"use client";

import { useEffect, useState, type RefObject } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { IoLogoWhatsapp } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FDPublicDeparture, FDPublicPackage } from "@/types/fd-search";
import { BookDepartureModal } from "../booking/book-departure-modal";

interface PackageStickyBarProps {
  pkg: FDPublicPackage;
  selectedDeparture: FDPublicDeparture | null;
  bannerRef: RefObject<HTMLDivElement | null>;
}

export function PackageStickyBar({ pkg, selectedDeparture, bannerRef }: PackageStickyBarProps) {
  const [visible, setVisible] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const node = bannerRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "0px 0px -100% 0px" },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [bannerRef]);

  const thumb = pkg.main_image_url || pkg.banner_image_url;
  const countriesText = pkg.countries.map((c) => c.name).join(" · ");

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-30 transition-all duration-200 -mx-4 px-4 bg-background/95 backdrop-blur-md border-b border-border/60",
          visible
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "-translate-y-full opacity-0 pointer-events-none",
        )}
        style={{ height: visible ? 56 : 0 }}
      >
        <div className="h-14 flex items-center gap-3">
          <div className="relative w-16 h-10 rounded-md overflow-hidden bg-muted shrink-0">
            {thumb ? (
              <Image src={thumb} alt={pkg.name} fill sizes="64px" className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <ImageIcon className="size-4" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">{pkg.name}</div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="px-1.5 py-0 h-4 text-[10px] font-normal">
                {pkg.duration_nights}N
              </Badge>
              {countriesText && <span className="truncate">{countriesText}</span>}
            </div>
          </div>
          <Button
            size="sm"
            disabled={!selectedDeparture}
            onClick={() => setModalOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium shrink-0"
          >
            <IoLogoWhatsapp className="size-3.5" />
            Book This Departure
          </Button>
        </div>
      </div>

      {selectedDeparture && (
        <BookDepartureModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          packageName={pkg.name}
          tourCode={pkg.tour_code}
          departureDate={selectedDeparture.departure_date}
          agePolicies={pkg.fd_age_policies}
        />
      )}
    </>
  );
}
