"use client";

import { toast } from "sonner";
import { IoLogoWhatsapp } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

interface BookViaWhatsAppButtonProps {
  packageName: string;
  tourCode: string | null;
  departureDate: string;
  className?: string;
  disabled?: boolean;
}

function formatDateForMessage(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function BookViaWhatsAppButton({
  packageName,
  tourCode,
  departureDate,
  className,
  disabled,
}: BookViaWhatsAppButtonProps) {
  const number = env.WHATSAPP_NUMBER;

  const handleClick = () => {
    if (!number) {
      toast.error("WhatsApp not configured. Contact admin.");
      return;
    }
    const codeSegment = tourCode ? ` (${tourCode})` : "";
    const message = `Hi, I'm interested in booking ${packageName}${codeSegment} departing on ${formatDateForMessage(departureDate)}. Could you share more details?`;
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "w-full bg-success text-success-foreground hover:bg-success/90 font-medium",
        className,
      )}
    >
      <IoLogoWhatsapp className="size-4" />
      Book This Departure
    </Button>
  );
}
