"use client";

import { Card } from "@/components/ui/card";
import { Clock, MapPin } from "lucide-react";

export interface ItineraryActivity {
  time: string;
  title: string;
  description: string;
  location?: string;
  duration?: string;
}

export interface ItineraryDayData {
  day: number;
  title: string;
  activities: ItineraryActivity[];
}

interface ItineraryDayCardProps {
  data: ItineraryDayData;
}

export default function ItineraryDayCard({ data }: ItineraryDayCardProps) {
  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      {/* Day Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold">
          {data.day}
        </div>
        <div>
          <h3 className="font-semibold text-lg">Day {data.day}</h3>
          <p className="text-sm text-muted-foreground">{data.title}</p>
        </div>
      </div>

      {/* Activities Timeline */}
      <div className="space-y-4">
        {data.activities.map((activity, index) => (
          <div key={index} className="flex gap-3 group">
            {/* Time Badge */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                <Clock className="w-3 h-3" />
                {activity.time}
              </div>
            </div>

            {/* Activity Content */}
            <div className="flex-1 pb-4 border-l-2 border-muted pl-4 group-last:border-l-0">
              <h4 className="font-medium text-sm mb-1">{activity.title}</h4>
              <p className="text-xs text-muted-foreground mb-2">
                {activity.description}
              </p>

              {/* Activity Details */}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                {activity.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{activity.location}</span>
                  </div>
                )}
                {activity.duration && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{activity.duration}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
