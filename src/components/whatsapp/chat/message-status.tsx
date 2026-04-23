import { memo } from "react";
import { Clock, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageStatusProps {
  isPending: boolean;
  ack: string | null;
  isOutgoing: boolean;
}

export const MessageStatus = memo(function MessageStatus({ isPending, ack, isOutgoing }: MessageStatusProps) {
  if (!isOutgoing) return null;
  const base = "h-3.5 w-3.5 shrink-0";
  if (isPending || ack === null) return <Clock className={cn(base, "opacity-50")} />;
  if (ack === "4") return <CheckCheck className={cn(base, "text-sky-300")} />;
  if (ack === "2" || ack === "3") return <CheckCheck className={cn(base, "opacity-60")} />;
  return <Check className={cn(base, "opacity-60")} />;
});
