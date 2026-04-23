"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useUIStore } from "@/lib/stores/ui-store";
import { Clock, MapPin, DollarSign } from "lucide-react";

interface DraggableActivityCardProps {
  activity: any;
  day: number;
  chatId: string;
}

export default function DraggableActivityCard({
  activity,
  day,
  chatId,
}: DraggableActivityCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.activity_id });

  const { setSelectedActivity, startDrag, endDrag } = useUIStore();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing"
      onMouseDown={() => {
        startDrag(activity.activity_id, day);
        setSelectedActivity(activity.activity_id);
      }}
      onMouseUp={() => {
        endDrag();
      }}
    >
      <div className="rounded-lg border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-start gap-4">
          {/* Icon/Image */}
          <div className="flex-shrink-0">
            {activity.image ? (
              <img
                src={activity.image}
                alt={activity.title}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted">
                <span className="text-2xl">{getActivityIcon(activity.package_type)}</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            {/* Badges */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {activity.package_type || "Activity"}
              </span>
              {activity.status && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {activity.status}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="truncate font-semibold">{activity.title}</h3>

            {/* Details */}
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              {activity.time && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{activity.time}</span>
                </div>
              )}
              {activity.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{activity.location}</span>
                </div>
              )}
            </div>

            {/* Pricing */}
            {activity.pricing?.total && (
              <div className="mt-2 flex items-center gap-1 text-sm font-medium text-green-600">
                <DollarSign className="h-3 w-3" />
                <span>{activity.pricing.total}</span>
                {activity.pricing.per_person && (
                  <span className="text-xs text-muted-foreground">
                    /person
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex-shrink-0">
            <button
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              title="More options"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getActivityIcon(type: string): string {
  const icons: Record<string, string> = {
    hotel: "🏨",
    tour: "🎫",
    transfer: "🚗",
    combo: "📦",
    meal: "🍽️",
    free: "🆓",
    activity: "🎯",
  };
  return icons[type] || "📍";
}
