import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, XCircle, FileCheck, Ban, AlertCircle } from "lucide-react";

export type StatusType =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed"
  | "vouchered"
  | "void"
  | "cancellation-pending";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusConfig: Record<
  StatusType,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: React.ReactNode;
    colorClass: string;
  }
> = {
  confirmed: {
    label: "Confirmed",
    variant: "outline",
    icon: <CheckCircle className="h-3 w-3" />,
    colorClass: "text-green-600 border-green-600",
  },
  pending: {
    label: "Pending",
    variant: "outline",
    icon: <Clock className="h-3 w-3" />,
    colorClass: "text-yellow-600 border-yellow-600",
  },
  cancelled: {
    label: "Cancelled",
    variant: "outline",
    icon: <XCircle className="h-3 w-3" />,
    colorClass: "text-destructive border-destructive",
  },
  completed: {
    label: "Completed",
    variant: "outline",
    icon: <CheckCircle className="h-3 w-3" />,
    colorClass: "text-blue-600 border-blue-600",
  },
  vouchered: {
    label: "Vouchered",
    variant: "outline",
    icon: <FileCheck className="h-3 w-3" />,
    colorClass: "text-blue-600 border-blue-600",
  },
  void: {
    label: "Void",
    variant: "outline",
    icon: <Ban className="h-3 w-3" />,
    colorClass: "text-muted-foreground border-muted-foreground",
  },
  "cancellation-pending": {
    label: "Cancellation Pending",
    variant: "outline",
    icon: <AlertCircle className="h-3 w-3" />,
    colorClass: "text-orange-600 border-orange-600",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "flex items-center gap-1 w-fit",
        config.colorClass,
        className
      )}
    >
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}
