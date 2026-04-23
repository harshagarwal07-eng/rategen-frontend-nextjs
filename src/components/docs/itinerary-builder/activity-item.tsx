"use client";

import { useState } from "react";
import { Building2, Car, LucideFerrisWheel, UtensilsCrossed, Plane, Package, GripVertical, Trash2, Clock, MapPin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import S3Image from "@/components/ui/s3-image";
import { cn } from "@/lib/utils";
import { type EditableActivity, type ServiceType } from "./types";

interface ActivityItemProps {
  activity: EditableActivity;
  activityIndex: number;
  onUpdate: (updates: Partial<EditableActivity>) => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, any>;
  isDragging?: boolean;
}

const SERVICE_ICONS: Record<ServiceType, React.ElementType> = {
  hotel: Building2,
  tour: LucideFerrisWheel,
  transfer: Car,
  meal: UtensilsCrossed,
  flight: Plane,
  combo: Package,
};

const SERVICE_STYLES: Record<ServiceType, string> = {
  hotel: "bg-primary/10 text-primary",
  tour: "bg-accent text-accent-foreground",
  transfer: "bg-warning/10 text-warning",
  meal: "bg-secondary text-secondary-foreground",
  flight: "bg-info/10 text-info",
  combo: "bg-muted text-muted-foreground",
};

export default function ActivityItem({ activity, activityIndex, onUpdate, onDelete, dragHandleProps, isDragging }: ActivityItemProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const Icon = SERVICE_ICONS[activity.type] || Package;
  const styleClass = SERVICE_STYLES[activity.type] || SERVICE_STYLES.combo;

  // Filter out UUID-like strings from location
  const cleanLocation = activity.location && !/[0-9a-f]{8}-[0-9a-f]{4}/.test(activity.location)
    ? activity.location
    : undefined;

  return (
    <>
      <div className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border bg-card hover:shadow-xs transition-shadow",
        isDragging && "opacity-50"
      )}>
        {/* Drag Handle */}
        <div
          className="shrink-0 cursor-grab opacity-0 group-hover:opacity-40 transition-opacity"
          {...dragHandleProps}
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Icon */}
        <div className={cn("shrink-0 h-8 w-8 rounded-md flex items-center justify-center", styleClass)}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Image */}
        {activity.image_url && (
          <div className="shrink-0 w-12 h-12 rounded-md overflow-hidden bg-muted">
            <S3Image url={activity.image_url} alt={activity.name} className="w-full h-full object-cover" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{activity.name}</span>
            {activity.rating && (
              <span className="flex items-center gap-0.5 text-xs text-warning">
                <Star className="h-3 w-3 fill-current" />
                {activity.rating}
              </span>
            )}
          </div>
          {activity.subtitle && (
            <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" className={cn("h-5 text-[10px] px-1.5 capitalize", styleClass)}>
              {activity.type}
            </Badge>
            {activity.room_type && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{activity.room_type}</Badge>
            )}
            {activity.meal_plan && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{activity.meal_plan}</Badge>
            )}
            {activity.transfer_type && (
              <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{activity.transfer_type}</Badge>
            )}
            {activity.duration && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Clock className="h-2.5 w-2.5" />
                {activity.duration}
              </span>
            )}
            {cleanLocation && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <MapPin className="h-2.5 w-2.5" />
                {cleanLocation}
              </span>
            )}
          </div>
        </div>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Activity</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{activity.name}&quot; from this day?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
